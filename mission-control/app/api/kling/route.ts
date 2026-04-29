import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const STATUS_PATH = path.join(WS, "agents/kling/status.json");

export async function GET() {
  try {
    if (!fs.existsSync(STATUS_PATH)) {
      return NextResponse.json({
        agent: "kling",
        operation: "none",
        result: "no_data",
        details: { message: "No status file found. Agent may not have run yet." },
        timestamp: null,
      });
    }
    const raw = fs.readFileSync(STATUS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 }
    );
  }
}
