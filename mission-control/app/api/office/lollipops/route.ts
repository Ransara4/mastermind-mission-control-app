import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const FILE = path.join(WS, "ops/lollipops.json");

interface LollipopEntry {
  date: string;
  reason: string;
  count: number;
}

interface LollipopData {
  total: number;
  history: LollipopEntry[];
}

function read(): LollipopData {
  if (!fs.existsSync(FILE)) {
    return { total: 0, history: [] };
  }
  return JSON.parse(fs.readFileSync(FILE, "utf-8"));
}

function write(data: LollipopData) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export async function GET() {
  return NextResponse.json(read());
}

export async function POST(req: NextRequest) {
  try {
    const { reason, count } = await req.json();
    const data = read();
    const entry: LollipopEntry = {
      date: new Date().toISOString().split("T")[0],
      reason: reason || "Good work",
      count: count || 1,
    };
    data.history.unshift(entry);
    data.total += entry.count;
    write(data);
    return NextResponse.json({ ok: true, total: data.total });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
