import { NextResponse } from "next/server";
import { execSync } from "child_process";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  try {
    const agentDir = `${WS}/agents/ig-video-transcriber`;
    const result = execSync(`python3 ${agentDir}/src/main.py transcribe --url "${url}"`, {
      timeout: 300000,
      env: { ...process.env },
    }).toString();
    return NextResponse.json({ ok: true, output: result });
  } catch (e: unknown) {
    const err = e as { stderr?: Buffer; message?: string };
    return NextResponse.json({ error: err.stderr?.toString() || err.message }, { status: 500 });
  }
}
