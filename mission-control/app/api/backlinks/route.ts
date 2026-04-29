import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const AGENT_ROOT = join(WS, "agents/backlinks");

function readJson(path: string) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return null;
  }
}

export async function GET() {
  const status = readJson(join(AGENT_ROOT, "data/status.json"));
  const prospects = readJson(join(AGENT_ROOT, "data/prospects.json")) || [];
  const placements = readJson(join(AGENT_ROOT, "data/placements.json")) || [];
  const config = readJson(join(AGENT_ROOT, "config/config.json"));

  // Compute pipeline stats
  const pipeline = {
    total: prospects.length,
    new: prospects.filter((p: any) => !p.status || p.status === "new").length,
    outreachReady: prospects.filter((p: any) => p.status === "outreach-ready").length,
    sent: prospects.filter((p: any) => p.status === "sent").length,
    replied: prospects.filter((p: any) => p.status === "replied").length,
    accepted: prospects.filter((p: any) => p.status === "accepted").length,
    rejected: prospects.filter((p: any) => p.status === "rejected").length,
    noContact: prospects.filter((p: any) => p.status === "no-contact").length,
  };

  // Placement stats
  const live = placements.filter((p: any) => p.status === "live");
  const drDistribution = { "30-39": 0, "40-49": 0, "50-59": 0, "60+": 0 };
  for (const p of live) {
    const dr = p.dr || 0;
    if (dr >= 60) drDistribution["60+"]++;
    else if (dr >= 50) drDistribution["50-59"]++;
    else if (dr >= 40) drDistribution["40-49"]++;
    else drDistribution["30-39"]++;
  }

  // Tactic breakdown
  const tacticCounts: Record<string, number> = {};
  for (const p of prospects) {
    const t = p.tactic || "unknown";
    tacticCounts[t] = (tacticCounts[t] || 0) + 1;
  }

  return NextResponse.json({
    status,
    pipeline,
    placements: {
      total: placements.length,
      live: live.length,
      issues: placements.filter((p: any) => p.status !== "live" && p.status).length,
      drDistribution,
      recent: placements.slice(-10).reverse(),
    },
    tactics: tacticCounts,
    config: config
      ? {
          minDR: config.defaults?.minDR,
          enabledTactics: Object.entries(config.tactics || {})
            .filter(([, v]: [string, any]) => v.enabled)
            .map(([k]) => k),
        }
      : null,
    recentActivity: (status?.recentActivity || []).slice(0, 10),
  });
}
