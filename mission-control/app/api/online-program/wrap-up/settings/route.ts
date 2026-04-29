import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");


const SETTINGS_PATH = path.join(WS, "data/online-program-wrapup-settings.json");

const INSTRUCTIONS_PATH = path.join(WS, "projects/online-program/cohort-1/FOLLOW-UP-PDF-INSTRUCTIONS.md");

interface WrapUpSettings {
  pdfInstructions: string;
}

async function loadSettings(): Promise<WrapUpSettings> {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    // Fall back to reading from the instructions file
    try {
      const pdfInstructions = await fs.readFile(INSTRUCTIONS_PATH, "utf-8");
      return { pdfInstructions };
    } catch {
      return { pdfInstructions: "" };
    }
  }
}

async function saveSettings(settings: WrapUpSettings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export async function GET() {
  const settings = await loadSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { pdfInstructions } = body;

  if (typeof pdfInstructions !== "string") {
    return NextResponse.json(
      { error: "pdfInstructions must be a string" },
      { status: 400 }
    );
  }

  const settings: WrapUpSettings = { pdfInstructions };
  await saveSettings(settings);
  return NextResponse.json(settings);
}
