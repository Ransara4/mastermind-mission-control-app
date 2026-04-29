import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/gaming-logo-gen");

function readJSON(file: string) {
  try {
    const full = path.join(AGENT_DIR, file);
    if (fs.existsSync(full)) return JSON.parse(fs.readFileSync(full, "utf-8"));
  } catch {}
  return null;
}

export async function GET() {
  const status = readJSON("data/status.json") || {
    agent: "gaming-logo-gen",
    status: "idle",
    lastRun: null,
    totalOrders: 0,
  };
  const orders = readJSON("data/orders.json") || [];
  const config = readJSON("config/config.json") || {};

  // Calculate stats
  const totalRevenue = orders.reduce(
    (sum: number, o: { cost?: number }) => sum + (o.cost || 0),
    0
  );
  const byStyle: Record<string, number> = {};
  const byGame: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const o of orders) {
    byStyle[o.style] = (byStyle[o.style] || 0) + 1;
    byGame[o.game] = (byGame[o.game] || 0) + 1;
    byType[o.type] = (byType[o.type] || 0) + 1;
  }

  // List output files
  const outputDir = path.join(AGENT_DIR, "output");
  let outputFiles: string[] = [];
  try {
    if (fs.existsSync(outputDir)) {
      outputFiles = fs
        .readdirSync(outputDir)
        .filter((f: string) => f.endsWith(".png"))
        .sort()
        .reverse()
        .slice(0, 20);
    }
  } catch {}

  return NextResponse.json({
    status,
    stats: {
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      byStyle,
      byGame,
      byType,
    },
    recentOrders: orders.slice(0, 10),
    outputFiles,
    config: {
      styles: config.styles || [],
      gameCategories: config.gameCategories || [],
      pricing: config.pricing || {},
    },
  });
}
