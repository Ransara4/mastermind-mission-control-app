import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/cold-outreach.db");

const ICP_BASE = path.join(WS, "projects/mastermind/cold-outreach/icps");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS icps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icp_tag TEXT NOT NULL,
  target_profile TEXT,
  niche_categories TEXT,
  qualification_rules TEXT,
  track_definitions TEXT,
  hook_template_id TEXT,
  total_leads INTEGER DEFAULT 0,
  total_qualified INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batches (
  id TEXT PRIMARY KEY,
  icp_id TEXT,
  icp_tag TEXT,
  created_at TEXT,
  candidates_searched INTEGER DEFAULT 0,
  emails_verified INTEGER DEFAULT 0,
  qualified INTEGER DEFAULT 0,
  disqualified INTEGER DEFAULT 0,
  track_a INTEGER DEFAULT 0,
  track_b INTEGER DEFAULT 0,
  uploaded INTEGER DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (icp_id) REFERENCES icps(id)
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  icp_id TEXT,
  status TEXT DEFAULT 'pending',
  started_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  results TEXT,
  error TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

export { ICP_BASE };

const VALID_ICP_ID = /^[a-zA-Z0-9_-]+$/;

export function validateIcpId(id: string): boolean {
  return VALID_ICP_ID.test(id) && !id.includes("..");
}

export function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    seedFromFiles(db);
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) {
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    // Migrate: add Instantly columns if missing
    try { db.exec("ALTER TABLE batches ADD COLUMN instantly_campaign_id TEXT"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE batches ADD COLUMN instantly_uploaded_at TEXT"); } catch { /* already exists */ }
    try { db.exec("ALTER TABLE batches ADD COLUMN instantly_upload_count INTEGER DEFAULT 0"); } catch { /* already exists */ }
  }
  return db;
}

function seedFromFiles(db: Database.Database) {
  try {
    if (!fs.existsSync(ICP_BASE)) return;
    const icpDirs = fs.readdirSync(ICP_BASE).filter((d) => {
      const fullPath = path.join(ICP_BASE, d);
      return (
        fs.statSync(fullPath).isDirectory() &&
        fs.existsSync(path.join(fullPath, "icp.json"))
      );
    });

    const insertIcp = db.prepare(`
      INSERT OR IGNORE INTO icps (id, name, description, icp_tag, target_profile, niche_categories, qualification_rules, track_definitions, hook_template_id, total_leads, total_qualified, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const dir of icpDirs) {
      const icpData = JSON.parse(
        fs.readFileSync(path.join(ICP_BASE, dir, "icp.json"), "utf-8")
      );
      insertIcp.run(
        icpData.icp_id || dir,
        icpData.icp_name || icpData.name || dir,
        icpData.description || "",
        icpData.icp_tag || dir,
        JSON.stringify(icpData.target_profile || {}),
        JSON.stringify(
          icpData.niche_categories_searched || icpData.search_niches || []
        ),
        JSON.stringify(icpData.qualification_rules || {}),
        JSON.stringify(icpData.track_definitions || {}),
        icpData.hook_template || `hook_template_${dir.replace("icp_", "")}`,
        icpData.total_leads_generated || 0,
        icpData.total_qualified || 0,
        icpData.created || new Date().toISOString().split("T")[0]
      );
    }

    // Seed batches from batch summary JSON files
    const batchDir = path.join(ICP_BASE, "..", "batches");
    if (fs.existsSync(batchDir)) {
      const insertBatch = db.prepare(`
        INSERT OR IGNORE INTO batches (id, icp_id, icp_tag, created_at, candidates_searched, emails_verified, qualified, disqualified, track_a, track_b, uploaded, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const batchFiles = fs
        .readdirSync(batchDir)
        .filter((f) => f.endsWith(".json"));
      for (const file of batchFiles) {
        const batch = JSON.parse(
          fs.readFileSync(path.join(batchDir, file), "utf-8")
        );
        insertBatch.run(
          batch.batch_id || file.replace("_summary.json", ""),
          batch.icp_used || null,
          batch.icp_used || null,
          batch.created || null,
          batch.candidates_searched || 0,
          batch.emails_verified || 0,
          batch.qualified || 0,
          batch.disqualified || 0,
          batch.track_a || 0,
          batch.track_b || 0,
          batch.uploaded_to_campaign || batch.uploaded_to_list || 0,
          batch.notes || null
        );
      }
    }
  } catch (err) {
    console.error("Cold outreach seed error:", err);
  }
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
