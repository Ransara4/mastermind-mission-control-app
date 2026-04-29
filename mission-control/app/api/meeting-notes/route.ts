import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_PATH = join(WS, "data/meeting-notes.json");

function ensureFile() {
  if (!existsSync(DATA_PATH)) {
    mkdirSync(dirname(DATA_PATH), { recursive: true });
    writeFileSync(DATA_PATH, "[]", "utf8");
  }
}

function readSessions(): any[] {
  ensureFile();
  try {
    return JSON.parse(readFileSync(DATA_PATH, "utf8"));
  } catch {
    return [];
  }
}

function writeSessions(sessions: any[]) {
  ensureFile();
  writeFileSync(DATA_PATH, JSON.stringify(sessions, null, 2), "utf8");
}

export async function GET(req: NextRequest) {
  try {
    const sessions = readSessions();
    const client = req.nextUrl.searchParams.get("client");
    if (client) {
      const filtered = sessions.filter(
        (s: any) => s.clientName?.toLowerCase() === client.toLowerCase()
      );
      return NextResponse.json(filtered);
    }
    return NextResponse.json(sessions);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sessions = readSessions();

    if (body.id) {
      const idx = sessions.findIndex((s: any) => s.id === body.id);
      if (idx >= 0) {
        sessions[idx] = { ...sessions[idx], ...body };
      } else {
        sessions.push({ ...body, createdAt: body.createdAt || new Date().toISOString() });
      }
    } else {
      const id = crypto.randomUUID();
      sessions.push({
        ...body,
        id,
        createdAt: new Date().toISOString(),
      });
    }

    writeSessions(sessions);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    let sessions = readSessions();
    sessions = sessions.filter((s: any) => s.id !== body.id);
    writeSessions(sessions);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
