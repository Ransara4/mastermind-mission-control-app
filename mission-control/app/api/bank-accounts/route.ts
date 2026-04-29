import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/bank-accounts.db");

function getDb() {
  if (!fs.existsSync(DB_PATH)) return null;
  return new Database(DB_PATH, { readonly: true });
}

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ accounts: [], paymentMethods: [] });
    }

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table'")
      .all()
      .map((t: unknown) => (t as { name: string }).name);

    let accounts: unknown[] = [];
    let paymentMethods: unknown[] = [];

    if (tables.includes("accounts")) {
      accounts = db.prepare("SELECT * FROM accounts ORDER BY status, bank_name, account_name").all();
    }
    if (tables.includes("payment_methods")) {
      paymentMethods = db.prepare("SELECT * FROM payment_methods ORDER BY method_name").all();
    }

    db.close();
    return NextResponse.json({ accounts, paymentMethods });
  } catch (err) {
    console.error("bank-accounts API error:", err);
    return NextResponse.json({ accounts: [], paymentMethods: [] });
  }
}
