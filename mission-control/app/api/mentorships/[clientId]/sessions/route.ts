import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "projects/mentorships/mentorships-db.json");

async function readDB() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDB(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  try {
    const body = await request.json();
    const {
      date,
      start_time_bali,
      type,
      duration_minutes,
      hours_logged,
      session_preparation,
      session_goals,
      profile_notes,
      zoom_recording_url,
      internal_video_url,
      status,
    } = body;

    const db = await readDB();

    const client = db.clients?.find((c: any) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!db.sessions) {
      db.sessions = [];
    }

    const clientSessions = db.sessions.filter(
      (s: any) => s.client_id === clientId
    );
    const sessionNumber = clientSessions.length + 1;

    const session = {
      id: `session-${Date.now()}`,
      client_id: clientId,
      session_number: sessionNumber,
      date: date ?? new Date().toISOString().split("T")[0],
      type: type ?? "coaching",
      duration_minutes: duration_minutes ?? 60,
      hours_logged: hours_logged ?? 1,
      start_time_bali: start_time_bali ?? null,
      session_preparation: session_preparation ?? "",
      session_goals: session_goals ?? "",
      profile_notes: profile_notes ?? "",
      zoom_recording_url: zoom_recording_url ?? "",
      internal_video_url: internal_video_url ?? "",
      status: status ?? "completed",
      key_points: [],
      follow_ups: [],
      action_items: [],
      resources_shared: [],
      pipeline_status: {
        recording_downloaded: false,
        transcript_generated: false,
        summary_created: false,
        notes_sent: false,
        crm_updated: false,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.sessions.push(session);

    const clientIndex = db.clients.findIndex((c: any) => c.id === clientId);
    const now = new Date().toISOString();
    db.clients[clientIndex].hours_used =
      (db.clients[clientIndex].hours_used ?? 0) + (hours_logged ?? 1);
    db.clients[clientIndex].hours_remaining =
      (db.clients[clientIndex].hours_remaining ?? 0) - (hours_logged ?? 1);
    db.clients[clientIndex].last_session_date =
      date ?? new Date().toISOString().split("T")[0];
    db.clients[clientIndex].updated_at = now;

    await writeDB(db);

    return NextResponse.json({ success: true, session }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
