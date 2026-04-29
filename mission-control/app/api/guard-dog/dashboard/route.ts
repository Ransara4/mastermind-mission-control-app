import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { GuardDogDashboard, ScanEntry } from "@/lib/guard-dog-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);

const GUARD_DOG_ROOT = path.join(WS, "agents/guard-dog");
const SCAN_HISTORY_PATH = path.join(GUARD_DOG_ROOT, "data/scan-history.json");
const THREAT_INTEL_REPORT_PATH = path.join(GUARD_DOG_ROOT, "data/threat-intel-report.json");
const TRUSTED_PROVIDERS_PATH = path.join(GUARD_DOG_ROOT, "config/trusted-providers.json");
const GIT_HOOK_PATH = path.join(WS, ".git/hooks/pre-commit");
const CRON_LOG_PATH = path.join(GUARD_DOG_ROOT, "data/cron.log");

export async function GET() {
  let scans: ScanEntry[] = [];

  // Read scan history (resilient to malformed JSON)
  try {
    const raw = await fs.readFile(SCAN_HISTORY_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    scans = Array.isArray(parsed) ? parsed : [];
  } catch {
    // If JSON is malformed, try to recover first valid array
    try {
      const raw = await fs.readFile(SCAN_HISTORY_PATH, "utf-8");
      const match = raw.match(/^\[[\s\S]*?\n\]/);
      if (match) {
        scans = JSON.parse(match[0]);
      }
    } catch {
      // Give up, use empty
    }
  }

  // Read trusted providers
  let trustedProviders = { providers: [] as string[], namespaces: [] as string[], scopes: {} as Record<string, string[]> };
  try {
    const raw = await fs.readFile(TRUSTED_PROVIDERS_PATH, "utf-8");
    const config = JSON.parse(raw);
    trustedProviders = {
      providers: config.trustedProviders || [],
      namespaces: config.trustedNamespaces || [],
      scopes: config.trustedScopes || {},
    };
  } catch {
    // Use defaults
  }

  // Compute stats
  const totalScans = scans.length;
  const dangerCount = scans.filter((s) => s.action === "BARK").length;
  const suspiciousCount = scans.filter((s) => s.action === "WHINE").length;
  const safeCount = scans.filter((s) => s.action === "SILENT").length;
  const cleanRate = totalScans > 0 ? (safeCount / totalScans) * 100 : 100;
  const avgDuration =
    totalScans > 0
      ? scans.reduce((sum, s) => sum + s.duration, 0) / totalScans
      : 0;
  const lastScanAt = scans.length > 0 ? scans[scans.length - 1].timestamp : "";

  // Recent scans (last 50, newest first)
  const recentScans = [...scans].reverse().slice(0, 50);

  // Daily trend
  const dailyMap: Record<string, { bark: number; whine: number; silent: number }> = {};
  for (const scan of scans) {
    const date = scan.timestamp.split("T")[0];
    if (!dailyMap[date]) dailyMap[date] = { bark: 0, whine: 0, silent: 0 };
    if (scan.action === "BARK") dailyMap[date].bark++;
    else if (scan.action === "WHINE") dailyMap[date].whine++;
    else dailyMap[date].silent++;
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, counts]) => ({ date, ...counts }));

  // Signal breakdown
  const signalMap: Record<string, number> = {};
  for (const scan of scans) {
    for (const reason of scan.reasons) {
      signalMap[reason] = (signalMap[reason] || 0) + 1;
    }
  }
  const signalBreakdown = Object.entries(signalMap)
    .map(([signal, count]) => ({ signal, count }))
    .sort((a, b) => b.count - a.count);

  // Check automation status
  let cronActive = false;
  let cronSchedule = "";
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null");
    const guardDogLine = stdout
      .split("\n")
      .find((line) => line.includes("guard-dog") && !line.startsWith("#"));
    if (guardDogLine) {
      cronActive = true;
      // Extract schedule (first 5 fields)
      const parts = guardDogLine.trim().split(/\s+/);
      cronSchedule = parts.slice(0, 5).join(" ");
    }
  } catch {
    // crontab not available or empty
  }

  let cronLastRun: string | null = null;
  try {
    const logContent = await fs.readFile(CRON_LOG_PATH, "utf-8");
    const lines = logContent.trim().split("\n");
    if (lines.length > 0) {
      cronLastRun = lines[lines.length - 1];
    }
  } catch {
    // No log
  }

  let gitHookActive = false;
  try {
    await fs.access(GIT_HOOK_PATH);
    const content = await fs.readFile(GIT_HOOK_PATH, "utf-8");
    gitHookActive = content.includes("guard-dog");
  } catch {
    // Hook doesn't exist
  }

  // Read threat intel report
  interface ThreatMatch {
    id: string;
    source: string;
    severity: string;
    package: string;
    ecosystem: string;
    summary: string;
    publishedDate: string | null;
    url: string;
  }
  let threatMatches: ThreatMatch[] = [];
  try {
    const raw = await fs.readFile(THREAT_INTEL_REPORT_PATH, "utf-8");
    const report = JSON.parse(raw);
    threatMatches = report.matches || [];
  } catch {
    // No threat intel data available
  }

  // Map threat matches to ThreatIntelEntry format
  const threatIntelEntries: import("@/lib/guard-dog-types").ThreatIntelEntry[] = threatMatches.map((m) => ({
    id: m.id,
    severity: (m.severity || "medium") as "critical" | "high" | "medium" | "low" | "info",
    title: m.summary && m.summary !== "No summary available"
      ? m.summary.substring(0, 120)
      : `${m.id} - ${m.package || "unknown"}`,
    description: m.summary || "No summary available",
    affectedPackages: [m.package],
    source: m.source || "OSV",
    publishedAt: m.publishedDate || new Date().toISOString(),
    url: m.url,
  }));

  // Aggregate top vulnerable packages from threat intel
  const pkgMap: Record<string, { count: number; severity: string; ecosystem: string; lastSeen: string }> = {};
  for (const m of threatMatches) {
    const key = `${m.package}|${m.ecosystem}`;
    if (!pkgMap[key]) {
      pkgMap[key] = { count: 0, severity: m.severity || "medium", ecosystem: m.ecosystem, lastSeen: m.publishedDate || "" };
    }
    pkgMap[key].count++;
    // Escalate severity
    const order = { critical: 4, high: 3, medium: 2, low: 1 };
    const cur = order[pkgMap[key].severity as keyof typeof order] || 0;
    const incoming = order[m.severity as keyof typeof order] || 0;
    if (incoming > cur) pkgMap[key].severity = m.severity;
  }
  const topVulnerablePackages: import("@/lib/guard-dog-types").VulnerablePackage[] = Object.entries(pkgMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([key, data]) => {
      const [packageName, ecosystem] = key.split("|");
      return {
        packageName,
        ecosystem,
        severity: data.severity as "critical" | "high" | "medium" | "low",
        cveCount: data.count,
        patternScore: 0,
        lastScanned: data.lastSeen || new Date().toISOString(),
        fixAvailable: false,
      };
    });

  // Calculate security score
  const vulnScore = Math.max(0, 30 - dangerCount * 5 - suspiciousCount * 2);
  const recencyScore = lastScanAt ? 20 : 0;
  const threatIntelCount = threatMatches.length;
  const threatScore = Math.max(0, 20 - Math.floor(threatIntelCount / 5));
  const protectionScore = (gitHookActive ? 10 : 0) + (cronActive ? 20 : 0);
  const securityScore = Math.round(vulnScore + recencyScore + threatScore + protectionScore);

  const dashboard: GuardDogDashboard = {
    securityScore,
    scoreTrend: 0,
    scoreBreakdown: {
      vulnerabilities: vulnScore,
      scanRecency: recencyScore,
      threatIntel: threatScore,
      protectionActive: protectionScore,
    },
    stats: {
      totalScans,
      dangerCount,
      suspiciousCount,
      safeCount,
      cleanRate,
      avgDuration,
      lastScanAt,
      monitoredPackages: scans.length,
      nextScheduledScan: null,
    },
    protectionStatus: {
      preInstallHook: gitHookActive,
      cronNightly: cronActive,
      cronThreatIntel: cronActive,
      lastNightlyScan: cronLastRun,
      lastThreatIntelScan: cronLastRun,
    },
    recentScans,
    dailyTrend,
    signalBreakdown,
    trustedProviders,
    threatIntel: threatIntelEntries.slice(0, 50),
    installLog: [],
    cronJobs: cronActive
      ? [
          {
            id: "cron-guard-dog",
            name: "Guard Dog Scan",
            schedule: cronSchedule,
            enabled: true,
            lastRun: cronLastRun,
            lastStatus: cronLastRun ? "success" : null,
            nextRun: null,
          },
        ]
      : [],
    topVulnerablePackages,
    remediationProgress: {
      total: threatIntelCount + dangerCount + suspiciousCount,
      resolved: 0,
      inProgress: 0,
      pending: threatIntelCount + dangerCount + suspiciousCount,
    },
  };

  return NextResponse.json(dashboard);
}
