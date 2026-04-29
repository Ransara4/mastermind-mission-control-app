import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const TEMPLATES_DIR = path.join(WS, "data/carousel-builder/templates");

function ensureDir() {
  if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}

export async function GET() {
  ensureDir();
  const files = fs.readdirSync(TEMPLATES_DIR).filter((f) =>
    /\.(jpg|jpeg|png|webp)$/i.test(f)
  );
  const templates = files.map((f) => ({
    id: f,
    filename: f,
    url: `/api/carousel-builder/serve?template=${encodeURIComponent(f)}`,
    createdAt: fs.statSync(path.join(TEMPLATES_DIR, f)).birthtime.toISOString(),
  }));
  templates.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  ensureDir();
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const ext = path.extname(file.name).toLowerCase() || ".jpg";
    const filename = `template-${Date.now()}${ext}`;
    const dest = path.join(TEMPLATES_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(dest, buffer);

    return NextResponse.json({
      id: filename,
      filename,
      url: `/api/carousel-builder/serve?template=${encodeURIComponent(filename)}`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const filePath = path.join(TEMPLATES_DIR, path.basename(id));
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  return NextResponse.json({ ok: true });
}
