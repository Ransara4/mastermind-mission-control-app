import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const FILE_PATH = path.join(WS, "projects/mastermind/DISCOVERY_INSTRUCTIONS.md");

export async function GET() {
  try {
    if (!fs.existsSync(FILE_PATH)) {
      return NextResponse.json({ content: "" });
    }
    const content = fs.readFileSync(FILE_PATH, "utf-8");
    return NextResponse.json({ content });
  } catch (err) {
    console.error("discovery-instructions GET error:", err);
    return NextResponse.json({ error: "Failed to read" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    fs.writeFileSync(FILE_PATH, content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("discovery-instructions PUT error:", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
