export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { processes } from "../_state";
import path from "path";
const SHARED_ROOT = path.join(process.env.HOME ?? "", ".openclaw", "workspace", "agents", "shared");
const { readLaneState } = require(path.join(SHARED_ROOT, "myos-lane.js"));
const { readGeniePreferences } = require(path.join(SHARED_ROOT, "genie-preferences.js"));

export async function GET() {
  const slotA = processes.get("A");
  const slotB = processes.get("B");
  const lane = readLaneState();
  const preferences = readGeniePreferences();
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
