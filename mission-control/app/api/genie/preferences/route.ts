export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
const SHARED_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "agents", "shared");
const { readLaneState } = require(path.join(SHARED_ROOT, "myos-lane.js"));
const { readGeniePreferences, writeGeniePreferences } = require(path.join(SHARED_ROOT, "genie-preferences.js"));

function buildResponse() {
  const lane = readLaneState();
  const preferences = readGeniePreferences();
  return {
    provider: preferences.provider || lane.apiProvider || "anthropic",
    model: preferences.model,
    effort: preferences.effort,
    mode: preferences.mode,
    updatedAt: preferences.updatedAt ?? null,
    updatedBy: preferences.updatedBy ?? null,
  };
}

export async function GET() {
  return NextResponse.json(buildResponse());
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const next = writeGeniePreferences(
      {
        provider: body.provider,
        model: body.model,
        effort: body.effort,
        mode: body.mode,
      },
      { updatedBy: "mission-control-genie" }
    );

    const lane = readLaneState();
    return NextResponse.json({
      provider: next.provider || lane.apiProvider || "anthropic",
      model: next.model,
      effort: next.effort,
      mode: next.mode,
      updatedAt: next.updatedAt ?? null,
      updatedBy: next.updatedBy ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save Genie preferences" },
      { status: 400 }
    );
  }
}
