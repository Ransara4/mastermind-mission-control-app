import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

export async function GET() {
  try {
    const statusPath = path.join(WS, "agents/vercel/status.json");
    if (!fs.existsSync(statusPath)) {
      return NextResponse.json({ status: "unknown", lastRun: null, lastMessage: "No runs yet" });
    }
    const data = JSON.parse(fs.readFileSync(statusPath, "utf8"));
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: "error", lastMessage: "Could not read status" }, { status: 500 });
  }
}
