export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { processes } from "../_state";

export async function GET() {
  const slotA = processes.get("A");
  const slotB = processes.get("B");

  return NextResponse.json({
    slots: {
      A: slotA && slotA.exitCode === null ? "running" : "idle",
      B: slotB && slotB.exitCode === null ? "running" : "idle",
    },
  });
}
