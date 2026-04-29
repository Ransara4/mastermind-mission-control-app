import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DATA_DIR = path.join(WS, "data");

const FILES: Record<string, string> = {
  personal: "personal-info.md",
  entities: "entities.md",
  health: "health-insurance.md",
  tax: "tax-ids.md",
  computers: "computer-info.md",
};

async function readFile(filename: string): Promise<string> {
  try {
    return await fs.readFile(path.join(DATA_DIR, filename), "utf-8");
  } catch {
    return "";
  }
}

export async function GET() {
  try {
    const sections: Record<string, string> = {};
    for (const [key, file] of Object.entries(FILES)) {
      sections[key] = await readFile(file);
    }
    return NextResponse.json({ sections });
  } catch (err) {
    console.error("personal-info API error:", err);
    return NextResponse.json({ sections: {} });
  }
}
