import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SESSIONS_BASE = path.join(WS, "projects/mastermind/cohort-1/sessions");

// GET /api/cohorts/wrap-up/zoom-recording?session=N&cohort=1
// Returns matching recording files for a given session
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const cohort = searchParams.get("cohort") || "1";

    const sessionDir = session
      ? path.join(SESSIONS_BASE, `session-${session}`)
      : SESSIONS_BASE;

    let files: string[] = [];
    try {
      const entries = await fs.readdir(sessionDir);
      files = entries.filter((f) => f.endsWith(".mp4"));
    } catch {
      return NextResponse.json({ directory: sessionDir, files: [], matched: null });
    }

    // Match pattern: Mastermind - Cohort N, Session M - YYYY-MM-DD.mp4
    let matched: string | null = null;
    if (session) {
      const pattern = `Mastermind - Cohort ${cohort}, Session ${session}`;
      matched = files.find((f) => f.startsWith(pattern)) || null;
    }

    return NextResponse.json({
      directory: sessionDir,
      files,
      matched,
      matched_path: matched ? path.join(sessionDir, matched) : null,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/cohorts/wrap-up/zoom-recording?session=N — open session folder in Finder
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const session = searchParams.get("session");
    const sessionDir = session
      ? path.join(SESSIONS_BASE, `session-${session}`)
      : SESSIONS_BASE;
    await new Promise<void>((resolve, reject) => {
      exec(`open "${sessionDir}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
