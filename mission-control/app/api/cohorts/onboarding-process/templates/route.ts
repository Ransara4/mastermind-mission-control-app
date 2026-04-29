import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const TEMPLATES_DIR = path.join(WS, "projects/mastermind/templates");

// PATCH /api/cohorts/onboarding-process/templates
// Update a template's body content while preserving frontmatter
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, body: newBody } = body;

    if (!filename || typeof newBody !== "string") {
      return NextResponse.json(
        { error: "filename and body are required" },
        { status: 400 }
      );
    }

    // Prevent path traversal
    if (filename.includes("/") || filename.includes("..")) {
      return NextResponse.json(
        { error: "invalid filename" },
        { status: 400 }
      );
    }

    const filePath = path.join(TEMPLATES_DIR, filename);
    const raw = readFileSync(filePath, "utf8");

    // Split on --- delimiters: [empty, frontmatter, body...]
    const parts = raw.split("---");
    if (parts.length < 3) {
      return NextResponse.json(
        { error: "template has invalid frontmatter format" },
        { status: 400 }
      );
    }

    // Reconstruct: preserve frontmatter, replace body
    const rebuilt = `---${parts[1]}---\n\n${newBody.trim()}\n`;
    writeFileSync(filePath, rebuilt, "utf8");

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
