import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const AGENT = join(WS, "agents/spotify/src/index.js");

function run(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile("node", [AGENT, ...args], { timeout: 30000 }, (err, stdout, stderr) => {
      resolve({ stdout: stdout || "", stderr: stderr || "", code: err ? (err as any).code ?? 1 : 0 });
    });
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { command, args = [] } = body as { command: string; args?: string[] };

  const allowed = ["play", "pause", "next", "prev", "volume", "search", "status", "playlists", "devices", "play-uri", "create-playlist"];
  if (!command || !allowed.includes(command)) {
    return NextResponse.json({ error: `Invalid command: ${command}` }, { status: 400 });
  }

  const result = await run([command, ...args]);
  // Strip ANSI escape codes for clean JSON
  const clean = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").trim();

  return NextResponse.json({
    ok: result.code === 0,
    output: clean(result.stdout),
    error: clean(result.stderr),
  });
}
