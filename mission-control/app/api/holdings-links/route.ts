import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const FILE_PATH = path.join(WS, "data/holdings-links.json");

interface HoldingsLink {
  id: string;
  url: string;
  label: string;
  createdAt: string;
}

function readLinks(): HoldingsLink[] {
  try {
    if (!fs.existsSync(FILE_PATH)) return [];
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeLinks(links: HoldingsLink[]) {
  const dir = path.dirname(FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(links, null, 2) + "\n", "utf-8");
}

export async function GET() {
  try {
    const links = readLinks();
    return NextResponse.json({ links });
  } catch (err) {
    console.error("holdings-links GET error:", err);
    return NextResponse.json({ links: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, label } = body;
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "url is required" }, { status: 400 });
    }
    const links = readLinks();
    const newLink: HoldingsLink = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      url: url.trim(),
      label: (label || "").trim() || url.trim(),
      createdAt: new Date().toISOString(),
    };
    links.push(newLink);
    writeLinks(links);
    return NextResponse.json({ link: newLink });
  } catch (err) {
    console.error("holdings-links POST error:", err);
    return NextResponse.json({ error: "Failed to add link" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    let links = readLinks();
    const before = links.length;
    links = links.filter((l) => l.id !== id);
    if (links.length === before) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }
    writeLinks(links);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("holdings-links DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
