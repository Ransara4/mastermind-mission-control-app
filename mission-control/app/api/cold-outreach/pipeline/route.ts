import { NextRequest, NextResponse } from "next/server";
import { getDb } from "../_db";

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ latestRun: null });
    }

    const latestRun = db
      .prepare(
        "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1"
      )
      .get() as Record<string, unknown> | undefined;

    db.close();
    return NextResponse.json({ latestRun: latestRun || null });
  } catch (err) {
    console.error("cold-outreach pipeline GET error:", err);
    return NextResponse.json(
      { error: "Failed to load pipeline status" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { icp_id: icpId = null, skip_upload: skipUpload = false } = body as Record<string, unknown>;

    const db = getDb(false);
    if (!db) {
      return NextResponse.json(
        { error: "Failed to open database" },
        { status: 500 }
      );
    }

    // Migrate: add skip_upload column if missing
    try { db.exec("ALTER TABLE pipeline_runs ADD COLUMN skip_upload INTEGER DEFAULT 0"); } catch { /* already exists */ }

    const result = db
      .prepare(
        `INSERT INTO pipeline_runs (icp_id, status, skip_upload) VALUES (?, 'queued', ?)`
      )
      .run(icpId, skipUpload ? 1 : 0);

    const run = db
      .prepare("SELECT * FROM pipeline_runs WHERE id = ?")
      .get(result.lastInsertRowid) as Record<string, unknown>;

    db.close();

    return NextResponse.json({ success: true, run });
  } catch (err) {
    console.error("cold-outreach pipeline POST error:", err);
    return NextResponse.json(
      { error: "Failed to queue pipeline run" },
      { status: 500 }
    );
  }
}
