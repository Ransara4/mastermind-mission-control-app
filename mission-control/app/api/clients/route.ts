import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
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

export async function GET() {
  const clients = await loadClients();
  return NextResponse.json({ clients });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, company, website, services, plan, notes } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const clients = await loadClients();

    const newClient = {
      id: "cli_" + randomBytes(4).toString("hex"),
      name: name.trim(),
      email: email?.trim() || "",
      phone: phone?.trim() || "",
      company: company?.trim() || "",
      website: website?.trim() || "",
      services: Array.isArray(services) ? services : [],
      status: "active",
      plan: plan || "free",
      addedAt: new Date().toISOString().slice(0, 10),
      notes: notes?.trim() || "",
    };

    clients.push(newClient);
    await saveClients(clients);

    return NextResponse.json({ client: newClient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
