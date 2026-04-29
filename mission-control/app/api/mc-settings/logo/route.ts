import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SETTINGS_PATH = path.join(WS, "data/mc-settings.json");

const LOGO_DEST = path.join(WS, "mission-control/public/custom-logo.png");

// POST /api/mc-settings/logo - upload a custom logo
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let fileBytes: Buffer;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      fileBytes = Buffer.from(arrayBuffer);
    } else {
      const arrayBuffer = await req.arrayBuffer();
      fileBytes = Buffer.from(arrayBuffer);
    }

    if (fileBytes.length === 0) {
      return NextResponse.json(
        { error: "Empty file" },
        { status: 400 }
      );
    }

    // Save the uploaded file
    fs.writeFileSync(LOGO_DEST, fileBytes);

    // Update mc-settings.json logoPath
    let settings = { theme: "dark", appName: "Mission Control", logoPath: "/icon.png" };
    try {
      if (fs.existsSync(SETTINGS_PATH)) {
        settings = { ...settings, ...JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8")) };
      }
    } catch {
      // use defaults
    }
    settings.logoPath = "/custom-logo.png";

    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");

    return NextResponse.json({ success: true, logoPath: "/custom-logo.png" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
