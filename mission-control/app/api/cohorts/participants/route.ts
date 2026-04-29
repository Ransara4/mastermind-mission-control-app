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
  const db = new Database(DB_PATH, { readonly: false });
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
      instagram TEXT,
      linkedin TEXT,
      facebook TEXT,
      website TEXT,
      short_bio TEXT,
      business_desc TEXT,
      location TEXT,
      timezone TEXT,
      os TEXT,
      notes TEXT,
      tags TEXT,
      cohort_number INTEGER,
      nickname TEXT,
      what_they_want_to_learn TEXT,
      photo_url TEXT,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_airtable_id TEXT,
      offer_name TEXT,
      offer_description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      synced_at TEXT DEFAULT (datetime('now')),
      status TEXT,
      participants_added INTEGER DEFAULT 0,
      participants_updated INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS session_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      participant_id INTEGER,
      session_number INTEGER,
      attended INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed demo data if table is empty
  const count = (db.prepare("SELECT COUNT(*) as c FROM participants").get() as { c: number }).c;
  if (count === 0) {
    const seed = db.prepare(`
      INSERT INTO participants (airtable_id, first_name, last_name, full_name, email, short_bio, cohort_number, photo_url, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const demos = [
      ["at_alex",   "Alex",   "Johnson",   "Alex Johnson",   "alex@example.com",   "Full-stack developer building SaaS products",            1, "https://picsum.photos/seed/alex/100/100",   "Austin, TX"],
      ["at_maria",  "Maria",  "Santos",    "Maria Santos",   "maria@example.com",  "Digital marketing consultant for e-commerce brands",     1, "https://picsum.photos/seed/maria/100/100",  "Lisbon, Portugal"],
      ["at_david",  "David",  "Kim",       "David Kim",      "david@example.com",  "Product designer specializing in mobile UX",             1, "https://picsum.photos/seed/david/100/100",  "Seoul, South Korea"],
      ["at_sarah",  "Sarah",  "Williams",  "Sarah Williams", "sarah@example.com",  "Business coach helping solopreneurs scale",              2, "https://picsum.photos/seed/sarah/100/100",  "London, UK"],
      ["at_james",  "James",  "Chen",      "James Chen",     "james@example.com",  "AI automation specialist for small businesses",          2, "https://picsum.photos/seed/james/100/100",  "Vancouver, Canada"],
      ["at_emma",   "Emma",   "Rodriguez", "Emma Rodriguez", "emma@example.com",   "Content strategist and community builder",               2, "https://picsum.photos/seed/emma/100/100",   "Mexico City, Mexico"],
    ];
    for (const d of demos) seed.run(...d);

    // Seed a sync log entry
    db.prepare("INSERT INTO sync_log (status, participants_added, participants_updated) VALUES ('ok', 6, 0)").run();

    // Seed some attendance
    db.prepare("INSERT INTO session_attendance (participant_id, session_number, attended) VALUES (1,1,1),(2,1,1),(3,1,0),(4,1,1),(5,1,1),(6,1,0),(1,2,1),(2,2,1),(3,2,1),(4,2,0),(5,2,1),(6,2,1)").run();
  }
}

// GET /api/cohorts/participants
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

// PATCH /api/cohorts/participants
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
      "what_they_want_to_learn",
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

// PUT /api/cohorts/participants
// Replaces a participant's photo
export async function PUT(req: NextRequest) {
  try {
    const formData = await req.formData();
    const id = formData.get("id");
    const file = formData.get("photo") as File | null;

    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    if (!file) return NextResponse.json({ error: "photo required" }, { status: 400 });

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (!allowed.includes(ext)) {
      return NextResponse.json({ error: "unsupported file type" }, { status: 400 });
    }

    const db = getDb();
    const participant = db.prepare("SELECT full_name FROM participants WHERE id = ?").get(id) as { full_name: string } | undefined;
    if (!participant) { db.close(); return NextResponse.json({ error: "participant not found" }, { status: 404 }); }

    const safeName = participant.full_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "." + ext;
    const photosDir = path.join(WS, "mission-control/public/mastermind-participants");
    const filePath = path.join(photosDir, safeName);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filePath, buffer);

    const photoUrl = `/mastermind-participants/${safeName}`;
    db.prepare("UPDATE participants SET photo_url = ?, updated_at = datetime('now') WHERE id = ?").run(photoUrl, id);
    db.close();

    return NextResponse.json({ photo_url: photoUrl });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/cohorts/participants/sync
// Triggers a sync from Airtable
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body.action !== "sync") return NextResponse.json({ error: "unknown action" }, { status: 400 });

    const { execSync } = require("child_process");
    execSync(`node ${WS}/agents/mastermind-participants/sync.js`, {
      encoding: "utf8",
      timeout: 30000,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
