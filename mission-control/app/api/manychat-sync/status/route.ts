import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const STATUS_PATH = path.join(WS, "agents/manychat-sync/status.json");

export async function GET() {
  try {
    const data = JSON.parse(fs.readFileSync(STATUS_PATH, "utf8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({
      agent: "manychat-sync",
      status: "unknown",
      lastRun: null,
    });
  }
}
