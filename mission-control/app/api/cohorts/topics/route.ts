import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-blog.db");

const TOPICS_SCHEMA = `CREATE TABLE IF NOT EXISTS blog_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  topic TEXT NOT NULL,
  source TEXT DEFAULT 'manual',
  score INTEGER,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  used_by_post_id INTEGER
)`;

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.exec(TOPICS_SCHEMA);
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) {
    try { db.exec(TOPICS_SCHEMA); } catch { /* table may already exist */ }
  }
  return db;
}

export async function GET() {
  try {
    const db = getDb(false); // need write to ensure table exists
    if (!db) return NextResponse.json({ topics: [] });

    const topics = db.prepare(
      "SELECT * FROM blog_topics ORDER BY created_at DESC LIMIT 50"
    ).all();

    db.close();
    return NextResponse.json({ topics });
  } catch (err) {
    console.error("topics GET error:", err);
    return NextResponse.json({ topics: [] });
  }
}
