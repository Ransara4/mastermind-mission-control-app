import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const WABA_ROOT = path.join(WS, "projects/rio/waba-setup");
const MANIFEST_PATH = path.join(WABA_ROOT, "manifest.json");
const HISTORY_FILE = path.join(WABA_ROOT, "rag/search-history.jsonl");
const INDEX_FILE = path.join(WABA_ROOT, "rag/index.pkl");

export async function GET() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return NextResponse.json({ error: "manifest.json not found" }, { status: 500 });
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const files = manifest.files as Array<{ path: string; status: string; stage: string }>;

  const total = files.length;
  const exists = files.filter((f) => f.status === "exists").length;
  const planned = files.filter((f) => f.status === "planned").length;

  const byStage: Record<string, { exists: number; planned: number }> = {};
  for (const f of files) {
    if (!byStage[f.stage]) byStage[f.stage] = { exists: 0, planned: 0 };
    if (f.status === "exists" || f.status === "planned") {
      byStage[f.stage][f.status]++;
    }
  }

  const historyCount = fs.existsSync(HISTORY_FILE)
    ? fs.readFileSync(HISTORY_FILE, "utf-8").split("\n").filter(Boolean).length
    : 0;

  // Most-searched queries (top 5)
  const topQueries: Record<string, number> = {};
  if (fs.existsSync(HISTORY_FILE)) {
    const lines = fs.readFileSync(HISTORY_FILE, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        const q = (entry.query || "").toLowerCase().trim();
        if (q) topQueries[q] = (topQueries[q] || 0) + 1;
      } catch { /* skip */ }
    }
  }
  const mostSearched = Object.entries(topQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([query, count]) => ({ query, count }));

  return NextResponse.json({
    total,
    exists,
    planned,
    coverage_pct: Math.round((exists / total) * 100),
    by_stage: byStage,
    index_available: fs.existsSync(INDEX_FILE),
    last_updated: manifest.last_updated,
    total_searches: historyCount,
    most_searched: mostSearched,
  });
}
