// GET /api/cohorts/wrap-up/clips-list?session=3
// Returns list of .mp4 files in clips/instagram/ folder for the given session.
// Also reads instagram-queue.json to get posted/queued status for each clip.
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const MASTERMIND_BASE = `${WS}/projects/mastermind`;
const QUEUE_FILE = `${MASTERMIND_BASE}/instagram-queue.json`;

export async function GET(request: NextRequest) {
  const session = request.nextUrl.searchParams.get("session");
  if (!session) return NextResponse.json({ error: "session required" }, { status: 400 });

  const folderPath = path.join(MASTERMIND_BASE, `cohort-1/sessions/session-${session}/clips/instagram`);

  let files: string[] = [];
  if (fs.existsSync(folderPath)) {
    files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".mp4")).sort();
  }

  // Read queue status
  let posted: string[] = [];
  let queued: string[] = [];
  if (fs.existsSync(QUEUE_FILE)) {
    try {
      const q = JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8"));
      posted = (q.posted || [])
        .filter((e: { session: unknown; file: string }) => String(e.session) === String(session))
        .map((e: { file: string }) => e.file);
      queued = (q.queue || [])
        .filter((e: { session: unknown; file: string }) => String(e.session) === String(session))
        .map((e: { file: string }) => e.file);
    } catch { /* malformed queue file — ignore */ }
  }

  const clips = files.map((f) => ({
    file: f,
    path: path.join(folderPath, f),
    status: posted.includes(f) ? "posted" : queued.includes(f) ? "queued" : "pending",
  }));

  return NextResponse.json({ clips, folder: folderPath });
}
