import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_DIR = join(WS, "agents/meta-ads/data");

function readCache(name: string) {
  const p = join(DATA_DIR, `${name}.json`);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "dashboard";

    if (action === "sync") {
      const agentPath = join(WS, "agents/meta-ads/src/index.js");
      execSync(`node ${agentPath} sync`, { timeout: 30000 });
    }

    const dashboard = readCache("dashboard");
    const campaigns = readCache("campaigns");
    const adsets = readCache("adsets");
    const audiences = readCache("audiences");
    const insights = readCache("insights");
    const account = readCache("account");
    const lastSync = readCache("last-sync");

    const hasCredentials = !!(
      process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID
    );

    return NextResponse.json({
      hasCredentials,
      dashboard,
      campaigns,
      adsets,
      audiences,
      insights,
      account,
      lastSync,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
