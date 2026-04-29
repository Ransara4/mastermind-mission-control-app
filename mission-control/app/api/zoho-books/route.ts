import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const execFileAsync = promisify(execFile);
const AGENT_DIR = join(WS, "agents/zoho-books");
const STATUS_FILE = join(AGENT_DIR, "status.json");

export async function GET(req: NextRequest) {
  const cmd = req.nextUrl.searchParams.get("cmd") || "dashboard";

  try {
    const args = cmd.split(/\s+/);
    const { stdout, stderr } = await execFileAsync("node", [join(AGENT_DIR, "src/index.js"), ...args], {
      timeout: 30000,
      cwd: AGENT_DIR,
    });

    let status = null;
    try {
      status = JSON.parse(readFileSync(STATUS_FILE, "utf8"));
    } catch {}

    return NextResponse.json({
      success: true,
      output: stdout,
      error: stderr || null,
      status,
    });
  } catch (err: unknown) {
    const error = err as Error & { stdout?: string; stderr?: string };
    return NextResponse.json(
      {
        success: false,
        output: error.stdout || "",
        error: error.stderr || error.message,
      },
      { status: 500 }
    );
  }
}
