export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const HANDOFF_PATH = path.join(
  process.env.HOME ?? "/root",
  ".marathon",
  "handoff.md"
);

export async function GET() {
  try {
    if (!fs.existsSync(HANDOFF_PATH)) {
      return NextResponse.json({ exists: false, content: "" });
    }
    const content = fs.readFileSync(HANDOFF_PATH, "utf-8");
    const isComplete = content.includes("## Status: COMPLETE");
    return NextResponse.json({ exists: !isComplete, content, isComplete });
  } catch (err) {
    console.error("genie handoff GET error:", err);
    return NextResponse.json({ exists: false, content: "" });
  }
}
