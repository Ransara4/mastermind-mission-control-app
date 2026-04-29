import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-participants.db");

function ensureDir(p: string) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getDb() {
  ensureDir(DB_PATH);
  const db = new Database(DB_PATH);
  initTables(db);
  return db;
}

function initTables(db: InstanceType<typeof Database>) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      airtable_id TEXT,
      first_name TEXT,
      last_name TEXT,
      full_name TEXT,
      email TEXT,
      photo_url TEXT,
      cohort_number INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS favor_deals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER NOT NULL,
      deal_name TEXT,
      deal_description TEXT,
      active INTEGER DEFAULT 1,
      item_received INTEGER DEFAULT 0,
      monthly_credit_cents INTEGER DEFAULT 0,
      monthly_hours REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS favor_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deal_id INTEGER NOT NULL,
      participant_id INTEGER NOT NULL,
      entry_type TEXT NOT NULL,
      amount_cents INTEGER DEFAULT 0,
      hours REAL DEFAULT 0,
      description TEXT,
      period TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const count = (db.prepare("SELECT COUNT(*) as c FROM favor_deals").get() as { c: number }).c;
  if (count === 0) {
    const pCount = (db.prepare("SELECT COUNT(*) as c FROM participants").get() as { c: number }).c;
    if (pCount > 0) {
      const seedDeal = db.prepare("INSERT INTO favor_deals (participant_id, deal_name, deal_description, active, item_received, monthly_credit_cents) VALUES (?, ?, ?, 1, ?, ?)");
      const seedLedger = db.prepare("INSERT INTO favor_ledger (deal_id, participant_id, entry_type, amount_cents, description, period) VALUES (?, ?, ?, ?, ?, ?)");

      seedDeal.run(1, "Podcast Introduction", "Introduced Sarah to podcast host", 0, 5000);
      seedLedger.run(1, 1, "credit", 5000, "Introduced Sarah to podcast host", "2026-03");

      seedDeal.run(2, "Landing Page Share", "Shared David's landing page with her audience", 0, 3000);
      seedLedger.run(2, 2, "credit", 3000, "Shared David's landing page with 2k newsletter subscribers", "2026-03");

      seedDeal.run(5, "Automation Audit", "Free automation audit for group members", 0, 0);
      seedLedger.run(3, 5, "credit", 0, "Provided free automation audit for Emma's business", "2026-02");

      seedDeal.run(6, "Social Media Templates", "Created custom social templates for the group", 1, 7500);
      seedLedger.run(4, 6, "credit", 7500, "Designed 10 custom social media templates for the group", "2026-03");
    }
  }
}

// GET -- all deals with computed balances + participant info
export async function GET() {
  try {
    const db = getDb();
    const deals = db
      .prepare(
        `SELECT
        d.*,
        p.full_name, p.first_name, p.last_name, p.email, p.photo_url,
        COALESCE((SELECT SUM(amount_cents) FROM favor_ledger WHERE deal_id=d.id AND entry_type='credit'),0) as total_credited_cents,
        COALESCE((SELECT SUM(amount_cents) FROM favor_ledger WHERE deal_id=d.id AND entry_type='debit'),0) as total_spent_cents,
        COALESCE((SELECT SUM(hours) FROM favor_ledger WHERE deal_id=d.id AND entry_type='hours_credit'),0) as total_hours_credited,
        COALESCE((SELECT SUM(hours) FROM favor_ledger WHERE deal_id=d.id AND entry_type='hours_used'),0) as total_hours_used,
        (SELECT COUNT(*) FROM favor_ledger WHERE deal_id=d.id AND entry_type='credit') as months_accrued
      FROM favor_deals d
      JOIN participants p ON p.id = d.participant_id
      WHERE d.active = 1
      ORDER BY p.full_name`
      )
      .all();

    const ledger = db
      .prepare(
        `SELECT l.*, p.full_name
      FROM favor_ledger l
      JOIN participants p ON p.id = l.participant_id
      ORDER BY l.created_at DESC
      LIMIT 50`
      )
      .all();

    db.close();
    return NextResponse.json({ deals, ledger });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST -- add a ledger entry (credit, debit, hours_used, item_received)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();

    // Handle item_received update
    if (body.action === "mark_item_received") {
      db.prepare(
        `UPDATE favor_deals SET item_received = 1, updated_at = datetime('now') WHERE id = ?`
      ).run(body.deal_id);
      db.prepare(
        `INSERT INTO favor_ledger (deal_id, participant_id, entry_type, description) VALUES (?, ?, 'item_received', ?)`
      ).run(body.deal_id, body.participant_id, body.description || "Item received");
      db.close();
      return NextResponse.json({ ok: true });
    }

    const result = db
      .prepare(
        `INSERT INTO favor_ledger (deal_id, participant_id, entry_type, amount_cents, hours, description, period)
      VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.deal_id,
        body.participant_id,
        body.entry_type,
        body.amount_cents || 0,
        body.hours || 0,
        body.description,
        body.period || null
      );

    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
