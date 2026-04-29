import { NextResponse } from "next/server";
import { getDb, logSync } from "../_db";
import { getFlowStatus } from "../_manychat";

// POST /api/manychat-giveaways/sync
// Loops all giveaways with manychat_flow_id, reconciles status from ManyChat
export async function POST() {
  try {
    const db = getDb();
    const giveaways = db
      .prepare(
        "SELECT * FROM giveaways WHERE manychat_flow_id IS NOT NULL AND status != 'archived'"
      )
      .all() as Array<Record<string, unknown>>;

    const results: Array<{
      id: number;
      keyword: string;
      previousStatus: string;
      newStatus: string | null;
      error?: string;
    }> = [];

    for (const giveaway of giveaways) {
      const giveawayId = giveaway.id as number;
      const flowId = giveaway.manychat_flow_id as string;
      const previousStatus = giveaway.status as string;

      const statusResult = await getFlowStatus(flowId);

      if (!statusResult.success) {
        logSync(db, giveawayId, "sync_status", "error", statusResult.error);
        results.push({
          id: giveawayId,
          keyword: giveaway.comment_keyword as string,
          previousStatus,
          newStatus: null,
          error: statusResult.error,
        });
        continue;
      }

      // Map ManyChat status to local status
      const remoteStatus = statusResult.data?.status;
      let localStatus: string = previousStatus;
      if (remoteStatus === "active" || remoteStatus === "published") {
        localStatus = "active";
      } else if (
        remoteStatus === "inactive" ||
        remoteStatus === "draft" ||
        remoteStatus === "paused"
      ) {
        localStatus = "paused";
      }

      if (localStatus !== previousStatus) {
        db.prepare(
          "UPDATE giveaways SET status = ?, updated_at = datetime('now') WHERE id = ?"
        ).run(localStatus, giveawayId);
      }

      logSync(db, giveawayId, "sync_status", "ok");
      results.push({
        id: giveawayId,
        keyword: giveaway.comment_keyword as string,
        previousStatus,
        newStatus: localStatus,
      });
    }

    db.close();

    return NextResponse.json({
      success: true,
      data: {
        synced: results.length,
        results,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
