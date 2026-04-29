import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execFileAsync = promisify(execFile);

const UNSPLASH_BIN = path.join(WS, "agents/unsplash/src/index.js");
const UNSPLASH_STATUS_PATH = path.join(WS, "agents/unsplash/status.json");

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(UNSPLASH_STATUS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

// GET /api/unsplash — returns status; with ?q= performs a search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const count = searchParams.get("count") || "3";

  const status = readStatus();

  if (!query) {
    return NextResponse.json({ status });
  }

  try {
    const { stdout } = await execFileAsync("node", [
      UNSPLASH_BIN,
      "search",
      query,
      `--count=${count}`,
      "--json",
    ], { timeout: 20000 });

    const data = JSON.parse(stdout);
    return NextResponse.json({ status, ...data });
  } catch (err) {
    console.error("Unsplash search error:", err);
    return NextResponse.json({ error: "Search failed", status }, { status: 500 });
  }
}

// POST /api/unsplash — trigger download event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { downloadLocation } = body;

    if (!downloadLocation) {
      return NextResponse.json({ error: "downloadLocation is required" }, { status: 400 });
    }

    await execFileAsync("node", [
      UNSPLASH_BIN,
      "trigger-download",
      downloadLocation,
      "--json",
    ], { timeout: 10000 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Unsplash trigger-download error:", err);
    return NextResponse.json({ error: "Trigger failed" }, { status: 500 });
  }
}
