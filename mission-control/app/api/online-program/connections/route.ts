import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-participants.db");

function getDb() {
  return new Database(DB_PATH, { readonly: false });
}

interface ConnectionRow {
  id: number;
  participant_a_id: number;
  participant_b_id: number;
  a_full_name: string;
  a_photo_url: string | null;
  b_full_name: string;
  b_photo_url: string | null;
  connection_type: string;
  description: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function formatConnection(row: ConnectionRow) {
  return {
    id: row.id,
    participant_a: {
      id: row.participant_a_id,
      full_name: row.a_full_name,
      photo_url: row.a_photo_url,
    },
    participant_b: {
      id: row.participant_b_id,
      full_name: row.b_full_name,
      photo_url: row.b_photo_url,
    },
    connection_type: row.connection_type,
    description: row.description,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const CONNECTION_QUERY = `
  SELECT
    c.id, c.participant_a_id, c.participant_b_id,
    pa.full_name AS a_full_name, pa.photo_url AS a_photo_url,
    pb.full_name AS b_full_name, pb.photo_url AS b_photo_url,
    c.connection_type, c.description, c.status,
    c.created_at, c.updated_at
  FROM connections c
  LEFT JOIN participants pa ON pa.id = c.participant_a_id
  LEFT JOIN participants pb ON pb.id = c.participant_b_id
`;

// GET /api/online-program/connections?participant_id=X
export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const participantId = req.nextUrl.searchParams.get("participant_id");

    let rows: ConnectionRow[];
    if (participantId) {
      rows = db.prepare(
        `${CONNECTION_QUERY} WHERE c.participant_a_id = ? OR c.participant_b_id = ? ORDER BY c.created_at DESC`
      ).all(participantId, participantId) as ConnectionRow[];
    } else {
      rows = db.prepare(
        `${CONNECTION_QUERY} ORDER BY c.created_at DESC`
      ).all() as ConnectionRow[];
    }

    db.close();
    return NextResponse.json({ connections: rows.map(formatConnection) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/online-program/connections
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { participant_a_id, participant_b_id, connection_type, description } = body;

    if (!participant_a_id || !participant_b_id) {
      return NextResponse.json({ error: "participant_a_id and participant_b_id required" }, { status: 400 });
    }

    const db = getDb();
    const result = db.prepare(`
      INSERT INTO connections (participant_a_id, participant_b_id, connection_type, description)
      VALUES (?, ?, ?, ?)
    `).run(
      participant_a_id,
      participant_b_id,
      connection_type ?? "introduction",
      description ?? null
    );

    const row = db.prepare(
      `${CONNECTION_QUERY} WHERE c.id = ?`
    ).get(result.lastInsertRowid) as ConnectionRow;

    db.close();
    return NextResponse.json({ connection: formatConnection(row) }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/online-program/connections
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const allowed = ["connection_type", "description", "status"];
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

    db.prepare(
      `UPDATE connections SET ${setClauses}, updated_at = datetime('now') WHERE id = @id`
    ).run(params);

    const row = db.prepare(
      `${CONNECTION_QUERY} WHERE c.id = ?`
    ).get(id) as ConnectionRow;

    db.close();
    return NextResponse.json({ connection: formatConnection(row) });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/online-program/connections?id=X
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const db = getDb();
    db.prepare("DELETE FROM connections WHERE id = ?").run(id);
    db.close();

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
