import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const RULES_DIR = path.join(WS, "agents/slack/data");

function getRulesFiles(): { name: string; filename: string; content: string }[] {
  if (!fs.existsSync(RULES_DIR)) return [];
  const files = fs.readdirSync(RULES_DIR).filter((f) => f.endsWith(".md"));
  return files.map((filename) => ({
    name: filename.replace(/\.md$/, "").replace(/-/g, " "),
    filename,
    content: fs.readFileSync(path.join(RULES_DIR, filename), "utf-8"),
  }));
}

export async function GET() {
  try {
    const rules = getRulesFiles();
    return NextResponse.json({ rules });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { filename, content } = await req.json();
    if (!filename || typeof content !== "string") {
      return NextResponse.json(
        { error: "filename and content required" },
        { status: 400 }
      );
    }
    // Sanitize filename — only allow .md files within the data dir
    if (!filename.endsWith(".md") || filename.includes("/") || filename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }
    if (!fs.existsSync(RULES_DIR)) {
      fs.mkdirSync(RULES_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(RULES_DIR, filename), content, "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, content } = await req.json();
    if (!name || typeof content !== "string") {
      return NextResponse.json(
        { error: "name and content required" },
        { status: 400 }
      );
    }
    const filename = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") + ".md";
    if (!fs.existsSync(RULES_DIR)) {
      fs.mkdirSync(RULES_DIR, { recursive: true });
    }
    const filePath = path.join(RULES_DIR, filename);
    if (fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 }
      );
    }
    fs.writeFileSync(filePath, content, "utf-8");
    return NextResponse.json({ ok: true, filename });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { filename } = await req.json();
    if (!filename || !filename.endsWith(".md") || filename.includes("/") || filename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename" },
        { status: 400 }
      );
    }
    const filePath = path.join(RULES_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
