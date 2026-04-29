import { NextResponse } from "next/server";
import { getDb } from "./_db";

export async function GET() {
  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({
        stats: {
          totalLeads: 0,
          activeIcps: 0,
          lastPipelineRun: null,
          googleSheetUrl: null,
          batchCount: 0,
        },
      });
    }

    const icpStats = db
      .prepare(
        `SELECT COUNT(*) as activeIcps, COALESCE(SUM(total_leads), 0) as totalLeads FROM icps WHERE status = 'active'`
      )
      .get() as { activeIcps: number; totalLeads: number };

    const lastRun = db
      .prepare(
        `SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT 1`
      )
      .get() as Record<string, unknown> | undefined;

    const batchCount = db
      .prepare(`SELECT COUNT(*) as count FROM batches`)
      .get() as { count: number };

    const sheetSetting = db
      .prepare(`SELECT value FROM settings WHERE key = 'google_sheet_url'`)
      .get() as { value: string } | undefined;

    const batchSums = db
      .prepare(
        `SELECT COALESCE(SUM(candidates_searched), 0) as totalContacts, COALESCE(SUM(qualified), 0) as totalLeadsFound, COALESCE(SUM(disqualified), 0) as totalNotToSend, COALESCE(SUM(uploaded), 0) as totalUploaded FROM batches`
      )
      .get() as { totalContacts: number; totalLeadsFound: number; totalNotToSend: number; totalUploaded: number };

    const yesTargetSetting = db
      .prepare(`SELECT value FROM settings WHERE key = 'yeses_to_find_target'`)
      .get() as { value: string } | undefined;

    db.close();

    return NextResponse.json({
      stats: {
        totalLeads: icpStats.totalLeads,
        activeIcps: icpStats.activeIcps,
        lastPipelineRun: lastRun?.started_at || null,
        googleSheetUrl: sheetSetting?.value || null,
        batchCount: batchCount.count,
        totalContacts: batchSums.totalContacts,
        totalLeadsFound: batchSums.totalLeadsFound,
        yesesToSend: batchSums.totalLeadsFound - batchSums.totalUploaded,
        notToSend: batchSums.totalNotToSend,
        yesesToFindTarget: yesTargetSetting ? parseInt(yesTargetSetting.value, 10) : 0,
      },
    });
  } catch (err) {
    console.error("cold-outreach dashboard GET error:", err);
    return NextResponse.json(
      { error: "Failed to load dashboard stats" },
      { status: 500 }
    );
  }
}
