import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/manychat-giveaways.db");

function ensureSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS giveaways (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_keyword TEXT UNIQUE NOT NULL,
      giveaway_name TEXT NOT NULL,
      giveaway_description TEXT,
      giveaway_link TEXT,
      dynamic_tag TEXT NOT NULL CHECK(dynamic_tag IN ('Alignment_Funnel', 'Career_Funnel')),
      manychat_flow_id TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'archived', 'draft')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      giveaway_id INTEGER,
      action TEXT,
      result TEXT,
      error TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrate existing table: add 'draft' status and make giveaway_link nullable
  const tableSql = (db.prepare(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='giveaways'"
  ).get() as { sql: string } | undefined)?.sql ?? "";

  if (tableSql && !tableSql.includes("'draft'")) {
    db.exec(`
      CREATE TABLE giveaways_v2 (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comment_keyword TEXT UNIQUE NOT NULL,
        giveaway_name TEXT NOT NULL,
        giveaway_description TEXT,
        giveaway_link TEXT,
        dynamic_tag TEXT NOT NULL CHECK(dynamic_tag IN ('Alignment_Funnel', 'Career_Funnel')),
        manychat_flow_id TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'archived', 'draft')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      INSERT INTO giveaways_v2 SELECT * FROM giveaways;
      DROP TABLE giveaways;
      ALTER TABLE giveaways_v2 RENAME TO giveaways;
    `);
  }
}

let schemaReady = false;

export function getDb(): Database.Database {
  const db = new Database(DB_PATH, { readonly: false });
  if (!schemaReady) {
    ensureSchema(db);
    schemaReady = true;
  }
  return db;
}

export function logSync(
  db: Database.Database,
  giveawayId: number | null,
  action: string,
  result: string,
  error?: string
): void {
  db.prepare(
    "INSERT INTO sync_log (giveaway_id, action, result, error) VALUES (?, ?, ?, ?)"
  ).run(giveawayId, action, result, error ?? null);
}

export function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envPath = path.join(WS, ".env");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match) {
      process.env[key] = match[1].trim();
      return match[1].trim();
    }
  } catch {
    /* ignore */
  }
  return "";
}
