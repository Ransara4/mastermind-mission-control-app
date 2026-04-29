import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-participants.db");

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

// GET /api/online-program/participants
// Returns all participants with their offers, plus last sync time
export async function GET() {
  try {
    const db = getDb();

    const participants = db.prepare(`
      SELECT * FROM participants ORDER BY cohort_number ASC NULLS LAST, full_name ASC
    `).all();

    const offers = db.prepare(`
      SELECT * FROM offers ORDER BY offer_name ASC
    `).all();

    const lastSync = db.prepare(`
      SELECT synced_at, status, participants_added, participants_updated
      FROM sync_log WHERE status = 'ok' ORDER BY id DESC LIMIT 1
    `).get() as { synced_at: string; status: string; participants_added: number; participants_updated: number } | undefined;

    // Compute attendance summary per participant
    const maxSessionRow = db.prepare(
      "SELECT MAX(session_number) as max_session FROM session_attendance"
    ).get() as { max_session: number | null } | undefined;
    const sessionsTotal = maxSessionRow?.max_session ?? 0;

    const attendanceCounts = db.prepare(`
      SELECT participant_id, COUNT(*) as sessions_attended
      FROM session_attendance
      WHERE attended = 1
      GROUP BY participant_id
    `).all() as { participant_id: number; sessions_attended: number }[];

    const attendanceByParticipant: Record<number, number> = {};
    for (const row of attendanceCounts) {
      attendanceByParticipant[row.participant_id] = row.sessions_attended;
    }

    db.close();

    // Attach offers to participants
    const offersByParticipant: Record<string, typeof offers> = {};
    for (const offer of offers) {
      const pid = (offer as Record<string, unknown>).participant_airtable_id as string;
      if (!pid) continue;
      if (!offersByParticipant[pid]) offersByParticipant[pid] = [];
      offersByParticipant[pid].push(offer);
    }

    const enriched = participants.map((p) => {
      const row = p as Record<string, unknown>;
      const sessionsAttended = attendanceByParticipant[row.id as number] ?? 0;
      return {
        ...row,
        offers: offersByParticipant[row.airtable_id as string] ?? [],
        attendance_summary: {
          sessions_attended: sessionsAttended,
          sessions_total: sessionsTotal,
          attendance_rate: sessionsTotal > 0
            ? Math.round((sessionsAttended / sessionsTotal) * 100)
            : 0,
        },
      };
    });

    return NextResponse.json({ participants: enriched, lastSync: lastSync ?? null });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/online-program/participants
// Updates editable fields for a participant
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const allowed = [
      "first_name", "last_name", "full_name", "email",
      "instagram", "linkedin", "facebook", "website",
      "short_bio", "business_desc", "location", "timezone", "os",
      "notes", "tags", "cohort_number", "nickname",
    ];

    const setClauses = allowed
      .filter((k) => k in fields)
      .map((k) => `${k} = @${k}`)
      .join(", ");

    if (!setClauses) return NextResponse.json({ error: "no valid fields" }, { status: 400 });

    const db = getDb();
    const params: Record<string, unknown> = { id };
    for (const k of allowed) {
      if (k in fields) params[k] = fields[k] ?? null;
    }

    db.prepare(`UPDATE participants SET ${setClauses}, updated_at = datetime('now') WHERE id = @id`).run(params);
    const updated = db.prepare("SELECT * FROM participants WHERE id = ?").get(id);
    db.close();

    return NextResponse.json({ participant: updated });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/online-program/participants/sync
// Triggers a sync from Airtable
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action !== "sync") return NextResponse.json({ error: "unknown action" }, { status: 400 });

    const { execSync } = require("child_process");
    execSync(`node ${WS}/agents/online-program-participants/sync.js`, {
      encoding: "utf8",
      timeout: 30000,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
