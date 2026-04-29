import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const NAV_STATE_PATH = path.join(WS, "data/nav-state.json");

// GET /api/nav-state — load persisted nav state
export async function GET() {
  try {
    if (!fs.existsSync(NAV_STATE_PATH)) {
      return NextResponse.json(null);
    }
    const raw = fs.readFileSync(NAV_STATE_PATH, "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json(null);
  }
}

// PUT /api/nav-state — save nav state
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const dir = path.dirname(NAV_STATE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(NAV_STATE_PATH, JSON.stringify(body, null, 2), "utf-8");
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
