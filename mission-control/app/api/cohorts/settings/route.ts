import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-blog.db");

const SCHEMA = `CREATE TABLE IF NOT EXISTS blog_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
)`;

const SCHEMA_V2 = `CREATE TABLE IF NOT EXISTS blog_settings_v2 (
  site_domain TEXT NOT NULL DEFAULT 'mastermindshq.business',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (site_domain, key)
)`;

function migrateSettingsV2(db: InstanceType<typeof Database>) {
  // Create v2 table if missing, migrate existing rows
  db.exec(SCHEMA_V2);
  try {
    const rows = db.prepare("SELECT key, value, updated_at FROM blog_settings").all() as { key: string; value: string; updated_at: string }[];
    if (rows.length > 0) {
      const insert = db.prepare(
        `INSERT OR IGNORE INTO blog_settings_v2 (site_domain, key, value, updated_at) VALUES (?, ?, ?, ?)`
      );
      for (const row of rows) {
        insert.run("mastermindshq.business", row.key, row.value, row.updated_at);
      }
    }
  } catch {}
}

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.exec(SCHEMA);
    db.exec(SCHEMA_V2);
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) {
    db.exec(SCHEMA);
    migrateSettingsV2(db);
  }
  return db;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ settings: {} });

    const url = new URL(req.url);
    const siteDomain = url.searchParams.get("site_domain") || "mastermindshq.business";

    // Try v2 table first, fall back to legacy
    let rows: { key: string; value: string }[];
    try {
      rows = db.prepare("SELECT key, value FROM blog_settings_v2 WHERE site_domain = ?").all(siteDomain) as { key: string; value: string }[];
    } catch {
      rows = db.prepare("SELECT key, value FROM blog_settings").all() as { key: string; value: string }[];
    }
    db.close();

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("cohorts settings GET error:", err);
    return NextResponse.json({ settings: {} });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = body.updates;
    const siteDomain = body.site_domain || "mastermindshq.business";
    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "updates object is required" }, { status: 400 });
    }

    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    // Write to v2 table (composite PK)
    const stmt = db.prepare(
      `INSERT INTO blog_settings_v2 (site_domain, key, value, updated_at) VALUES (?, ?, ?, datetime('now'))
       ON CONFLICT(site_domain, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    // Also keep legacy table in sync for backward compatibility
    const legacyStmt = db.prepare(
      `INSERT INTO blog_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    );

    const upsertMany = db.transaction((entries: [string, string][]) => {
      for (const [key, value] of entries) {
        stmt.run(siteDomain, key, String(value));
        if (siteDomain === "mastermindshq.business") {
          legacyStmt.run(key, String(value));
        }
      }
    });

    upsertMany(Object.entries(updates));
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("cohorts settings PUT error:", err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
