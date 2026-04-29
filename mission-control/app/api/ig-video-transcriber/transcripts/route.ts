import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export async function GET() {
  const transcriptsDir = path.join(WS, "agents/ig-video-transcriber/data/transcripts");
  try {
    if (!fs.existsSync(transcriptsDir)) return NextResponse.json([]);
    const files = fs.readdirSync(transcriptsDir).filter(f => f.endsWith(".json"));
    const transcripts = files.map(f => {
      try { return JSON.parse(fs.readFileSync(path.join(transcriptsDir, f), "utf8")); }
      catch { return null; }
    }).filter(Boolean);
    transcripts.sort((a: { transcribedAt: string }, b: { transcribedAt: string }) =>
      new Date(b.transcribedAt).getTime() - new Date(a.transcribedAt).getTime()
    );
    return NextResponse.json(transcripts);
  } catch {
    return NextResponse.json([]);
  }
}
