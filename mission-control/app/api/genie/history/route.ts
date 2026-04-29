export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "..", "data", "genie-history.db");
const TABLE_NAME = "genie_sessions";

function getDb(readonly = false) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
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
      provider TEXT,
      runner TEXT,
      git_sha_before TEXT,
      has_changes INTEGER DEFAULT 0,
      run_commit_sha TEXT,
      worktree_clean_before INTEGER DEFAULT 0,
      safe_undo_available INTEGER DEFAULT 0
    )
  `);
  // Migration: add columns to existing databases that predate these fields
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN provider TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN runner TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN git_sha_before TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN has_changes INTEGER DEFAULT 0`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN run_commit_sha TEXT`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN worktree_clean_before INTEGER DEFAULT 0`); } catch { /* already exists */ }
  try { db.exec(`ALTER TABLE ${TABLE_NAME} ADD COLUMN safe_undo_available INTEGER DEFAULT 0`); } catch { /* already exists */ }
  return db;
}

export async function GET() {
  try {
    const db = getDb(false);
    const rows = db
      .prepare(
        `SELECT * FROM ${TABLE_NAME} ORDER BY started_at DESC LIMIT 20`
      )
      .all();
    db.close();
    return NextResponse.json({ sessions: rows });
  } catch (err) {
    console.error("genie history GET error:", err);
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
      provider,
      runner,
      git_sha_before,
      has_changes,
      run_commit_sha,
      worktree_clean_before,
      safe_undo_available,
    } = body;

    const db = getDb(false);
    db.prepare(
      `INSERT INTO ${TABLE_NAME}
        (session_id, slot, prompt, model, effort, status, started_at, finished_at, output_preview, tokens_used, cost_usd, provider, runner, git_sha_before, has_changes, run_commit_sha, worktree_clean_before, safe_undo_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      provider ?? null,
      runner ?? null,
      git_sha_before ?? null,
      has_changes ?? 0,
      run_commit_sha ?? null,
      worktree_clean_before ?? 0,
      safe_undo_available ?? 0
    );
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("genie history POST error:", err);
    return NextResponse.json({ error: "Failed to save session" }, { status: 500 });
  }
}
