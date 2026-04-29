import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-participants.db");

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

// GET /api/online-program/offers?participant_id=X
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const participantId = req.nextUrl.searchParams.get("participant_id");

    let offers;
    if (participantId) {
      // Look up participant's airtable_id, then filter offers
      const participant = db.prepare(
        "SELECT airtable_id FROM participants WHERE id = ?"
      ).get(participantId) as { airtable_id: string } | undefined;

      if (!participant) {
        db.close();
        return NextResponse.json({ error: "participant not found" }, { status: 404 });
      }

      offers = db.prepare(
        "SELECT * FROM offers WHERE participant_airtable_id = ? ORDER BY offer_name ASC"
      ).all(participant.airtable_id);
    } else {
      offers = db.prepare("SELECT * FROM offers ORDER BY offer_name ASC").all();
    }

    db.close();
    return NextResponse.json({ offers });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/online-program/offers
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participant_airtable_id, offer_name, offer_description, discount, offer_category_ai } = body;

    if (!participant_airtable_id || !offer_name) {
      return NextResponse.json({ error: "participant_airtable_id and offer_name required" }, { status: 400 });
    }

    const db = getDb();
    const airtableId = `manual_${Date.now()}`;

    const result = db.prepare(`
      INSERT INTO offers (airtable_id, participant_airtable_id, offer_name, offer_description, discount, offer_category_ai, created_by, synced_at)
      VALUES (?, ?, ?, ?, ?, ?, 'manual', datetime('now'))
    `).run(
      airtableId,
      participant_airtable_id,
      offer_name,
      offer_description ?? null,
      discount ?? null,
      offer_category_ai ?? null
    );

    const offer = db.prepare("SELECT * FROM offers WHERE id = ?").get(result.lastInsertRowid);
    db.close();

    return NextResponse.json({ offer }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/online-program/offers?id=X
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM offers WHERE id = ?").run(id);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
