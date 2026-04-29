import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "projects/mentorships/mentorships-db.json");

async function readDB() {
  const raw = await fs.readFile(DB_PATH, "utf-8");
  return JSON.parse(raw);
}

async function writeDB(data: any) {
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const db = await readDB();
  const client = db.clients?.find((c: any) => c.id === clientId);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const sessions = (db.sessions || []).filter(
    (s: any) => s.client_id === clientId
  );
  const payments = (db.payments || []).filter(
    (p: any) => p.client_id === clientId
  );

  return NextResponse.json({ client, sessions, payments });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const db = await readDB();
  const clientIndex = (db.clients || []).findIndex(
    (c: any) => c.id === clientId
  );

  if (clientIndex === -1) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const body = await request.json();
  const existingClient = db.clients[clientIndex];

  db.clients[clientIndex] = {
    ...existingClient,
    ...body,
    id: clientId,
    updated_at: new Date().toISOString(),
  };

  await writeDB(db);

  return NextResponse.json({ client: db.clients[clientIndex] });
}
