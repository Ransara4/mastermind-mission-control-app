import Database from "better-sqlite3";
import path from "path";
import os from "os";
import fs from "fs";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const DB_PATH = path.join(WS, "data/websites.db");

const SCHEMA = `CREATE TABLE IF NOT EXISTS websites (
  domain TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  hosting TEXT DEFAULT '',
  base_url TEXT DEFAULT '',
  registrar TEXT DEFAULT '',
  entity TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  added_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  hosting_credentials TEXT DEFAULT '{}',
  search_console TEXT DEFAULT '{}',
  bing_webmaster TEXT DEFAULT '{}',
  analytics TEXT DEFAULT '{}',
  cdn TEXT DEFAULT '{}',
  dns TEXT DEFAULT '{}',
  tokens TEXT DEFAULT '{}',
  blog_settings TEXT DEFAULT '{}'
)`;

export interface WebsiteRow {
  domain: string; name: string; status: string; hosting: string;
  base_url: string; registrar: string; entity: string; notes: string;
  added_at: string; updated_at: string;
  hosting_credentials: string; search_console: string; bing_webmaster: string;
  analytics: string; cdn: string; dns: string; tokens: string;
  blog_enabled: number;
  seo_enabled: number;
  blog_settings: string;
  tech_stack: string;
  favicon_url: string;
  ssl_expiry: string;
  domain_expiry: string;
  monthly_visitors: number;
  primary_contact_email: string;
  last_published: string;
}

export function getWebsitesDb(readonly = true) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
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

export function getAllWebsites(): WebsiteRow[] {
  const db = getWebsitesDb();
  if (!db) return [];
  const rows = db.prepare("SELECT * FROM websites ORDER BY name").all() as WebsiteRow[];
  db.close();
  return rows;
}

export function getWebsite(domain: string): WebsiteRow | null {
  const db = getWebsitesDb();
  if (!db) return null;
  const row = db.prepare("SELECT * FROM websites WHERE domain = ?").get(domain) as WebsiteRow | undefined;
  db.close();
  return row || null;
}

// SEO compatibility: returns sites in the shape SEO routes expect
export function getWebsitesForSeo() {
  return getAllWebsites().map(w => {
    const creds = JSON.parse(w.hosting_credentials || '{}');
    const gsc = JSON.parse(w.search_console || '{}');
    return {
      domain: w.domain, name: w.name, status: w.status,
      addedAt: w.added_at, hosting: w.hosting, agent: w.hosting,
      notes: w.notes, gscPropertyUrl: gsc.property_url || '',
      wixSiteId: creds.site_id || '', wixApiKey: creds.api_key || '',
      wixAccountId: creds.account_id || '', clientId: w.entity || '',
    };
  });
}

export function migrateFromSitesJson() {
  const sitesPath = path.join(os.homedir(), "seo/sites.json");
  if (!fs.existsSync(sitesPath)) return;
  try {
    const sites = JSON.parse(fs.readFileSync(sitesPath, "utf-8"));
    const db = getWebsitesDb(false);
    if (!db) return;
    const insert = db.prepare(`INSERT OR IGNORE INTO websites
      (domain, name, status, hosting, base_url, notes, hosting_credentials, search_console)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const s of sites) {
      const creds: Record<string,string> = {};
      if (s.wixSiteId) creds.site_id = s.wixSiteId;
      if (s.wixApiKey) creds.api_key = s.wixApiKey;
      if (s.wixAccountId) creds.account_id = s.wixAccountId;
      const gsc: Record<string,string> = {};
      if (s.gscPropertyUrl) gsc.property_url = s.gscPropertyUrl;
      insert.run(
        s.domain, s.name || s.domain, s.status || 'active',
        s.hosting || '', `https://www.${s.domain}`,
        s.agent ? `Agent: ${s.agent}` : '',
        JSON.stringify(creds), JSON.stringify(gsc)
      );
    }
    db.close();
  } catch {}
}

export function ensureBlogColumns(): void {
  const db = getWebsitesDb(false);
  if (!db) return;
  const cols = db.prepare("PRAGMA table_info(websites)").all() as { name: string }[];
  const existing = new Set(cols.map((c: { name: string }) => c.name));
  const migrations: [string, string][] = [
    ["blog_enabled", "INTEGER DEFAULT 0"],
    ["seo_enabled", "INTEGER DEFAULT 0"],
    ["blog_settings", "TEXT DEFAULT '{}'"],
    ["tech_stack", "TEXT DEFAULT ''"],
    ["favicon_url", "TEXT DEFAULT ''"],
    ["ssl_expiry", "TEXT DEFAULT ''"],
    ["domain_expiry", "TEXT DEFAULT ''"],
    ["monthly_visitors", "INTEGER DEFAULT 0"],
    ["primary_contact_email", "TEXT DEFAULT ''"],
    ["last_published", "TEXT DEFAULT ''"],
  ];
  for (const [col, type] of migrations) {
    if (!existing.has(col)) {
      db.exec(`ALTER TABLE websites ADD COLUMN ${col} ${type}`);
    }
  }
  db.close();
}

export function getBlogEnabledWebsites(): WebsiteRow[] {
  const db = getWebsitesDb();
  if (!db) return [];
  const rows = db.prepare(
    "SELECT * FROM websites WHERE blog_enabled = 1 AND status = 'active' ORDER BY name"
  ).all() as WebsiteRow[];
  db.close();
  return rows;
}

export function getBlogSettings(domain: string): Record<string, unknown> {
  const site = getWebsite(domain);
  if (!site) return {};
  try {
    return JSON.parse(site.blog_settings || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}
