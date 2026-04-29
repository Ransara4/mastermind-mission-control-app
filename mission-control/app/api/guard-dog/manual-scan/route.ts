import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);
const SCAN_SCRIPT = `${WS}/agents/guard-dog/bin/cron-nightly-scan.sh`;

export async function POST() {
  try {
    const { stdout, stderr } = await execAsync(
      `bash "${SCAN_SCRIPT}" 2>&1`,
      { timeout: 120000, env: { ...process.env, PATH: "/opt/homebrew/bin:/usr/local/bin:" + process.env.PATH } }
    );

    const output = stdout + stderr;

    // Parse results from output
    const scannedMatch = output.match(/Projects scanned: (\d+) \/ (\d+)/);
    const dangerousMatch = output.match(/Dangerous projects: (\d+)/);

    return NextResponse.json({
      success: true,
      totalScanned: scannedMatch ? parseInt(scannedMatch[1]) : 0,
      totalProjects: scannedMatch ? parseInt(scannedMatch[2]) : 0,
      dangerous: dangerousMatch ? parseInt(dangerousMatch[1]) : 0,
      suspicious: 0,
      output: output.slice(-1000),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
