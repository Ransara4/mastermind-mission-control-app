import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../_db";

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ settings: {} });
    }

    const rows = db.prepare("SELECT key, value FROM settings").all() as {
      key: string;
      value: string;
    }[];
    db.close();

    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    return NextResponse.json({ settings });
  } catch (err) {
    console.error("cold-outreach settings GET error:", err);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = body as Record<string, string>;

    if (!settings || typeof settings !== "object") {
      return NextResponse.json(
        { error: "Request body must be a key-value object" },
        { status: 400 }
      );
    }

    const db = getDb(false);
    if (!db) {
      return NextResponse.json(
        { error: "Failed to open database" },
        { status: 500 }
      );
    }

    const upsert = db.prepare(
      "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)"
    );

    const transaction = db.transaction(
      (entries: [string, string][]) => {
        for (const [key, value] of entries) {
          upsert.run(key, String(value));
        }
      }
    );

    transaction(Object.entries(settings));
    db.close();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("cold-outreach settings PUT error:", err);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
