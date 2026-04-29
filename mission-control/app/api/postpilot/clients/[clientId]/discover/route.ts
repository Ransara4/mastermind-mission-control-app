import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import os from "os";
import { getClientConfig } from "../_db";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SCRIPT_PATH = path.join(WS, "agents/wix/src/discover-sources.sh");

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const client = getClientConfig(clientId);
    if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

    const tmpFile = path.join(os.tmpdir(), `postpilot-disc-${clientId}-${Date.now()}.json`);
    fs.writeFileSync(tmpFile, JSON.stringify(client));

    const child = spawn("bash", [SCRIPT_PATH], {
      detached: true,
      stdio: "ignore",
      env: { ...process.env, POSTPILOT_CLIENT_CONFIG: tmpFile, POSTPILOT_CLIENT_ID: clientId },
    });
    child.unref();

    setTimeout(() => {
      try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
    }, 300_000);

    return NextResponse.json({ ok: true, message: "Discovery started in background" });
  } catch (err) {
    console.error("postpilot discover POST error:", err);
    return NextResponse.json({ error: "Failed to start discovery" }, { status: 500 });
  }
}
