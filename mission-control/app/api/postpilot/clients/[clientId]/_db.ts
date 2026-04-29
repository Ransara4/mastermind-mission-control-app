import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DATA_DIR = path.join(WS, "agents/postpilot/data");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE,
  excerpt TEXT,
  content_markdown TEXT,
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  cta_type TEXT,
  internal_links TEXT DEFAULT '[]',
  quality_score INTEGER,
  quality_notes TEXT,
  status TEXT DEFAULT 'needs_review',
  topic_source TEXT,
  content_pillar TEXT,
  word_count INTEGER,
  target_segment TEXT,
  image_keywords TEXT,
  cover_image_url TEXT,
  rejection_reason TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE IF NOT EXISTS discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  description TEXT,
  why_it_matters TEXT,
  content_category TEXT,
  tags TEXT DEFAULT '[]',
  audience_relevance_score INTEGER,
  confidence_score INTEGER,
  keywords TEXT DEFAULT '[]',
  content_opportunity TEXT,
  status TEXT DEFAULT 'active',
  date_discovered TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS research_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'manual',
  signal_strength INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  times_used INTEGER DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now'))
);
`;

export function getClientDb(clientId: string, readonly = true) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const dbPath = path.join(DATA_DIR, `${clientId}.db`);
  // Always open writable to ensure schema is initialized
  const db = new Database(dbPath);
  db.exec(SCHEMA);
  if (readonly) {
    db.close();
    return new Database(dbPath, { readonly: true });
  }
  return db;
}

export function getClientConfig(clientId: string): Record<string, unknown> | null {
  const listPath = path.join(DATA_DIR, "clients.json");
  try {
    const raw = fs.readFileSync(listPath, "utf-8");
    const clients = JSON.parse(raw) as Array<{ id: string }>;
    return (clients.find((c) => c.id === clientId) as Record<string, unknown>) ?? null;
  } catch {
    return null;
  }
}

export function updateClientConfig(clientId: string, updates: Record<string, unknown>): boolean {
  const listPath = path.join(DATA_DIR, "clients.json");
  try {
    const raw = fs.readFileSync(listPath, "utf-8");
    const clients = JSON.parse(raw) as Array<{ id: string }>;
    const idx = clients.findIndex((c) => c.id === clientId);
    if (idx === -1) return false;
    clients[idx] = { ...clients[idx], ...updates };
    fs.writeFileSync(listPath, JSON.stringify(clients, null, 2));
    return true;
  } catch {
    return false;
  }
}
