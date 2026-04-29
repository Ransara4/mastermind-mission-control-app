export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { processes } from "../_state";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const slot = ((body as { slot?: string }).slot ?? "A") as "A" | "B";
  const slotKey = slot === "B" ? "B" : "A";

  const child = processes.get(slotKey);
  if (!child || child.exitCode !== null) {
    return NextResponse.json({ success: false, error: "No running session in that slot" });
  }

  child.kill("SIGTERM");
  processes.delete(slotKey);

  return NextResponse.json({ success: true, slot: slotKey });
}
