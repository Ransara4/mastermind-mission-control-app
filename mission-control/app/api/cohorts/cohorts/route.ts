import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-participants.db");

function getDb() {
  return new Database(DB_PATH);
}

// GET /api/cohorts/cohorts
export async function GET() {
  try {
    const db = getDb();
    const cohorts = db.prepare(`
      SELECT * FROM cohorts ORDER BY number ASC
    `).all();

    // Get participant counts per cohort
    const counts = db.prepare(`
      SELECT cohort_number, COUNT(*) as count
      FROM participants
      WHERE cohort_number IS NOT NULL
      GROUP BY cohort_number
    `).all() as { cohort_number: number; count: number }[];

    const countMap: Record<number, number> = {};
    for (const c of counts) {
      countMap[c.cohort_number] = c.count;
    }

    const result = (cohorts as any[]).map((c) => ({
      ...c,
      participant_count: countMap[c.number] || 0,
    }));

    db.close();
    return NextResponse.json({ cohorts: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/cohorts/cohorts — create a new cohort
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO cohorts (number, name, start_date, session_day, session_time, timezone, zoom_link, zoom_meeting_id, whatsapp_group_link, notes, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      body.number, body.name, body.start_date || null,
      body.session_day || null, body.session_time || null,
      body.timezone || "Asia/Makassar",
      body.zoom_link || null, body.zoom_meeting_id || null,
      body.whatsapp_group_link || null, body.notes || null,
      body.status || "upcoming"
    );
    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/cohorts/cohorts — update a cohort
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = getDb();
    const allowed = [
      "number", "name", "start_date", "session_day", "session_time",
      "timezone", "zoom_link", "zoom_meeting_id", "whatsapp_group_link",
      "notes", "status",
    ];
    const updates = Object.keys(fields).filter((k) => allowed.includes(k));
    if (updates.length === 0) return NextResponse.json({ error: "no valid fields" }, { status: 400 });

    const sql = `UPDATE cohorts SET ${updates.map((k) => `${k} = ?`).join(", ")}, updated_at = datetime('now') WHERE id = ?`;
    db.prepare(sql).run(...updates.map((k) => fields[k]), id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
