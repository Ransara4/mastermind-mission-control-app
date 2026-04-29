export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files.length) {
      return NextResponse.json({ error: "No files" }, { status: 400 });
    }

    const sessionDir = path.join("/tmp", "genie-uploads", randomUUID());
    await mkdir(sessionDir, { recursive: true });

    const saved: Array<{ id: number; name: string; path: string; mimeType: string; isImage: boolean }> = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = path.join(sessionDir, safeName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);
      saved.push({
        id: i + 1,
        name: file.name,
        path: filePath,
        mimeType: file.type,
        isImage: file.type.startsWith("image/"),
      });
    }

    return NextResponse.json({ files: saved });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
