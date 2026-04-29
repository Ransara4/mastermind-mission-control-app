import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const ALLOWED_BASE = path.join(WS, "projects/mastermind");

// GET /api/cohorts/wrap-up/pdf?path=<absolute-path>
export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return new NextResponse("Missing path", { status: 400 });
  }

  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(ALLOWED_BASE)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const buf = await fs.readFile(resolved);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
      },
    });
  } catch {
    return new NextResponse("PDF not found", { status: 404 });
  }
}
