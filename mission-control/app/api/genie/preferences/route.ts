export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";

const SHARED_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "agents", "shared");

function tryRequire(p: string) { try { return require(p); } catch { return null; } }

function buildResponse() {
  const laneModule = tryRequire(path.join(SHARED_ROOT, "myos-lane.js"));
  const prefModule = tryRequire(path.join(SHARED_ROOT, "genie-preferences.js"));
  const lane = laneModule ? laneModule.readLaneState() : {};
  const preferences = prefModule ? prefModule.readGeniePreferences() : {};
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
    const prefModule = tryRequire(path.join(SHARED_ROOT, "genie-preferences.js"));
    const laneModule = tryRequire(path.join(SHARED_ROOT, "myos-lane.js"));
    if (!prefModule) return NextResponse.json({ error: "Genie not configured on this server" }, { status: 503 });
    const next = prefModule.writeGeniePreferences(
      {
        provider: body.provider,
        model: body.model,
        effort: body.effort,
        mode: body.mode,
      },
      { updatedBy: "mission-control-genie" }
    );

    const lane = laneModule ? laneModule.readLaneState() : {};
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
