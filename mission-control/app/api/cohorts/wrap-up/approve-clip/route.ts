// POST /api/cohorts/wrap-up/approve-clip
// Adds a clip to the instagram queue (or removes it if approved: false).
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const MASTERMIND_BASE = `${WS}/projects/mastermind`;
const QUEUE_FILE = `${MASTERMIND_BASE}/instagram-queue.json`;

interface QueueEntry {
  file: string;
  session: unknown;
  cohort: number;
  speakerName: string;
  quote: string;
  approved: boolean;
  approvedAt: string;
  status: string;
}

interface QueueFile {
  queue: QueueEntry[];
  posted: QueueEntry[];
  settings: { postIntervalHours: number; enabled: boolean };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { file, session, cohort = 1, speakerName = "", quote = "", approved } = body;

    if (!file || !session) {
      return NextResponse.json({ error: "file and session required" }, { status: 400 });
    }

    const q: QueueFile = fs.existsSync(QUEUE_FILE)
      ? (JSON.parse(fs.readFileSync(QUEUE_FILE, "utf8")) as QueueFile)
      : { queue: [], posted: [], settings: { postIntervalHours: 24, enabled: false } };

    if (approved) {
      // Add to queue if not already there and not already posted
      const alreadyPosted = q.posted.some(
        (e) => e.file === file && String(e.session) === String(session)
      );
      const alreadyQueued = q.queue.some(
        (e) => e.file === file && String(e.session) === String(session)
      );
      if (!alreadyPosted && !alreadyQueued) {
        q.queue.push({
          file,
          session,
          cohort,
          speakerName,
          quote,
          approved: true,
          approvedAt: new Date().toISOString(),
          status: "queued",
        });
      }
    } else {
      // Remove from queue
      q.queue = q.queue.filter(
        (e) => !(e.file === file && String(e.session) === String(session))
      );
    }

    fs.writeFileSync(QUEUE_FILE, JSON.stringify(q, null, 2));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
