import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = "/tmp/wa-uploads";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Ensure upload directory exists
    await mkdir(UPLOAD_DIR, { recursive: true });

    // Sanitize filename and add UUID prefix to avoid collisions
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${randomUUID().slice(0, 8)}_${safeName}`;
    const filePath = join(UPLOAD_DIR, filename);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      filePath,
      fileName: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}
