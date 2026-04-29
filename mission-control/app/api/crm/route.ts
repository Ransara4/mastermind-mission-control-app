import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DATA_PATH = path.join(WS, "data/crm.json");

interface Note {
  text: string;
  date: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: "Lead" | "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";
  value: number;
  currency: string;
  lastTouch: string;
  nextAction: string;
  nextActionDate: string;
  source: string;
  notes: Note[];
  tags: string[];
  createdAt: string;
}

function readContacts(): Contact[] {
  try {
    const raw = fs.readFileSync(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeContacts(contacts: Contact[]) {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify(contacts, null, 2));
}

export async function GET(req: NextRequest) {
  const contacts = readContacts();
  const url = req.nextUrl;
  const stage = url.searchParams.get("stage");
  const search = url.searchParams.get("search")?.toLowerCase();
  const tag = url.searchParams.get("tag");

  let filtered = contacts;
  if (stage) filtered = filtered.filter((c) => c.stage === stage);
  if (tag) filtered = filtered.filter((c) => c.tags?.includes(tag));
  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.name?.toLowerCase().includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.company?.toLowerCase().includes(search)
    );
  }

  return NextResponse.json(filtered);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const contacts = readContacts();
  const now = new Date().toISOString();

  if (body.id) {
    const idx = contacts.findIndex((c) => c.id === body.id);
    if (idx === -1) return NextResponse.json({ error: "Not found" }, { status: 404 });
    contacts[idx] = { ...contacts[idx], ...body, lastTouch: now };
    writeContacts(contacts);
    return NextResponse.json(contacts[idx]);
  }

  const contact: Contact = {
    id: randomUUID(),
    name: body.name || "",
    email: body.email || "",
    phone: body.phone || "",
    company: body.company || "",
    stage: body.stage || "Lead",
    value: body.value || 0,
    currency: body.currency || "USD",
    lastTouch: now,
    nextAction: body.nextAction || "",
    nextActionDate: body.nextActionDate || "",
    source: body.source || "",
    notes: body.notes || [],
    tags: body.tags || [],
    createdAt: now,
  };

  contacts.push(contact);
  writeContacts(contacts);
  return NextResponse.json(contact, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const contacts = readContacts();
  const filtered = contacts.filter((c) => c.id !== body.id);
  if (filtered.length === contacts.length) return NextResponse.json({ error: "Not found" }, { status: 404 });

  writeContacts(filtered);
  return NextResponse.json({ ok: true });
}
