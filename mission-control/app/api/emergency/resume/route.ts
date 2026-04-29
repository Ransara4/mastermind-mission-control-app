/**
 * API Route: Clear emergency mode and trigger recovery
 * POST /api/emergency/resume
 *
 * Clears mode.json back to regular, sends Telegram confirmation.
 * Called when Joe sends /resume via Telegram or triggers manually from dashboard.
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);
const MODE_FILE = path.join(WS, "data/mode.json");

export async function POST() {
  try {
    const current = await fs.readFile(MODE_FILE, "utf8").then(JSON.parse).catch(() => ({ mode: "regular" }));

    if (current.mode !== "emergency") {
      return NextResponse.json({ ok: true, message: "Already in regular mode — nothing to clear." });
    }

    // Clear emergency mode
    await fs.writeFile(
      MODE_FILE,
      JSON.stringify({ mode: "regular", since: new Date().toISOString(), reason: "manual_resume" }, null, 2)
    );

    // Send Telegram confirmation
    await execAsync(
      `source ${WS}/ops/overseer-lib.sh && send_telegram "✅ Emergency mode cleared manually. All agents will resume on their next scheduled run."`,
      { shell: "/bin/bash" }
    ).catch(() => null);

    return NextResponse.json({ ok: true, message: "Emergency mode cleared. Agents resuming." });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const current = await fs.readFile(MODE_FILE, "utf8").then(JSON.parse).catch(() => ({ mode: "regular" }));
    return NextResponse.json({ mode: current.mode, since: current.since || null, reason: current.reason || null });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
