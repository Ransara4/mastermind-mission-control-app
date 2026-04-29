import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CAROUSEL_BASE = path.join(WS, "data/carousel-builder/carousels");
const TEMPLATES_BASE = path.join(WS, "data/carousel-builder/templates");

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const carouselId = searchParams.get("id");
  const file = searchParams.get("file");
  const templateId = searchParams.get("template");

  let filePath: string;

  if (templateId) {
    filePath = path.join(TEMPLATES_BASE, path.basename(templateId));
  } else if (carouselId && file) {
    // Prevent path traversal
    const safeName = file.replace(/\.\./g, "").replace(/^\/+/, "");
    filePath = path.join(CAROUSEL_BASE, path.basename(carouselId), safeName);
  } else {
    return NextResponse.json({ error: "id+file or template required" }, { status: 400 });
  }

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".pdf": "application/pdf",
    ".webp": "image/webp",
  };
  const contentType = contentTypes[ext] || "application/octet-stream";
  const buffer = fs.readFileSync(filePath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
