export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { processes } from "../_state";
import path from "path";

const SHARED_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "agents", "shared");

function tryRequire(filePath: string) {
  try { return require(filePath); } catch { return null; }
}

export async function GET() {
  const slotA = processes.get("A");
  const slotB = processes.get("B");
  const laneModule = tryRequire(path.join(SHARED_ROOT, "myos-lane.js"));
  const prefModule = tryRequire(path.join(SHARED_ROOT, "genie-preferences.js"));
  const lane = laneModule ? laneModule.readLaneState() : {};
  const preferences = prefModule ? prefModule.readGeniePreferences() : {};
  const defaultProvider = preferences.provider || lane.apiProvider || "anthropic";

  return NextResponse.json({
    defaultProvider,
    defaultModel: preferences.model,
    defaultEffort: preferences.effort,
    defaultMode: preferences.mode,
    slots: {
      A: slotA && slotA.exitCode === null ? "running" : "idle",
      B: slotB && slotB.exitCode === null ? "running" : "idle",
    },
  });
}
