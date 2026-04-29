import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_DIR = join(WS, "data/linkedin-images");

// GET /api/linkedin-images/preview?type=background&file=bg-123.png
// GET /api/linkedin-images/preview?type=output&file=linkedin-123.png
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "output";
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    // Prevent path traversal
    const sanitized = file.replace(/[^a-zA-Z0-9._-]/g, "");
    const subdir = type === "background" ? "backgrounds" : "outputs";
    const filepath = join(DATA_DIR, subdir, sanitized);

    if (!existsSync(filepath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const buffer = readFileSync(filepath);
    const ext = sanitized.split(".").pop()?.toLowerCase() || "png";
    const mime =
      ext === "jpg" || ext === "jpeg"
        ? "image/jpeg"
        : ext === "webp"
        ? "image/webp"
        : ext === "gif"
        ? "image/gif"
        : "image/png";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
