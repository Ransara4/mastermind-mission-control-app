import { NextResponse } from "next/server";
import { getDb } from "../_db";

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ batches: [] });
    }

    const batches = db
      .prepare("SELECT * FROM batches ORDER BY created_at DESC")
      .all();
    db.close();

    return NextResponse.json({ batches });
  } catch (err) {
    console.error("cold-outreach batches GET error:", err);
    return NextResponse.json(
      { error: "Failed to load batches" },
      { status: 500 }
    );
  }
}
