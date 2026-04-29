import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const AGENTS_DIR = join(WS, "agents");

export async function GET(req: NextRequest) {
  const agent = req.nextUrl.searchParams.get("agent");
  if (!agent || /[^a-z0-9_-]/.test(agent)) {
    return NextResponse.json({ error: "invalid agent" }, { status: 400 });
  }

  const statusPath = join(AGENTS_DIR, agent, "data/status.json");

  try {
    const raw = await readFile(statusPath, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "status file not found" }, { status: 404 });
  }
}
