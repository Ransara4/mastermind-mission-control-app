import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { readDB, writeDB, nowISO } from "@/lib/mentorships-db";

interface RouteContext {
  params: Promise<{ clientId: string; sessionId: string }>;
}

// GET /api/mentorships/[clientId]/sessions/[sessionId]
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
    const db = await readDB();

    const session = db.sessions.find(
      (s) => s.id === sessionId && s.client_id === clientId
    );
    if (!session) {
      return NextResponse.json(
        { error: `Session "${sessionId}" not found` },
        { status: 404 }
      );
    }

    // Load transcript from file if available
    let transcript = session.transcript_raw || "";
    if (session.transcript_file && !transcript) {
      try {
        transcript = await fs.readFile(session.transcript_file, "utf-8");
      } catch {
        // Transcript file may not exist yet
      }
    }

    const client = db.clients.find((c) => c.id === clientId) || null;

    return NextResponse.json({
      client,
      session: { ...session, transcript_raw: transcript },
      transcript,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PUT /api/mentorships/[clientId]/sessions/[sessionId]
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
    const body = await request.json();
    const db = await readDB();

    const idx = db.sessions.findIndex(
      (s) => s.id === sessionId && s.client_id === clientId
    );
    if (idx === -1) {
      return NextResponse.json(
        { error: `Session "${sessionId}" not found` },
        { status: 404 }
      );
    }

    const updatable = [
      "date",
      "type",
      "duration_minutes",
      "hours_logged",
      "zoom_recording_url",
      "internal_video_url",
      "transcript_file",
      "transcript_raw",
      "ai_summary",
      "session_goals",
      "session_preparation",
      "key_points",
      "follow_ups",
      "joe_follow_ups",
      "joe_follow_ups_done",
      "client_follow_ups",
      "client_follow_ups_done",
      "follow_up_items",
      "profile_notes",
      "pdf_path",
      "pdf_sent",
      "whatsapp_sent",
      "status",
      "next_session_notes",
      "pipeline_status",
    ];

    for (const field of updatable) {
      if (field in body) {
        (db.sessions[idx] as any)[field] = body[field];
      }
    }
    db.sessions[idx].updated_at = nowISO();

    // If hours_logged changed, recalculate client stats
    if ("hours_logged" in body || "status" in body) {
      const clientIdx = db.clients.findIndex((c) => c.id === clientId);
      if (clientIdx !== -1) {
        const completedSessions = db.sessions.filter(
          (s) => s.client_id === clientId && s.status === "completed"
        );
        const hoursUsed = completedSessions.reduce(
          (sum, s) => sum + s.hours_logged,
          0
        );
        db.clients[clientIdx].hours_used = hoursUsed;
        db.clients[clientIdx].hours_remaining =
          db.clients[clientIdx].hours_purchased - hoursUsed;
        db.clients[clientIdx].updated_at = nowISO();
      }
    }

    await writeDB(db);
    return NextResponse.json({ session: db.sessions[idx] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
