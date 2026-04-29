import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const QUEUE_PATH = path.join(WS, "agents/manychat-sync/data/queue.jsonl");

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (!body.subscriber_id) {
    return NextResponse.json(
      { error: "subscriber_id required" },
      { status: 400 }
    );
  }
  const entry =
    JSON.stringify({ ...body, received_at: new Date().toISOString() }) + "\n";
  fs.mkdirSync(path.dirname(QUEUE_PATH), { recursive: true });
  fs.appendFileSync(QUEUE_PATH, entry, "utf8");
  return NextResponse.json({ ok: true });
}
