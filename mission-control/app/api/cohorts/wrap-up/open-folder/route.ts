import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const MASTERMIND_BASE = `${WS}/projects/mastermind`;

// POST /api/cohorts/wrap-up/open-folder
// Opens a folder or file in Finder / default app. Path can be absolute or relative to mastermind project.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const folderPath: string = body.path || "";

    // Resolve ~ to HOME for safety
    let resolvedPath = folderPath.startsWith("~/")
      ? folderPath.replace("~", HOME)
      : folderPath;

    // If path is relative (doesn't start with /), treat as relative to mastermind base
    if (resolvedPath && !resolvedPath.startsWith("/")) {
      resolvedPath = path.join(MASTERMIND_BASE, resolvedPath);
    }

    if (!resolvedPath || !resolvedPath.startsWith(MASTERMIND_BASE)) {
      return NextResponse.json(
        { error: "Invalid path — must be within the mastermind project directory" },
        { status: 400 }
      );
    }

    await new Promise<void>((resolve, reject) => {
      exec(`open "${resolvedPath}"`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
