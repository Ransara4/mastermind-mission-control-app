export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { execSync } from "child_process";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const ALLSORTED_PATH = process.env.ALLSORTED_APP_PATH ?? "/app/all-sorted";
const DB_PATH = path.join(process.cwd(), "..", "data", "claude-terminal.db");

function getDb() {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return new Database(DB_PATH, { readonly: true });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as {
      sessionId?: number;
      gitShaBefore?: string;
    };

    let sha: string | null = null;

    if (body.sessionId) {
      // Look up the pre-run SHA from the DB — most reliable, ties undo to a specific session
      try {
        const db = getDb();
        const row = db.prepare(
          `SELECT git_sha_before FROM claude_sessions WHERE id = ?`
        ).get(body.sessionId) as { git_sha_before: string | null } | undefined;
        db.close();
        sha = row?.git_sha_before ?? null;
      } catch { /* DB not available */ }
    }

    // Fallback: accept a SHA directly from the caller (e.g. from the current session before it was saved)
    if (!sha && body.gitShaBefore && /^[0-9a-f]{40}$/i.test(body.gitShaBefore)) {
      sha = body.gitShaBefore;
    }

    if (!sha) {
      return NextResponse.json(
        { error: "No git SHA found for this session — nothing to undo." },
        { status: 400 }
      );
    }

    execSync(`git reset --hard ${sha}`, { cwd: ALLSORTED_PATH, stdio: "pipe" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "git reset failed" },
      { status: 500 }
    );
  }
}
