import { NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const AGENT_ROOT = join(WS, "agents/human-task-handler");
const DATA_DIR = join(AGENT_ROOT, "data");
const PLAYBOOK_DIR = join(AGENT_ROOT, "playbooks");
const LOG_DIR = join(WS, "logs/human-task-handler");

function safeReadJson(path: string) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // Fetch Human Must Do cards from MC
    const dbPath = join(WS, "mission-control/lib/db.json");
    const db = safeReadJson(dbPath) || { cards: [] };
    const humanCards = (db.cards || [])
      .filter((c: Record<string, unknown>) => c.column === "human-must-do")
      .sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          ((a.order as number) || 999) - ((b.order as number) || 999)
      );

    // Load attempt tracking
    const attempts = safeReadJson(join(DATA_DIR, "attempts.json")) || {};

    // Load last run
    const lastRun = safeReadJson(join(DATA_DIR, "last-run.json"));

    // Load playbooks
    const playbooks = existsSync(PLAYBOOK_DIR)
      ? readdirSync(PLAYBOOK_DIR)
          .filter((f) => f.endsWith(".md"))
          .map((f) => ({
            name: f.replace(".md", ""),
            content: readFileSync(join(PLAYBOOK_DIR, f), "utf8").slice(0, 500),
          }))
      : [];

    // Recent log entries
    const logFiles = existsSync(LOG_DIR)
      ? readdirSync(LOG_DIR)
          .filter((f) => f.endsWith(".log"))
          .sort()
          .reverse()
          .slice(0, 3)
      : [];
    const recentLogs = logFiles.map((f) => {
      const content = readFileSync(join(LOG_DIR, f), "utf8");
      return { file: f, content: content.slice(-1000) };
    });

    // Enrich cards with attempt data
    const enrichedCards = humanCards.map((card: Record<string, unknown>) => ({
      ...card,
      attemptData: attempts[card._id as string] || {
        count: 0,
        lastAttempt: null,
        lastResult: null,
        researchNotes: "",
      },
    }));

    return NextResponse.json({
      cards: enrichedCards,
      totalCards: humanCards.length,
      lastRun,
      playbooks,
      recentLogs,
      stats: {
        totalAttempts: (Object.values(attempts) as { count?: number }[]).reduce(
          (sum, a) => sum + (a.count || 0),
          0
        ),
        maxedOut: (Object.values(attempts) as { count?: number }[]).filter(
          (a) => (a.count || 0) >= 3
        ).length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
