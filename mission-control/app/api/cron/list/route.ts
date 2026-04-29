/**
 * API Route: Fetch all cron jobs from OpenClaw jobs.json + system crontab
 * GET /api/cron/list
 *
 * Returns structured JSON combining:
 *   1. OpenClaw internal jobs from ~/.openclaw/cron/jobs.json
 *   2. System crontab entries from `crontab -l`
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const HOME = os.homedir();
const JOBS_PATH = path.join(HOME, ".openclaw/cron/jobs.json");

interface CronJob {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  schedule: string;
  scheduleHuman: string;
  timezone: string;
  source: "openclaw" | "crontab";
  agent: string;
  agentEmoji: string;
  target: string;
  nextRun: number | null;
  lastRun: number | null;
  lastStatus: string | null;
  lastError: string | null;
  consecutiveErrors: number;
  createdAt: number;
  updatedAt: number;
}

// Human-readable cron description
function cronToHuman(expr: string, tz?: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length < 5) return expr;

  const [min, hour, dom, _mon, dow] = parts;
  const tzLabel = tz ? ` (${tz.split("/")[1] || tz})` : "";

  // Every N minutes/hours
  if (min.startsWith("*/")) return `Every ${min.slice(2)} min${tzLabel}`;
  // Multiple minutes per hour (e.g. "5,20,35,50 * * * *")
  if (hour === "*" && min.includes(",")) {
    const count = min.split(",").length;
    return `${count}x per hour${tzLabel}`;
  }
  if (hour === "*" && min !== "*") return `Every hour at :${min.padStart(2, "0")}${tzLabel}`;
  if (hour.startsWith("*/")) return `Every ${hour.slice(2)} hours${tzLabel}`;

  // Multiple hours per day (e.g. "0 1,6,8 * * *")
  if (hour.includes(",") && /^\d+$/.test(min)) {
    const count = hour.split(",").length;
    return `${count}x daily${tzLabel}`;
  }

  // Specific time
  if (hour !== "*" && min !== "*") {
    const h = parseInt(hour);
    const m = parseInt(min);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const time = `${h12}:${m.toString().padStart(2, "0")} ${period}`;

    if (dow !== "*" && dow !== "?") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayName = days[parseInt(dow)] || dow;
      return `${dayName} at ${time}${tzLabel}`;
    }
    if (dom !== "*") return `Day ${dom} at ${time}${tzLabel}`;
    return `Daily at ${time}${tzLabel}`;
  }

  return expr;
}

// Map job name to agent info
function getAgentInfo(name: string): { agent: string; emoji: string } {
  const n = name.toLowerCase();
  if (n.includes("guard dog") || n.includes("guard-dog")) return { agent: "Guard Dog", emoji: "🐕‍🦺" };
  if (n.includes("teddy")) return { agent: "Teddy", emoji: "🧸" };
  if (n.includes("emmie") || n.includes("inbox")) return { agent: "Emmie", emoji: "📧" };
  if (n.includes("task executor")) return { agent: "Task Executor", emoji: "🤖" };
  if (n.includes("mastermind")) return { agent: "Mastermind", emoji: "🧠" };
  if (n.includes("postpilot")) return { agent: "PostPilot", emoji: "✈️" };
  if (n.includes("seo") || n.includes("gsc")) return { agent: "SEO", emoji: "🔍" };
  if (n.includes("notion template") || n.includes("notion")) return { agent: "Notion", emoji: "📝" };
  if (n.includes("manychat") || n.includes("ig download")) return { agent: "ManyChat", emoji: "💬" };
  if (n.includes("weather") || n.includes("earthquake")) return { agent: "Weather", emoji: "🌤️" };
  if (n.includes("zoom") || n.includes("mentorship")) return { agent: "Mentorship", emoji: "🎓" };
  if (n.includes("mandiri")) return { agent: "Mandiri", emoji: "🏦" };
  if (n.includes("juno")) return { agent: "Juno", emoji: "🤖" };
  if (n.includes("ronnie")) return { agent: "Ronnie", emoji: "💬" };
  if (n.includes("daily summary")) return { agent: "System", emoji: "📊" };
  if (n.includes("evolver")) return { agent: "Evolver", emoji: "🧬" };
  if (n.includes("self-healing") || n.includes("auto-updater")) return { agent: "System", emoji: "🔧" };
  if (n.includes("clanforge")) return { agent: "ClanForge", emoji: "🏰" };
  if (n.includes("stripe")) return { agent: "Stripe", emoji: "💳" };
  if (n.includes("maccleaner") || n.includes("disk cleanup")) return { agent: "System", emoji: "🧹" };
  if (n.includes("blog")) return { agent: "Mastermind", emoji: "🧠" };
  if (n.includes("backup")) return { agent: "System", emoji: "💾" };
  if (n.includes("monitor") || n.includes("fallback")) return { agent: "System", emoji: "📡" };
  if (n.includes("contacts") || n.includes("sync")) return { agent: "System", emoji: "🔄" };
  if (n.includes("compact")) return { agent: "System", emoji: "🗜️" };
  if (n.includes("passive income")) return { agent: "Research", emoji: "💰" };
  return { agent: "System", emoji: "⚙️" };
}

// Compute next run from cron expression
function nextRunFromCron(expr: string, _tz: string): number | null {
  try {
    const parts = expr.trim().split(/\s+/);
    if (parts.length < 5) return null;

    const [minExpr, hourExpr] = parts;
    const now = new Date();

    // Simple case: fixed minute + hour (covers most jobs)
    if (/^\d+$/.test(minExpr) && /^\d+$/.test(hourExpr)) {
      const min = parseInt(minExpr);
      const hour = parseInt(hourExpr);
      const next = new Date(now);
      next.setHours(hour, min, 0, 0);
      if (next.getTime() <= now.getTime()) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    // Interval: */N in minutes
    if (minExpr.startsWith("*/")) {
      const interval = parseInt(minExpr.slice(2)) * 60 * 1000;
      return now.getTime() + interval;
    }

    // Every N hours
    if (hourExpr.startsWith("*/")) {
      const interval = parseInt(hourExpr.slice(2)) * 3600 * 1000;
      return now.getTime() + interval;
    }

    return null;
  } catch {
    return null;
  }
}

async function getOpenClawJobs(): Promise<CronJob[]> {
  try {
    const raw = await fs.readFile(JOBS_PATH, "utf-8");
    const data = JSON.parse(raw);
    const jobs: CronJob[] = [];

    for (const job of data.jobs || []) {
      const cronExpr =
        job.schedule?.kind === "cron"
          ? job.schedule.expr
          : job.schedule?.kind === "every"
            ? `*/${Math.round((job.schedule.everyMs || 300000) / 60000)}m`
            : "";
      const tz = job.schedule?.tz || "Asia/Singapore";
      const agentInfo = getAgentInfo(job.name);

      let nextRun: number | null = job.state?.nextRunAtMs || null;
      if (!nextRun && cronExpr && job.schedule?.kind === "cron") {
        nextRun = nextRunFromCron(job.schedule.expr, tz);
      }

      jobs.push({
        id: job.id,
        name: job.name,
        description: job.description || "",
        enabled: job.enabled ?? true,
        schedule: job.schedule?.kind === "cron" ? `cron ${cronExpr}` : `every ${Math.round((job.schedule?.everyMs || 0) / 60000)}m`,
        scheduleHuman: job.schedule?.kind === "cron" ? cronToHuman(cronExpr, tz) : `Every ${Math.round((job.schedule?.everyMs || 0) / 60000)} minutes`,
        timezone: tz,
        source: "openclaw",
        agent: agentInfo.agent,
        agentEmoji: agentInfo.emoji,
        target: job.sessionTarget || "main",
        nextRun,
        lastRun: job.state?.lastRunAtMs || null,
        lastStatus: job.state?.lastStatus || null,
        lastError: job.state?.lastError || null,
        consecutiveErrors: job.state?.consecutiveErrors || 0,
        createdAt: job.createdAtMs || Date.now(),
        updatedAt: job.updatedAtMs || Date.now(),
      });
    }

    return jobs;
  } catch {
    return [];
  }
}

async function getSystemCrontabJobs(): Promise<CronJob[]> {
  try {
    const { stdout } = await execAsync("crontab -l 2>/dev/null");
    const jobs: CronJob[] = [];
    const lines = stdout.split("\n");

    let comment = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#")) {
        comment = trimmed.replace(/^#\s*/, "");
        continue;
      }
      if (!trimmed || trimmed.length < 10) continue;

      // Parse cron line: M H D Mo DOW command
      const match = trimmed.match(/^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/);
      if (!match) continue;

      const cronExpr = match[1];
      const command = match[2];
      const name = comment || `System: ${path.basename(command.split(" ")[0])}`;
      const agentInfo = getAgentInfo(name);

      jobs.push({
        id: `crontab-${Buffer.from(trimmed).toString("base64").slice(0, 16)}`,
        name,
        description: command.length > 80 ? command.slice(0, 80) + "..." : command,
        enabled: true,
        schedule: `cron ${cronExpr}`,
        scheduleHuman: cronToHuman(cronExpr),
        timezone: "Asia/Singapore",
        source: "crontab",
        agent: agentInfo.agent,
        agentEmoji: agentInfo.emoji,
        target: "system",
        nextRun: nextRunFromCron(cronExpr, "Asia/Singapore"),
        lastRun: null,
        lastStatus: null,
        lastError: null,
        consecutiveErrors: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      comment = "";
    }

    return jobs;
  } catch {
    return [];
  }
}

export async function GET() {
  const [openclawJobs, systemJobs] = await Promise.all([
    getOpenClawJobs(),
    getSystemCrontabJobs(),
  ]);

  const allJobs = [...openclawJobs, ...systemJobs];

  return NextResponse.json(allJobs, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
