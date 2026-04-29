import { NextResponse } from "next/server";
import { getDb } from "../_db";

interface StalenessRow {
  id: string;
  name: string;
  icp_tag: string;
  latest_batch: string | null;
  days_since_batch: number | null;
}

function getStalenessData() {
  const db = getDb();
  if (!db) return [];

  const rows = db
    .prepare(
      `SELECT
        i.id,
        i.name,
        i.icp_tag,
        MAX(b.created_at) as latest_batch,
        CAST(julianday('now') - julianday(MAX(b.created_at)) AS INTEGER) as days_since_batch
      FROM icps i
      LEFT JOIN batches b ON b.icp_id = i.id
      WHERE i.status = 'active'
      GROUP BY i.id
      ORDER BY days_since_batch DESC`
    )
    .all() as StalenessRow[];

  db.close();
  return rows;
}

export async function GET() {
  try {
    const staleness = getStalenessData();
    return NextResponse.json({ staleness });
  } catch (err) {
    console.error("cold-outreach staleness GET error:", err);
    return NextResponse.json(
      { error: "Failed to load staleness data" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const staleness = getStalenessData();
    return NextResponse.json({
      staleness,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("cold-outreach staleness POST error:", err);
    return NextResponse.json(
      { error: "Failed to run staleness check" },
      { status: 500 }
    );
  }
}
