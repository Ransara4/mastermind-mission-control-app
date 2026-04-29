import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-participants.db");

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

// GET /api/cohorts/attendance?participant_id=X
// GET /api/cohorts/attendance?session_number=N&cohort_number=1
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const participantId = req.nextUrl.searchParams.get("participant_id");
    const sessionNumber = req.nextUrl.searchParams.get("session_number");
    const cohortNumber = req.nextUrl.searchParams.get("cohort_number") ?? "1";

    let attendance;

    if (participantId) {
      attendance = db.prepare(`
        SELECT sa.*, p.full_name, p.photo_url
        FROM session_attendance sa
        LEFT JOIN participants p ON p.id = sa.participant_id
        WHERE sa.participant_id = ?
        ORDER BY sa.cohort_number ASC, sa.session_number ASC
      `).all(participantId);
    } else if (sessionNumber) {
      attendance = db.prepare(`
        SELECT sa.*, p.full_name, p.photo_url
        FROM session_attendance sa
        LEFT JOIN participants p ON p.id = sa.participant_id
        WHERE sa.session_number = ? AND sa.cohort_number = ?
        ORDER BY p.full_name ASC
      `).all(sessionNumber, cohortNumber);
    } else {
      attendance = db.prepare(`
        SELECT sa.*, p.full_name, p.photo_url
        FROM session_attendance sa
        LEFT JOIN participants p ON p.id = sa.participant_id
        ORDER BY sa.cohort_number ASC, sa.session_number ASC, p.full_name ASC
      `).all();
    }

    db.close();
    return NextResponse.json({ attendance });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/cohorts/attendance (upsert)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      participant_id,
      session_number,
      cohort_number = 1,
      attended = 1,
      arrived_late = 0,
      hot_seat = 0,
      notes,
    } = body;

    if (!participant_id || session_number == null) {
      return NextResponse.json(
        { error: "participant_id and session_number required" },
        { status: 400 }
      );
    }

    const db = getDb();

    db.prepare(`
      INSERT INTO session_attendance (participant_id, session_number, cohort_number, attended, arrived_late, hot_seat, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(participant_id, session_number, cohort_number)
      DO UPDATE SET
        attended = excluded.attended,
        arrived_late = excluded.arrived_late,
        hot_seat = excluded.hot_seat,
        notes = excluded.notes
    `).run(
      participant_id,
      session_number,
      cohort_number,
      attended,
      arrived_late,
      hot_seat,
      notes ?? null
    );

    const record = db.prepare(`
      SELECT sa.*, p.full_name, p.photo_url
      FROM session_attendance sa
      LEFT JOIN participants p ON p.id = sa.participant_id
      WHERE sa.participant_id = ? AND sa.session_number = ? AND sa.cohort_number = ?
    `).get(participant_id, session_number, cohort_number);

    db.close();
    return NextResponse.json({ attendance: record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/cohorts/attendance?id=X
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM session_attendance WHERE id = ?").run(id);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
