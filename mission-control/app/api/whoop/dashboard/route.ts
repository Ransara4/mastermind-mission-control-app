import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { WhoopDashboard } from "@/lib/whoop-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/whoop");
const TOKEN_PATH = path.join(AGENT_DIR, "data/tokens.json");
const SUMMARY_PATH = path.join(AGENT_DIR, "data/latest-summary.json");

export async function GET() {
  try {
    // Check auth status
    let authenticated = false;
    let tokenExpiry: string | null = null;
    try {
      const tokenData = JSON.parse(await fs.readFile(TOKEN_PATH, "utf-8"));
      authenticated = tokenData.access_token && Date.now() < tokenData.expires_at;
      tokenExpiry = tokenData.expires_at
        ? new Date(tokenData.expires_at).toISOString()
        : null;
    } catch {
      // No tokens file
    }

    // Read latest summary
    let recovery = null;
    let sleep = null;
    let strain = null;
    let timestamp: string | null = null;
    try {
      const summary = JSON.parse(await fs.readFile(SUMMARY_PATH, "utf-8"));
      recovery = summary.recovery || null;
      sleep = summary.sleep || null;
      strain = summary.strain || null;
      timestamp = summary.timestamp || null;
    } catch {
      // No summary yet
    }

    const dashboard: WhoopDashboard = {
      authenticated,
      tokenExpiry,
      recovery,
      sleep,
      strain,
      timestamp,
    };

    return NextResponse.json(dashboard);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
