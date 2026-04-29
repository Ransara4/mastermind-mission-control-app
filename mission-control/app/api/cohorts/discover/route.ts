import { NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export async function POST() {
  try {
    const scriptPath = path.join(WS, "agents/wix/src/discover-sources.sh");

    const child = spawn("bash", [scriptPath], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    return NextResponse.json({ ok: true, message: "Discovery started" });
  } catch (err) {
    console.error("cohorts discover POST error:", err);
    return NextResponse.json({ error: "Failed to start discovery" }, { status: 500 });
  }
}
