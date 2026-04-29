export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "..", "data", "claude-terminal.db");

function getDb(readonly = false) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  db.exec(`
    CREATE TABLE IF NOT EXISTS claude_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      slot TEXT DEFAULT 'A',
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      effort TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      started_at TEXT NOT NULL,
      finished_at TEXT,
      output_preview TEXT,
      tokens_used INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0,
      git_sha_before TEXT,
      has_changes INTEGER DEFAULT 0
    )
  `);
  // Migration: add columns to existing databases that predate these fields
  try { db.exec(`ALTER TABLE claude_sessions ADD COLUMN git_sha_before TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE claude_sessions ADD COLUMN has_changes INTEGER DEFAULT 0`); } catch { /* already exists */ }
  return db;
}

export async function GET() {
  try {
    const db = getDb(false);
    const rows = db
      .prepare(
        `SELECT * FROM claude_sessions ORDER BY started_at DESC LIMIT 20`
      )
      .all();
    db.close();
    return NextResponse.json({ sessions: rows });
  } catch (err) {
    console.error("claude-terminal history GET error:", err);
    return NextResponse.json({ sessions: [] });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      session_id,
      slot,
      prompt,
      model,
      effort,
      status,
      started_at,
      finished_at,
      output_preview,
      tokens_used,
      cost_usd,
      git_sha_before,
      has_changes,
    } = body;

    const db = getDb(false);
    db.prepare(
      `INSERT INTO claude_sessions
        (session_id, slot, prompt, model, effort, status, started_at, finished_at, output_preview, tokens_used, cost_usd, git_sha_before, has_changes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      session_id ?? null,
      slot ?? "A",
      prompt,
      model,
      effort,
      status ?? "completed",
      started_at,
      finished_at ?? null,
      (output_preview ?? "").slice(0, 1000),
      tokens_used ?? 0,
      cost_usd ?? 0,
      git_sha_before ?? null,
      has_changes ?? 0
    );
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("claude-terminal history POST error:", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
