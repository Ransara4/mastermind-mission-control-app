import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const ENV_FILE = path.join(WS, ".env");

/**
 * POST /api/env/inject
 * Body: { vars: Record<string, string> }
 * Writes or updates key=value pairs in ~/.openclaw/workspace/.env.
 * Existing keys are updated in-place; new keys are appended.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vars } = body as { vars: Record<string, string> };

    if (!vars || typeof vars !== "object" || Object.keys(vars).length === 0) {
      return NextResponse.json(
        { error: "Missing or empty vars object" },
        { status: 400 }
      );
    }

    // Validate env var names (only allow alphanumeric + underscore)
    for (const key of Object.keys(vars)) {
      if (!/^[A-Z0-9_]+$/i.test(key)) {
        return NextResponse.json(
          { error: `Invalid env var name: ${key}` },
          { status: 400 }
        );
      }
    }

    // Read existing .env file
    let content = "";
    try {
      content = await fs.readFile(ENV_FILE, "utf-8");
    } catch {
      // File doesn't exist yet — start fresh
      content = "";
    }

    const lines = content.split("\n");
    const updated: Set<string> = new Set();

    // Update existing keys in-place
    const newLines = lines.map((line) => {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || !line.includes("=")) return line;

      const eqIdx = line.indexOf("=");
      const key = line.slice(0, eqIdx).trim();

      if (vars[key] !== undefined) {
        updated.add(key);
        const value = vars[key];
        // Wrap in quotes if value contains spaces or special chars
        const needsQuotes = /[\s#"'`$\\]/.test(value);
        return `${key}=${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`;
      }
      return line;
    });

    // Append any keys that weren't found in the file
    const toAppend = Object.entries(vars).filter(([k]) => !updated.has(k));
    if (toAppend.length > 0) {
      // Add a newline separator if file doesn't end with one
      if (newLines.length > 0 && newLines[newLines.length - 1].trim() !== "") {
        newLines.push("");
      }
      for (const [key, value] of toAppend) {
        const needsQuotes = /[\s#"'`$\\]/.test(value);
        newLines.push(`${key}=${needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value}`);
      }
    }

    await fs.writeFile(ENV_FILE, newLines.join("\n"), "utf-8");

    return NextResponse.json({
      ok: true,
      updated: [...updated],
      appended: toAppend.map(([k]) => k),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to inject env vars", detail: String(err) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/env/inject?keys=KEY1,KEY2
 * Returns which of the requested env var names are currently set (non-empty) in .env.
 * Never returns values — only presence.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keysParam = searchParams.get("keys");
    if (!keysParam) {
      return NextResponse.json({ error: "Missing keys parameter" }, { status: 400 });
    }

    const requestedKeys = keysParam.split(",").map((k) => k.trim()).filter(Boolean);

    let content = "";
    try {
      content = await fs.readFile(ENV_FILE, "utf-8");
    } catch {
      // File not found — all missing
      return NextResponse.json({ configured: {} });
    }

    const configured: Record<string, boolean> = {};
    for (const key of requestedKeys) {
      configured[key] = false;
    }

    for (const line of content.split("\n")) {
      if (line.trim().startsWith("#") || !line.includes("=")) continue;
      const eqIdx = line.indexOf("=");
      const key = line.slice(0, eqIdx).trim();
      const value = line.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
      if (requestedKeys.includes(key) && value.length > 0) {
        configured[key] = true;
      }
    }

    return NextResponse.json({ configured });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to check env vars", detail: String(err) },
      { status: 500 }
    );
  }
}
