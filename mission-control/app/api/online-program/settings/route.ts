import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-blog.db");

const SCHEMA = `CREATE TABLE IF NOT EXISTS blog_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
)`;

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.exec(SCHEMA);
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) db.exec(SCHEMA);
  return db;
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ settings: {} });

    const rows = db.prepare("SELECT key, value FROM blog_settings").all() as { key: string; value: string }[];
    db.close();

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("online-program settings GET error:", err);
    return NextResponse.json({ settings: {} });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = body.updates;
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "updates object is required" }, { status: 400 });
    }

    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    const stmt = db.prepare(
      `INSERT INTO blog_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    const upsertMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        stmt.run(key, String(value));
      }
    });

    upsertMany(Object.entries(updates));
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("online-program settings PUT error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
