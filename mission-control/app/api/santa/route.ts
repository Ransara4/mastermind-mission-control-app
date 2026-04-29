import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const NIGHTCRAWLER_ROOT = path.join(WS, "agents/santa");
const REPORTS_DIR = path.join(NIGHTCRAWLER_ROOT, "data/reports");
const LOGS_DIR = path.join(NIGHTCRAWLER_ROOT, "data/logs");
const RUNS_PATH = path.join(NIGHTCRAWLER_ROOT, "data/inventory/runs.json");
const SETTINGS_PATH = path.join(NIGHTCRAWLER_ROOT, "config/settings.json");

// ── Helpers ──────────────────────────────────────────────────────────

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // already exists
  }
}

async function readJsonSafe<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

interface RunEntry {
  date: string;
  status: "success" | "failed";
  exitCode: number;
  duration?: number;
  skillsAdded?: number;
  summary?: string;
}

// ── GET ──────────────────────────────────────────────────────────────

export async function GET() {
  await ensureDir(REPORTS_DIR);
  await ensureDir(LOGS_DIR);

  // Read reports
  let reportFiles: string[] = [];
  try {
    const entries = await fs.readdir(REPORTS_DIR);
    reportFiles = entries.filter((f) => f.endsWith(".md")).sort().reverse();
  } catch {
    // empty
  }

  const reports = await Promise.all(
    reportFiles.slice(0, 30).map(async (filename) => {
      const content = await fs.readFile(path.join(REPORTS_DIR, filename), "utf-8");
      const date = filename.replace(/\.md$/, "");
      return { date, filename, content };
    })
  );

  // Read run logs
  const runs: RunEntry[] = await readJsonSafe(RUNS_PATH, []);

  // Read latest log files
  let logFiles: string[] = [];
  try {
    const entries = await fs.readdir(LOGS_DIR);
    logFiles = entries.filter((f) => f.endsWith(".log") || f.endsWith(".txt")).sort().reverse();
  } catch {
    // empty
  }

  // Compute stats
  const totalRuns = runs.length;
  const successCount = runs.filter((r) => r.status === "success").length;
  const successRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;
  const lastRun = runs.length > 0 ? runs[runs.length - 1].date : null;
  const skillsAdded = runs.reduce((sum, r) => sum + (r.skillsAdded || 0), 0);

  // Read settings
  const settings = await readJsonSafe(SETTINGS_PATH, {
    whoIAm: "",
    missionAndGoals: "",
    parametersAndRules: "",
    updatedAt: null,
  });

  // Read live running status
  const statusData = await readJsonSafe<{ status?: string }>(
    path.join(NIGHTCRAWLER_ROOT, "status.json"),
    {}
  );
  const isRunning = statusData.status === "running";

  return NextResponse.json({
    reports,
    runs: [...runs].reverse().slice(0, 50),
    logs: logFiles.slice(0, 20),
    stats: { totalRuns, successRate, lastRun, skillsAdded },
    settings,
    isRunning,
  });
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === "log-run") {
    await ensureDir(path.dirname(RUNS_PATH));
    const runs: RunEntry[] = await readJsonSafe(RUNS_PATH, []);
    const entry: RunEntry = {
      date: body.date || new Date().toISOString(),
      status: body.status || "success",
      exitCode: body.exitCode ?? 0,
      duration: body.duration,
      skillsAdded: body.skillsAdded,
      summary: body.summary,
    };
    runs.push(entry);
    await fs.writeFile(RUNS_PATH, JSON.stringify(runs, null, 2));
    return NextResponse.json({ ok: true, entry });
  }

  if (action === "save-report") {
    await ensureDir(REPORTS_DIR);
    const date = body.date || new Date().toISOString().split("T")[0];
    const filename = `${date}.md`;
    // Only write if content is provided — a missing content field must not overwrite an existing report
    if (body.content !== undefined && body.content !== null) {
      await fs.writeFile(path.join(REPORTS_DIR, filename), body.content);
    }
    return NextResponse.json({ ok: true, filename });
  }

  if (action === "save-settings") {
    await ensureDir(path.dirname(SETTINGS_PATH));
    const settings = await readJsonSafe(SETTINGS_PATH, {
      whoIAm: "",
      missionAndGoals: "",
      parametersAndRules: "",
      updatedAt: null,
    });
    if (body.whoIAm !== undefined) settings.whoIAm = body.whoIAm;
    if (body.missionAndGoals !== undefined) settings.missionAndGoals = body.missionAndGoals;
    if (body.parametersAndRules !== undefined) settings.parametersAndRules = body.parametersAndRules;
    settings.updatedAt = new Date().toISOString();
    await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
    return NextResponse.json({ ok: true, settings });
  }

  if (action === "trigger") {
    const runScript = path.join(WS, "agents/santa/bin/run.sh");
    const child = spawn("/bin/bash", [runScript], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, HOME },
    });
    child.unref();
    return NextResponse.json({ ok: true, message: "Santa triggered — running now." });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
