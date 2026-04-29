/**
 * API Route: Disk Cleaner — POST run now
 * POST /api/disk-cleaner/run
 */

import { NextResponse } from "next/server";
import { exec } from "child_process";
import * as os from "os";
import * as path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const AGENT_SCRIPT = path.join(WS, "agents/mac-cleaner/src/index.js");

export async function POST() {
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        exec(
          `node "${AGENT_SCRIPT}"`,
          { timeout: 300000, maxBuffer: 10 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              reject(error);
            } else {
              resolve({ stdout, stderr });
            }
          }
        );
      }
    );

    return NextResponse.json({
      success: true,
      output: result.stdout,
      stderr: result.stderr,
    });
  } catch (error) {
    console.error("[/api/disk-cleaner/run] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
