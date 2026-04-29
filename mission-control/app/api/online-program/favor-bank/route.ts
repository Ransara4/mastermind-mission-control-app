import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-participants.db");
function getDb() {
  return new Database(DB_PATH);
}

// GET — all deals with computed balances + participant info
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

// POST — add a ledger entry (credit, debit, hours_used, item_received)
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
