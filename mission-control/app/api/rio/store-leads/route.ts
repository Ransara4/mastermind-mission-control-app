import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "agents/store-leads/data/store-leads.db");
const AGENT_DIR = path.join(WS, "agents/store-leads");
const STATUS_PATH = path.join(AGENT_DIR, "status.json");
const LAST_EXPORT_PATH = path.join(AGENT_DIR, "data/last-export.json");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS search_criteria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  filters TEXT NOT NULL,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT UNIQUE NOT NULL,
  merchant_name TEXT,
  email TEXT,
  phone TEXT,
  country TEXT,
  est_annual_revenue_usd INTEGER,
  product_count INTEGER,
  employee_count INTEGER,
  whatsapp_signal INTEGER DEFAULT 0,
  apps_installed TEXT,
  social_accounts TEXT,
  disqualified INTEGER DEFAULT 0,
  disqualified_reason TEXT,
  raw_data TEXT,
  synced_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
`;

function getDb(readonly = false) {
  const exists = fs.existsSync(DB_PATH);
  const db = new Database(DB_PATH, readonly && exists ? { readonly: true } : {});
  if (!readonly || !exists) db.exec(SCHEMA);
  return db;
}

function seedDefaultCriteria(db: ReturnType<typeof getDb>) {
  const count = (db.prepare("SELECT COUNT(*) as c FROM search_criteria").get() as { c: number }).c;
  if (count > 0) return;
  db.prepare("INSERT INTO search_criteria (name, filters) VALUES (?, ?)").run(
    "Core ICP — WhatsApp Markets",
    JSON.stringify({
      countries: ["ID", "BR", "IN", "ZA", "NG", "AE", "SA", "MY"],
      revenue_min: 50000,
      revenue_max: 2000000,
      require_whatsapp_app: true,
      exclude_helpdesk_apps: true
    })
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") || "stores";

  try {
    if (action === "status") {
      if (fs.existsSync(STATUS_PATH)) {
        const data = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
        const lastExport = fs.existsSync(LAST_EXPORT_PATH)
          ? JSON.parse(fs.readFileSync(LAST_EXPORT_PATH, "utf8"))
          : null;
        const hasApiKey = !!process.env.STORELEADS_API_KEY;
        return NextResponse.json({ ...data, hasApiKey, lastExport });
      }
      return NextResponse.json({
        agentId: "store-leads",
        status: "idle",
        lastRun: null,
        lastMessage: "No sync run yet — API key not configured",
        hasApiKey: false,
        lastExport: null
      });
    }

    if (action === "criteria") {
      const db = getDb();
      seedDefaultCriteria(db);
      const rows = db.prepare("SELECT * FROM search_criteria ORDER BY id").all() as Array<{
        id: number; name: string; filters: string; enabled: number; created_at: string;
      }>;
      db.close();
      return NextResponse.json({ criteria: rows.map(r => ({ ...r, filters: JSON.parse(r.filters) })) });
    }

    // action === "stores" (default)
    const country = searchParams.get("country") || null;
    const minRevenue = searchParams.get("min_revenue") ? parseInt(searchParams.get("min_revenue")!) : null;
    const whatsappOnly = searchParams.get("whatsapp_only") === "1";

    const db = getDb(true);
    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ stores: [] });
    }
    let q = "SELECT * FROM stores WHERE disqualified=0";
    const params: (string | number)[] = [];
    if (country) { q += " AND country=?"; params.push(country); }
    if (minRevenue) { q += " AND est_annual_revenue_usd >= ?"; params.push(minRevenue); }
    if (whatsappOnly) { q += " AND whatsapp_signal=1"; }
    q += " ORDER BY est_annual_revenue_usd DESC, id DESC";
    const stores = (db.prepare(q).all(...params) as Array<Record<string, unknown>>).map(s => ({
      ...s,
      apps_installed: s.apps_installed ? JSON.parse(s.apps_installed as string) : [],
      social_accounts: s.social_accounts ? JSON.parse(s.social_accounts as string) : {}
    }));
    db.close();
    return NextResponse.json({ stores });
  } catch (err) {
    console.error("store-leads GET error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    if (action === "criteria") {
      const body = await req.json();
      const db = getDb();
      const result = db.prepare("INSERT INTO search_criteria (name, filters) VALUES (?, ?)").run(
        body.name,
        JSON.stringify(body.filters)
      );
      db.close();
      return NextResponse.json({ id: result.lastInsertRowid });
    }

    if (action === "export-sheets") {
      const out = execSync(`node ${AGENT_DIR}/src/index.js export-sheets`, {
        encoding: "utf8",
        cwd: AGENT_DIR,
        env: { ...process.env }
      });
      const urlMatch = out.match(/SHEET_URL:(.+)/);
      const url = urlMatch ? urlMatch[1].trim() : null;
      const lastExport = fs.existsSync(LAST_EXPORT_PATH)
        ? JSON.parse(fs.readFileSync(LAST_EXPORT_PATH, "utf8"))
        : null;
      return NextResponse.json({ ok: true, url, lastExport, output: out });
    }

    if (action === "sync") {
      const flags = await req.json().catch(() => ({}));
      const criteriaIdFlag = flags.criteriaId ? `--criteria-id ${flags.criteriaId}` : "";
      try {
        const out = execSync(`node ${AGENT_DIR}/src/index.js sync ${criteriaIdFlag}`, {
          encoding: "utf8",
          cwd: AGENT_DIR,
          env: { ...process.env },
          timeout: 60000
        });
        return NextResponse.json({ ok: true, output: out });
      } catch (err: unknown) {
        const execErr = err as { stdout?: string; stderr?: string; message?: string };
        const output = (execErr.stdout || "") + (execErr.stderr || "");
        const message = output.includes("STORELEADS_API_KEY")
          ? "API key not configured — add STORELEADS_API_KEY to .env to enable sync"
          : execErr.message || "Sync failed";
        return NextResponse.json({ ok: false, error: message, output }, { status: 422 });
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("store-leads POST error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const id = parseInt(searchParams.get("id") || "0");

  try {
    if (action === "criteria") {
      const db = getDb();
      db.prepare("DELETE FROM search_criteria WHERE id=?").run(id);
      db.close();
      return NextResponse.json({ ok: true });
    }

    if (action === "store") {
      const body = await req.json().catch(() => ({}));
      const db = getDb();
      db.prepare("UPDATE stores SET disqualified=1, disqualified_reason=? WHERE id=?").run(
        body.reason || null,
        id
      );
      db.close();
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("store-leads DELETE error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
