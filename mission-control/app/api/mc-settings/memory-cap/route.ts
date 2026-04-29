import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const HOME = os.homedir();

const PLIST_PATH = path.join(
  process.env.HOME || "",
  "Library/LaunchAgents/ai.openclaw.mission-control.plist"
);

export async function GET() {
  try {
    if (!fs.existsSync(PLIST_PATH)) {
      return NextResponse.json({ cap: null, error: "Plist not found" });
    }
    const content = fs.readFileSync(PLIST_PATH, "utf-8");
    const match = content.match(/--max-old-space-size=(\d+)/);
    const cap = match ? parseInt(match[1], 10) : null;
    return NextResponse.json({ cap });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { cap } = await req.json();
    if (typeof cap !== "number" || cap < 128 || cap > 8192) {
      return NextResponse.json({ error: "cap must be 128-8192 MB" }, { status: 400 });
    }

    if (!fs.existsSync(PLIST_PATH)) {
      return NextResponse.json({ error: "Plist not found" }, { status: 404 });
    }

    let content = fs.readFileSync(PLIST_PATH, "utf-8");

    // Update existing NODE_OPTIONS value or add it
    if (content.includes("--max-old-space-size=")) {
      content = content.replace(
        /--max-old-space-size=\d+/,
        `--max-old-space-size=${cap}`
      );
    } else if (content.includes("<key>NODE_OPTIONS</key>")) {
      content = content.replace(
        /(<key>NODE_OPTIONS<\/key>\s*<string>)([^<]*)(<\/string>)/,
        `$1--max-old-space-size=${cap}$3`
      );
    } else {
      // NODE_OPTIONS key doesn't exist yet — add it before closing </dict> of EnvironmentVariables
      content = content.replace(
        /(<key>HOSTNAME<\/key>\s*<string>[^<]*<\/string>)/,
        `$1\n      <key>NODE_OPTIONS</key>\n      <string>--max-old-space-size=${cap}</string>`
      );
    }

    fs.writeFileSync(PLIST_PATH, content, "utf-8");

    return NextResponse.json({
      success: true,
      cap,
      message: `Plist updated to ${cap} MB. Restart MC to apply.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
