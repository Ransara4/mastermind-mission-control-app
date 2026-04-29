/**
 * API Route: Disk Cleaner — GET last run report, history, and disk stats
 * GET /api/disk-cleaner
 */

import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const DATA_DIR = path.join(WS, "agents/mac-cleaner/data");
const LAST_RUN_FILE = path.join(DATA_DIR, "last-run.json");
const STATUS_FILE = path.join(DATA_DIR, "status.json");
const HISTORY_FILE = path.join(DATA_DIR, "history.json");
const LIFETIME_FILE = path.join(DATA_DIR, "lifetime-stats.json");

function getDiskStats() {
  try {
    const target = process.platform === "darwin" ? "/System/Volumes/Data" : "/";
    const dfOutput = execSync(`df -k "${target}"`, { encoding: "utf-8" });
    const parts = dfOutput.split("\n")[1].trim().split(/\s+/);
    const totalBytes = parseInt(parts[1]) * 1024;
    const usedBytes = parseInt(parts[2]) * 1024;
    const freeBytes = parseInt(parts[3]) * 1024;
    const percentUsed = Math.round((usedBytes / totalBytes) * 100);
    return { totalBytes, usedBytes, freeBytes, percentUsed };
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    let lastRun = null;
    let status = null;
    let history = null;

    try {
      const raw = await fs.readFile(LAST_RUN_FILE, "utf-8");
      lastRun = JSON.parse(raw);
    } catch {
      // No last run yet
    }

    try {
      const raw = await fs.readFile(STATUS_FILE, "utf-8");
      status = JSON.parse(raw);
    } catch {
      // No status yet
    }

    try {
      const raw = await fs.readFile(HISTORY_FILE, "utf-8");
      history = JSON.parse(raw);
    } catch {
      // No history yet
    }

    let lifetimeStats = null;
    try {
      const raw = await fs.readFile(LIFETIME_FILE, "utf-8");
      lifetimeStats = JSON.parse(raw);
    } catch {
      // No lifetime stats yet
    }

    const diskStats = getDiskStats();

    return NextResponse.json({ success: true, lastRun, status, history, diskStats, lifetimeStats });
  } catch (error) {
    console.error("[/api/disk-cleaner] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to read disk-cleaner data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
