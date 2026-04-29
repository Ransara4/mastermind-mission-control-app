import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const LOGS_DIR = path.join(WS, "logs");
const AGENT_LOGS_FILE = path.join(LOGS_DIR, "agent-runs.json");

interface AgentRun {
  id: string;
  agent: string;
  status: "success" | "failure" | "running";
  startedAt: string;
  duration: number | null;
  tokensUsed: number | null;
  costUsd: number | null;
  summary: string;
  error?: string;
}

export async function GET() {
  try {
    let runs: AgentRun[] = [];

    if (fs.existsSync(AGENT_LOGS_FILE)) {
      const raw = fs.readFileSync(AGENT_LOGS_FILE, "utf-8");
      runs = JSON.parse(raw);
    }

    // Sort by most recent first
    runs.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Compute token summary for last 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRuns = runs.filter(
      (r) => new Date(r.startedAt).getTime() >= sevenDaysAgo
    );

    const byAgent: Record<
      string,
      { tokens: number; cost: number; runs: number }
    > = {};
    let totalTokens = 0;
    let totalCostUsd = 0;

    for (const run of recentRuns) {
      if (!byAgent[run.agent]) {
        byAgent[run.agent] = { tokens: 0, cost: 0, runs: 0 };
      }
      byAgent[run.agent].runs++;
      if (run.tokensUsed) {
        byAgent[run.agent].tokens += run.tokensUsed;
        totalTokens += run.tokensUsed;
      }
      if (run.costUsd) {
        byAgent[run.agent].cost += run.costUsd;
        totalCostUsd += run.costUsd;
      }
    }

    return NextResponse.json({
      runs: runs.slice(0, 200),
      tokenSummary: {
        totalTokens,
        totalCostUsd,
        byAgent,
        period: "7d",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message, runs: [], tokenSummary: null },
      { status: 500 }
    );
  }
}

// POST endpoint for logging new runs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent, status, duration, tokensUsed, costUsd, summary, error } =
      body;

    if (!agent || !status || !summary) {
      return NextResponse.json(
        { error: "agent, status, and summary are required" },
        { status: 400 }
      );
    }

    // Ensure logs directory exists
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    let runs: AgentRun[] = [];
    if (fs.existsSync(AGENT_LOGS_FILE)) {
      runs = JSON.parse(fs.readFileSync(AGENT_LOGS_FILE, "utf-8"));
    }

    const newRun: AgentRun = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      agent,
      status,
      startedAt: new Date().toISOString(),
      duration: duration ?? null,
      tokensUsed: tokensUsed ?? null,
      costUsd: costUsd ?? null,
      summary,
      error: error ?? undefined,
    };

    runs.push(newRun);

    // Keep last 1000 entries
    if (runs.length > 1000) {
      runs = runs.slice(-1000);
    }

    fs.writeFileSync(AGENT_LOGS_FILE, JSON.stringify(runs, null, 2));

    return NextResponse.json({ ok: true, id: newRun.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
