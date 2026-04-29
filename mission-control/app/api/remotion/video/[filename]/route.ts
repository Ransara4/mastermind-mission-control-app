import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const OUTPUT_DIR = path.join(WS, "agents/remotion/output");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename: rawFilename } = await params;
  const filename = path.basename(rawFilename); // prevent path traversal
  if (!filename.endsWith(".mp4")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const filePath = path.join(OUTPUT_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const buffer = fs.readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": buffer.length.toString(),
      "Accept-Ranges": "bytes",
    },
  });
}
