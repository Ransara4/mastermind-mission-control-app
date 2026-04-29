import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const HISTORY_FILE = path.join(WS, "projects/rio/waba-setup/rag/search-history.jsonl");

export async function GET(req: NextRequest) {
  const limitRaw = req.nextUrl.searchParams.get("limit") || "20";
  const limit = Math.max(1, Math.min(100, parseInt(limitRaw, 10) || 20));

  if (!fs.existsSync(HISTORY_FILE)) {
    return NextResponse.json({ entries: [] });
  }

  const lines = fs.readFileSync(HISTORY_FILE, "utf-8")
    .split("\n")
    .filter(Boolean)
    .slice(-limit)
    .reverse()
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);

  return NextResponse.json({ entries: lines });
}
