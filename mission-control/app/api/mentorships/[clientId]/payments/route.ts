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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  try {
    const body = await request.json();
    const { date, amount, hours_purchased, method, notes } = body;

    const db = await readDB();

    const client = db.clients?.find((c: any) => c.id === clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (!db.payments) {
      db.payments = [];
    }

    const clientPaymentCount = db.payments.filter(
      (p: any) => p.client_id === clientId
    ).length;

    const payment = {
      id: `pay-${clientId}-${String(clientPaymentCount + 1).padStart(3, "0")}`,
      client_id: clientId,
      date: date ?? new Date().toISOString().split("T")[0],
      amount: amount ?? 0,
      currency: "usd",
      hours_purchased: hours_purchased ?? 0,
      method: method ?? "stripe",
      notes: notes ?? "",
      created_at: new Date().toISOString(),
    };

    db.payments.push(payment);

    const clientIndex = db.clients.findIndex((c: any) => c.id === clientId);
    const now = new Date().toISOString();
    db.clients[clientIndex].hours_purchased =
      (db.clients[clientIndex].hours_purchased ?? 0) + (hours_purchased ?? 0);
    db.clients[clientIndex].hours_remaining =
      (db.clients[clientIndex].hours_remaining ?? 0) + (hours_purchased ?? 0);
    db.clients[clientIndex].total_paid =
      (db.clients[clientIndex].total_paid ?? 0) + (amount ?? 0);
    db.clients[clientIndex].updated_at = now;

    await writeDB(db);

    return NextResponse.json({ success: true, payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
