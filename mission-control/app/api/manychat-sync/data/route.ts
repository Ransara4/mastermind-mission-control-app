import { NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/instagram.db");

export async function GET() {
  try {
    const db = new Database(DB_PATH, { readonly: true });
    const leads = db
      .prepare(
        "SELECT * FROM manychat_leads ORDER BY created_at DESC LIMIT 50"
      )
      .all();
    const igContacts = db
      .prepare(
        "SELECT * FROM instagram_contacts ORDER BY first_seen_at DESC LIMIT 50"
      )
      .all();
    const stats = {
      totalLeads: (
        db.prepare("SELECT COUNT(*) as c FROM manychat_leads").get() as {
          c: number;
        }
      ).c,
      totalIgContacts: (
        db.prepare("SELECT COUNT(*) as c FROM instagram_contacts").get() as {
          c: number;
        }
      ).c,
    };
    db.close();
    return NextResponse.json({ leads, igContacts, stats });
  } catch {
    return NextResponse.json({
      leads: [],
      igContacts: [],
      stats: { totalLeads: 0, totalIgContacts: 0 },
    });
  }
}
