import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import os from "os";

const execFileAsync = promisify(execFile);

const GOOGLE_AGENT = join(os.homedir(), "golden-claw/agents/google");

/**
 * Creates a Google Slides presentation from pitch deck data.
 * Uses the Google agent's OAuth tokens + googleapis to build slides via API.
 */
export async function POST(request: NextRequest) {
  try {
    const deck = await request.json();

    // Write deck to a temp file so the script can read it
    const tmpFile = join(os.tmpdir(), `pitch-deck-${randomBytes(4).toString("hex")}.json`);
    await writeFile(tmpFile, JSON.stringify(deck));

    try {
      const scriptPath = join(GOOGLE_AGENT, "src/create-slides.js");
      const { stdout, stderr } = await execFileAsync("node", [scriptPath, tmpFile], {
        cwd: GOOGLE_AGENT,
        timeout: 30000,
        env: { ...process.env, HOME: os.homedir() },
      });

      if (stderr && !stdout) {
        return NextResponse.json({ error: stderr.trim() }, { status: 500 });
      }

      const result = JSON.parse(stdout.trim());
      return NextResponse.json(result);
    } finally {
      await unlink(tmpFile).catch(() => {});
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to export to Google Slides" },
      { status: 500 },
    );
  }
}
