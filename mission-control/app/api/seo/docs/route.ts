import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import os from "os";

const HOME = os.homedir();

const DOCS_FILE = join(HOME, "seo", "SEO-AUTOPILOT-EXPLAINED.md");

export async function GET() {
  try {
    const content = await readFile(DOCS_FILE, "utf-8");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ content: "# SEO Autopilot Docs\n\nDocs file not found at `~/seo/SEO-AUTOPILOT-EXPLAINED.md`." });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (typeof content !== "string" || content.length < 10) {
      return NextResponse.json({ error: "Invalid content" }, { status: 400 });
    }
    await writeFile(DOCS_FILE, content, "utf-8");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
