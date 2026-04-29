import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execFileAsync = promisify(execFile);

const PEXEL_BIN = path.join(WS, "agents/pexel/src/index.js");
const PEXEL_STATUS_PATH = path.join(WS, "agents/pexel/status.json");

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(PEXEL_STATUS_PATH, "utf-8"));
  } catch {
    return null;
  }
}

// GET /api/pexel — returns status + search (if ?q= provided)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const count = searchParams.get("count") || "5";

  const status = readStatus();

  if (!query) {
    return NextResponse.json({ status });
  }

  try {
    const { stdout } = await execFileAsync("node", [
      PEXEL_BIN,
      "search",
      query,
      `--count=${count}`,
    ], { timeout: 30000 });

    // Parse the console output into structured data
    const lines = stdout.split("\n");
    const photos: { photographer: string; url: string; pexelsUrl: string; alt: string }[] = [];
    let current: Record<string, string> = {};

    for (const line of lines) {
      const urlMatch = line.match(/URL:\s+(.+)/);
      const pexelsMatch = line.match(/Pexels:\s+(.+)/);
      const altMatch = line.match(/Alt:\s+(.+)/);
      const photoMatch = line.match(/\[\d+\]\s+(.+)/);

      if (photoMatch) {
        if (current.photographer) photos.push(current as any);
        current = { photographer: photoMatch[1].trim() };
      } else if (urlMatch) current.url = urlMatch[1].trim();
      else if (pexelsMatch) current.pexelsUrl = pexelsMatch[1].trim();
      else if (altMatch) current.alt = altMatch[1].trim();
    }
    if (current.photographer) photos.push(current as any);

    return NextResponse.json({ photos, query, status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, status }, { status: 500 });
  }
}

// POST /api/pexel — run an import
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, query, folder, slug, labels, outputPath } = body;

  if (!action || !query) {
    return NextResponse.json({ error: "action and query are required" }, { status: 400 });
  }

  try {
    if (action === "import-wix") {
      const cliArgs = [
        PEXEL_BIN,
        "import-wix",
        query,
        `--folder=${folder || "Pexel Imports"}`,
        `--slug=${slug || `pexel-${Date.now()}`}`,
      ];
      if (labels) cliArgs.push(`--labels=${labels}`);

      const { stdout } = await execFileAsync("node", cliArgs, { timeout: 60000 });
      const wixFileId = stdout.match(/File ID:\s+(.+)/)?.[1]?.trim() || "";
      const staticUrl = stdout.match(/Static URL:\s+(.+)/)?.[1]?.trim() || "";
      const photographer = stdout.match(/Photo by:\s+(.+)/)?.[1]?.trim() || "";
      const pexelsUrl = stdout.match(/Pexels URL:\s+(.+)/)?.[1]?.trim() || "";

      const status = readStatus();
      return NextResponse.json({ wixFileId, staticUrl, photographer, pexelsUrl, status, stdout });
    }

    if (action === "import-local") {
      const outPath = outputPath || `/tmp/pexel-${Date.now()}.jpg`;
      const { stdout } = await execFileAsync("node", [
        PEXEL_BIN, "import-local", query, `--output=${outPath}`
      ], { timeout: 30000 });

      const localPath = stdout.match(/Saved to:\s+(.+)/)?.[1]?.trim() || outPath;
      const status = readStatus();
      return NextResponse.json({ localPath, status, stdout });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
