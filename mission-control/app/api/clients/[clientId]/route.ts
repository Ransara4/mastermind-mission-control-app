import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const CLIENTS_PATH = join(WS, "data/clients.json");

async function loadClients(): Promise<any[]> {
  try {
    const raw = await readFile(CLIENTS_PATH, "utf-8");
    return JSON.parse(raw).clients || [];
  } catch {
    return [];
  }
}

async function saveClients(clients: any[]) {
  await writeFile(CLIENTS_PATH, JSON.stringify({ clients }, null, 2) + "\n");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const body = await request.json();
    const clients = await loadClients();
    const idx = clients.findIndex((c: any) => c.id === clientId);
    if (idx === -1) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    clients[idx] = { ...clients[idx], ...body, id: clientId };
    await saveClients(clients);
    return NextResponse.json({ client: clients[idx] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const { clientId } = await params;
    const clients = await loadClients();
    const filtered = clients.filter((c: any) => c.id !== clientId);
    if (filtered.length === clients.length) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    await saveClients(filtered);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
