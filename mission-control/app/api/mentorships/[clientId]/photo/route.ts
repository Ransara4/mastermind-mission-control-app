import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const PHOTOS_DIR = path.join(WS, "projects/mentorships/photos");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const extensions = [".jpg", ".jpeg", ".png", ".webp"];
  for (const ext of extensions) {
    const filePath = path.join(PHOTOS_DIR, clientId + ext);
    if (existsSync(filePath)) {
      const contentType =
        ext === ".png"
          ? "image/png"
          : ext === ".webp"
            ? "image/webp"
            : "image/jpeg";
      const buffer = readFileSync(filePath);
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=86400",
        },
      });
    }
  }

  return NextResponse.json({ error: "Photo not found" }, { status: 404 });
}
