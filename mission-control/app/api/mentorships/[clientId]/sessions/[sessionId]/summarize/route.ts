import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { readDB, writeDB, nowISO } from "@/lib/mentorships-db";

const execFileAsync = promisify(execFile);

interface RouteContext {
  params: Promise<{ clientId: string; sessionId: string }>;
}

// POST /api/mentorships/[clientId]/sessions/[sessionId]/summarize
export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { clientId, sessionId } = await context.params;
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

    const session = db.sessions[idx];

    // Load transcript
    let transcript = session.transcript_raw || "";
    if (session.transcript_file && !transcript) {
      try {
        transcript = await fs.readFile(session.transcript_file, "utf-8");
      } catch {
        return NextResponse.json(
          { error: "Transcript file not found" },
          { status: 404 }
        );
      }
    }

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript available for this session" },
        { status: 400 }
      );
    }

    const prompt = [
      "Summarize this mentorship session transcript.",
      "Extract:",
      "(1) key points discussed as a JSON array of strings,",
      "(2) follow-up tasks specifically for the client as a JSON array of strings (client_follow_ups),",
      "(3) follow-up tasks specifically for Joe (the mentor) as a JSON array of strings (joe_follow_ups),",
      "(4) general follow-up items that apply to both or are not clearly assigned as a JSON array of strings (follow_up_items),",
      "(5) profile notes about the client's progress and state of mind as a single string.",
      'Return ONLY valid JSON in this format: {"ai_summary": "...", "key_points": [...], "client_follow_ups": [...], "joe_follow_ups": [...], "follow_up_items": [...], "profile_notes": "..."}',
    ].join(" ");

    const { stdout } = await execFileAsync(
      "claude",
      ["-p", prompt],
      {
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024,
        timeout: 120_000,
        input: transcript,
      } as any
    );

    // Extract JSON from the response (may have markdown fences)
    let jsonStr = String(stdout).trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: jsonStr },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    db.sessions[idx].ai_summary = parsed.ai_summary || "";
    db.sessions[idx].key_points = parsed.key_points || [];
    db.sessions[idx].follow_ups = parsed.client_follow_ups || parsed.follow_ups || [];
    db.sessions[idx].client_follow_ups = parsed.client_follow_ups || [];
    db.sessions[idx].joe_follow_ups = parsed.joe_follow_ups || [];
    db.sessions[idx].follow_up_items = parsed.follow_up_items || [];
    db.sessions[idx].profile_notes = parsed.profile_notes || "";
    db.sessions[idx].updated_at = nowISO();

    await writeDB(db);

    return NextResponse.json({ session: db.sessions[idx] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
