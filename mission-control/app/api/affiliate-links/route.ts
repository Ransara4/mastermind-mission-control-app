import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/affiliate-links.db");

const SCHEMA = `CREATE TABLE IF NOT EXISTS affiliates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_name TEXT NOT NULL,
  referral_link TEXT,
  referral_code TEXT,
  category TEXT,
  commission_info TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
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
    if (!db) return NextResponse.json({ links: [] });
    const links = db.prepare("SELECT * FROM affiliates ORDER BY category, program_name").all();
    db.close();
    return NextResponse.json({ links });
  } catch (err) {
    console.error("affiliate-links GET error:", err);
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });
    const stmt = db.prepare(
      `INSERT INTO affiliates (program_name, referral_link, referral_code, category, commission_info, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    );
    const result = stmt.run(
      body.program_name, body.referral_link || null, body.referral_code || null,
      body.category || null, body.commission_info || null,
      body.status || "active", body.notes || null
    );
    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("affiliate-links POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });
    db.prepare(
      `UPDATE affiliates SET program_name=?, referral_link=?, referral_code=?, category=?, commission_info=?, status=?, notes=?, updated_at=datetime('now')
       WHERE id=?`
    ).run(
      body.program_name, body.referral_link || null, body.referral_code || null,
      body.category || null, body.commission_info || null,
      body.status || "active", body.notes || null, body.id
    );
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("affiliate-links PUT error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });
    db.prepare("DELETE FROM affiliates WHERE id=?").run(id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("affiliate-links DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
