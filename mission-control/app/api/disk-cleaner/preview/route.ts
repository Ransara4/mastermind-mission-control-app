/**
 * API Route: Disk Cleaner Preview (dry-run)
 * GET  /api/disk-cleaner/preview — read preview.json
 * POST /api/disk-cleaner/preview — run agent with --dry-run
 */

import { NextResponse } from "next/server";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import { exec } from "child_process";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const PREVIEW_FILE = path.join(WS, "agents/mac-cleaner/data/preview.json");
const AGENT_SCRIPT = path.join(WS, "agents/mac-cleaner/src/index.js");

export async function GET() {
  try {
    const raw = await fs.readFile(PREVIEW_FILE, "utf-8");
    const preview = JSON.parse(raw);
    return NextResponse.json({ success: true, preview });
  } catch {
    return NextResponse.json({ success: true, preview: null });
  }
}

export async function POST() {
  try {
    const result = await new Promise<{ stdout: string; stderr: string }>(
      (resolve, reject) => {
        exec(
          `node "${AGENT_SCRIPT}" --dry-run`,
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

    // Read the preview file that was just written
    let preview = null;
    try {
      const raw = await fs.readFile(PREVIEW_FILE, "utf-8");
      preview = JSON.parse(raw);
    } catch {
      // Preview file wasn't created
    }

    return NextResponse.json({
      success: true,
      preview,
      output: result.stdout,
    });
  } catch (error) {
    console.error("[/api/mac-cleaner/preview] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Preview failed",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
