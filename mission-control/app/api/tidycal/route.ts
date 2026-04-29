import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const exec = promisify(execFile);
const AGENT = `${WS}/agents/tidycal/src/index.js`;

async function runAgent(args: string[]): Promise<unknown> {
  const { stdout } = await exec("node", [AGENT, ...args], { timeout: 15000 });
  try {
    return JSON.parse(stdout);
  } catch {
    return { raw: stdout };
  }
}

export async function GET(req: NextRequest) {
  try {
    const cmd = req.nextUrl.searchParams.get("cmd") || "bookings";
    const args = cmd.split(/\s+/);
    const data = await runAgent(args);
    return NextResponse.json({ data });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
