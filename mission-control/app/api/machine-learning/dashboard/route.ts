import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type {
  GenesFile,
  CapsulesFile,
  FailedCapsulesFile,
  CapabilityCandidate,
  EvolutionEvent,
  PersonalityFile,
  SolidifyState,
  MemoryGraphEvent,
  MLDashboard,
  FeedbackEntry,
  FeedbackStats,
  KnowledgeLesson,
  KnowledgeStats,
  PredictorStats,
  ErrorCluster,
} from "@/lib/ml-types";

import os from "os";
const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const SKILL_DIR = path.join(WS, "skills/capability-evolver");

const PATHS = {
  genes: path.join(SKILL_DIR, "assets/gep/genes.json"),
  capsules: path.join(SKILL_DIR, "assets/gep/capsules.json"),
  failedCapsules: path.join(SKILL_DIR, "assets/gep/failed_capsules.json"),
  candidates: path.join(SKILL_DIR, "assets/gep/candidates.jsonl"),
  events: path.join(SKILL_DIR, "assets/gep/events.jsonl"),
  personality: path.join(WS, "memory/evolution/personality_state.json"),
  solidify: path.join(WS, "memory/evolution/evolution_solidify_state.json"),
  memoryGraph: path.join(WS, "memory/evolution/memory_graph.jsonl"),
  packageJson: path.join(SKILL_DIR, "package.json"),
  env: path.join(WS, ".env"),
  // ML data files
  feedback: path.join(SKILL_DIR, "memory/feedback.jsonl"),
  knowledge: path.join(SKILL_DIR, "memory/knowledge.json"),
  predictor: path.join(SKILL_DIR, "memory/predictor.json"),
  clusters: path.join(SKILL_DIR, "memory/cluster-registry.json"),
  embeddingsCache: path.join(SKILL_DIR, "memory/embeddings-cache.json"),
};

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function readJsonl<T>(filePath: string, typeFilter?: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    const items = raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => { try { return JSON.parse(line); } catch { return null; } })
      .filter(Boolean) as T[];
    if (typeFilter) {
      return items.filter((item) => (item as Record<string, unknown>).type === typeFilter);
    }
    return items;
  } catch {
    return [];
  }
}

function getEnvValue(envContent: string, key: string, fallback: string): string {
  const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
  return match ? match[1].trim() : fallback;
}

function checkDaemon(): MLDashboard["daemon"] {
  const pidPaths = [
    path.join(SKILL_DIR, "evolver.pid"),
    path.join(WS, "memory/evolver_loop.pid"),
    path.join(SKILL_DIR, "daemon.pid"),
  ];
  let running = false;
  let pid: number | null = null;
  for (const pidPath of pidPaths) {
    try {
      const pidStr = require("fs").readFileSync(pidPath, "utf-8").trim();
      const p = parseInt(pidStr, 10);
      if (isNaN(p)) continue;
      try {
        process.kill(p, 0);
        running = true;
        pid = p;
        break;
      } catch {
        continue;
      }
    } catch {
      continue;
    }
  }

  let scheduled = false;
  try {
    const { execSync } = require("child_process");
    const out = execSync("launchctl list 2>/dev/null | grep ai.openclaw.evolver", {
      encoding: "utf-8",
      timeout: 3000,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    scheduled = out.length > 0;
  } catch {}

  let lastRunAt: string | null = null;
  try {
    const stateFile = path.join(WS, "memory/evolution/evolution_state.json");
    const state = JSON.parse(require("fs").readFileSync(stateFile, "utf-8"));
    if (state.lastRun) lastRunAt = new Date(state.lastRun).toISOString();
  } catch {
    try {
      const logFile = path.join(WS, "logs/evolver-daily.log");
      const stat = require("fs").statSync(logFile);
      lastRunAt = stat.mtime.toISOString();
    } catch {}
  }

  let nextRunAt: string | null = null;
  if (scheduled) {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    nextRunAt = next.toISOString();
  }

  return { running, pid, scheduled, lastRunAt, nextRunAt };
}

async function checkOllamaAvailable(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

function computeFeedbackStats(entries: FeedbackEntry[]): FeedbackStats {
  const byStatus = { pending: 0, proven: 0, failed: 0 };
  for (const e of entries) {
    if (e.status in byStatus) byStatus[e.status as keyof typeof byStatus]++;
  }
  return {
    total: entries.length,
    ...byStatus,
    success_rate: entries.length > 0
      ? byStatus.proven / Math.max(1, byStatus.proven + byStatus.failed)
      : 0,
  };
}

function computeKnowledgeStats(lessons: KnowledgeLesson[]): KnowledgeStats {
  if (lessons.length === 0) {
    return { total_lessons: 0, top_genes: [], avg_confidence: 0, improvement_trend: "none" };
  }

  const geneScores: Record<string, { total_conf: number; count: number; successes: number }> = {};
  for (const l of lessons) {
    if (!geneScores[l.gene_id]) geneScores[l.gene_id] = { total_conf: 0, count: 0, successes: 0 };
    geneScores[l.gene_id].total_conf += l.confidence;
    geneScores[l.gene_id].count++;
    geneScores[l.gene_id].successes += l.times_succeeded;
  }

  const topGenes = Object.entries(geneScores)
    .map(([id, s]) => ({
      gene_id: id,
      avg_confidence: s.total_conf / s.count,
      applications: s.count,
      successes: s.successes,
    }))
    .sort((a, b) => b.avg_confidence - a.avg_confidence)
    .slice(0, 5);

  const avgConf = lessons.reduce((s, l) => s + l.confidence, 0) / lessons.length;

  const sorted = [...lessons].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const mid = Math.floor(sorted.length / 2);
  const olderAvg = mid > 0 ? sorted.slice(0, mid).reduce((s, l) => s + l.confidence, 0) / mid : 0;
  const newerAvg = mid > 0 ? sorted.slice(mid).reduce((s, l) => s + l.confidence, 0) / (sorted.length - mid) : 0;
  const trend = newerAvg > olderAvg + 0.05 ? "improving" : newerAvg < olderAvg - 0.05 ? "declining" : "stable";

  return {
    total_lessons: lessons.length,
    top_genes: topGenes,
    avg_confidence: avgConf,
    improvement_trend: trend as KnowledgeStats["improvement_trend"],
  };
}

export async function GET() {
  const [
    genesFile,
    capsulesFile,
    failedCapsulesFile,
    candidates,
    events,
    personalityFile,
    solidifyState,
    memoryGraphEvents,
    feedbackEntries,
    knowledgeFile,
    predictorFile,
    clusterRegistry,
  ] = await Promise.all([
    readJson<GenesFile>(PATHS.genes, { version: 1, genes: [] }),
    readJson<CapsulesFile>(PATHS.capsules, { version: 1, capsules: [] }),
    readJson<FailedCapsulesFile>(PATHS.failedCapsules, { version: 1, failed_capsules: [] }),
    readJsonl<CapabilityCandidate>(PATHS.candidates),
    readJsonl<EvolutionEvent>(PATHS.events, "EvolutionEvent"),
    readJson<PersonalityFile | null>(PATHS.personality, null),
    readJson<SolidifyState | null>(PATHS.solidify, null),
    readJsonl<MemoryGraphEvent>(PATHS.memoryGraph),
    readJsonl<FeedbackEntry>(PATHS.feedback),
    readJson<{ lessons: KnowledgeLesson[] }>(PATHS.knowledge, { lessons: [] }),
    readJson<{ sample_count?: number; trained_at?: string | null; samples?: unknown[] }>(PATHS.predictor, {}),
    readJson<ErrorCluster[]>(PATHS.clusters, []),
  ]);

  let envContent = "";
  try { envContent = await fs.readFile(PATHS.env, "utf-8"); } catch {}

  let version = "unknown";
  try {
    const pkg = await readJson<{ version: string }>(PATHS.packageJson, { version: "unknown" });
    version = pkg.version;
  } catch {}

  // Compute stats
  const totalCapsules = capsulesFile.capsules.length;
  const failedCount = failedCapsulesFile.failed_capsules.length;
  const totalAttempts = totalCapsules + failedCount;
  const successRate = totalAttempts > 0 ? (totalCapsules / totalAttempts) * 100 : 0;

  const byKind: Record<string, number> = {};
  for (const evt of memoryGraphEvents) {
    byKind[evt.kind] = (byKind[evt.kind] || 0) + 1;
  }

  let lastRun: MLDashboard["lastRun"] = null;
  if (solidifyState?.last_run) {
    const lr = solidifyState.last_run;
    lastRun = {
      geneId: lr.selected_gene_id,
      signals: lr.signals,
      mutation: lr.mutation || null,
      riskLevel: lr.mutation?.risk_level || "unknown",
      createdAt: lr.created_at,
      selectorReason: lr.selector?.reason || [],
      blastRadius: lr.blast_radius_estimate || { files: 0, lines: 0 },
    };
  }

  const daemon = checkDaemon();

  const candidateStats = { open: 0, implemented: 0, stale: 0, dismissed: 0 };
  for (const c of candidates) {
    const s = c.status || "open";
    if (s in candidateStats) candidateStats[s as keyof typeof candidateStats]++;
    else candidateStats.open++;
  }

  // Normalize feedback entries — JSONL uses different field names than the type
  const normalizedFeedback: FeedbackEntry[] = feedbackEntries.map((raw) => {
    const r = raw as unknown as Record<string, unknown>;
    return {
      gene_id: (r.gene_id as string) || "",
      signals: Array.isArray(r.signals) ? r.signals : r.signal_key ? [r.signal_key as string] : [],
      error_hash: (r.error_hash as string) || "",
      applied_at: (r.applied_at as string) || (r.at as string) || "",
      env: (r.env as string) || (r.environment as string) || "",
      status: ((r.status as string) || "pending") as FeedbackEntry["status"],
      cycles_since: typeof r.cycles_since === "number" ? r.cycles_since : 0,
      resolved_at: (r.resolved_at as string) || null,
    };
  });

  // ML stats
  const feedbackStats = computeFeedbackStats(normalizedFeedback);
  const lessons = knowledgeFile.lessons || [];
  const knowledgeStats = computeKnowledgeStats(lessons);

  const sampleCount = predictorFile.sample_count || (predictorFile.samples ? (predictorFile.samples as unknown[]).length : 0);
  const predictorStats: PredictorStats = {
    ready: sampleCount >= 20,
    sample_count: sampleCount,
    trained_at: predictorFile.trained_at || null,
    min_required: 20,
  };

  // Ollama
  const ollamaUrl = getEnvValue(envContent, "OLLAMA_URL", "http://localhost:11434");
  const ollamaModel = getEnvValue(envContent, "OLLAMA_EMBED_MODEL", "llama3.2:3b");
  const ollamaAvailable = await checkOllamaAvailable(ollamaUrl);

  // Sort events by timestamp (newest first) and cap at 100
  const sortedEvents = [...events]
    .sort((a, b) => {
      const tsA = a.meta?.at ? new Date(a.meta.at as string).getTime() : 0;
      const tsB = b.meta?.at ? new Date(b.meta.at as string).getTime() : 0;
      return tsB - tsA;
    })
    .slice(0, 100);

  const dashboard: MLDashboard = {
    stats: {
      geneCount: genesFile.genes.length,
      capsuleCount: totalCapsules,
      failedCapsuleCount: failedCount,
      candidateCount: candidates.length,
      successRate,
    },
    genes: genesFile.genes,
    capsules: capsulesFile.capsules,
    failedCapsules: failedCapsulesFile.failed_capsules,
    candidates,
    events: sortedEvents,
    candidateStats,
    personality: personalityFile?.current || null,
    lastRun,
    memoryGraph: { total: memoryGraphEvents.length, byKind },
    settings: {
      evolveStrategy: getEnvValue(envContent, "EVOLVE_STRATEGY", "auto"),
      a2aHubUrl: getEnvValue(envContent, "A2A_HUB_URL", ""),
      pendingSleepMs: parseInt(getEnvValue(envContent, "EVOLVE_PENDING_SLEEP_MS", "60000"), 10),
      memoryGraphProvider: getEnvValue(envContent, "MEMORY_GRAPH_PROVIDER", "local"),
      autoPublish: getEnvValue(envContent, "EVOLVER_AUTO_PUBLISH", "true") === "true",
      defaultVisibility: getEnvValue(envContent, "EVOLVER_DEFAULT_VISIBILITY", "public"),
      ollamaUrl,
      ollamaModel,
      ollamaAvailable,
    },
    ml: {
      feedback: { ...feedbackStats, entries: normalizedFeedback.slice(0, 100) },
      knowledge: { ...knowledgeStats, lessons: lessons.slice(0, 100) },
      predictor: predictorStats,
      clusters: clusterRegistry,
    },
    daemon,
    version,
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(dashboard);
}
