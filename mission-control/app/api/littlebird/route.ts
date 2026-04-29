import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/littlebird");
const STATUS_PATH = path.join(AGENT_DIR, "status.json");
const DATA_PATH = path.join(AGENT_DIR, "data/reports.json");
const ENV_PATH = path.join(WS, ".env");

async function getStoredToken(): Promise<string | null> {
  try {
    const env = await fs.readFile(ENV_PATH, "utf-8");
    const line = env.split("\n").find((l) => l.startsWith("LITTLEBIRD_ACCESS_TOKEN="));
    return line ? line.split("=").slice(1).join("=").trim() : null;
  } catch { return null; }
}

async function testToken(token: string): Promise<boolean> {
  const { default: https } = await import("https");
  return new Promise((resolve) => {
    const req = https.get("https://app.lilbird.co/reports", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    }, (res) => { resolve(res.statusCode === 200); res.resume(); });
    req.on("error", () => resolve(false));
    req.setTimeout(8000, () => { req.destroy(); resolve(false); });
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  if (action === "health") {
    const token = await getStoredToken();
    if (!token) {
      return NextResponse.json({ connected: false, reason: "no_token" });
    }
    const ok = await testToken(token);
    if (!ok) {
      return NextResponse.json({ connected: false, reason: "token_expired" });
    }
    return NextResponse.json({ connected: true, reason: null });
  }

  if (action === "status") {
    try {
      const raw = await fs.readFile(STATUS_PATH, "utf-8");
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({ lastSync: null, reportCount: 0, lastError: null });
    }
  }

  if (action === "reports") {
    try {
      const raw = await fs.readFile(DATA_PATH, "utf-8");
      const reports = JSON.parse(raw);
      const list = reports.map((r: { id: number; title: string; date: string; text: string }) => ({
        id: r.id,
        title: r.title,
        date: r.date.slice(0, 10),
        preview: r.text.slice(0, 200).replace(/\n/g, " "),
        length: r.text.length,
      }));
      list.sort((a: { date: string }, b: { date: string }) => b.date.localeCompare(a.date));
      return NextResponse.json({ reports: list, total: list.length });
    } catch {
      return NextResponse.json({ reports: [], total: 0 });
    }
  }

  if (action === "report") {
    const id = searchParams.get("id");
    try {
      const raw = await fs.readFile(DATA_PATH, "utf-8");
      const reports = JSON.parse(raw);
      const report = reports.find((r: { id: number }) => String(r.id) === id);
      return report
        ? NextResponse.json(report)
        : NextResponse.json({ error: "Not found" }, { status: 404 });
    } catch {
      return NextResponse.json({ error: "Failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.action === "sync") {
    try {
      const result = execSync(
        `node ${path.join(AGENT_DIR, "src/index.js")} sync`,
        { timeout: 30000, encoding: "utf-8" }
      );
      return NextResponse.json({ ok: true, output: result });
    } catch (e: unknown) {
      const err = e as { message?: string };
      return NextResponse.json(
        { ok: false, error: err?.message || "Sync failed" },
        { status: 500 }
      );
    }
  }

  if (body.action === "refresh-token") {
    try {
      const result = execSync(
        `node ${path.join(AGENT_DIR, "src/index.js")} refresh-token`,
        { timeout: 30000, encoding: "utf-8" }
      );
      return NextResponse.json({ ok: true, output: result });
    } catch (e: unknown) {
      const err = e as { message?: string };
      return NextResponse.json(
        { ok: false, error: err?.message || "Token refresh failed" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
