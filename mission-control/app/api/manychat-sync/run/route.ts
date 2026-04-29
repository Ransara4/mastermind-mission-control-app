import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);

export async function POST() {
  try {
    const agentPath = `${WS}/agents/manychat-sync/src/index.js`;
    const { stdout, stderr } = await execAsync(`node ${agentPath} run`, {
      timeout: 300000,
    });
    return NextResponse.json({ ok: true, output: stdout, errors: stderr });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
