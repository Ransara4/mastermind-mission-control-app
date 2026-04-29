import { NextRequest, NextResponse } from "next/server";
import { getDb, logSync } from "../_db";
import { cloneFlow, setFlowKeyword } from "../_manychat";

// POST /api/manychat-giveaways/clone
// Clones a master flow, sets keyword, stores flow ID back to DB
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { giveaway_id, master_flow_id } = body;

    if (!giveaway_id || !master_flow_id) {
      return NextResponse.json(
        { success: false, error: "giveaway_id and master_flow_id are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const giveaway = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(giveaway_id) as Record<string, unknown> | undefined;

    if (!giveaway) {
      db.close();
      return NextResponse.json(
        { success: false, error: "Giveaway not found" },
        { status: 404 }
      );
    }

    // Clone the master flow
    const cloneResult = await cloneFlow(master_flow_id);
    if (!cloneResult.success || !cloneResult.data?.flow_id) {
      logSync(db, giveaway_id, "clone", "error", cloneResult.error ?? "No flow_id returned");
      db.close();
      return NextResponse.json(
        { success: false, error: cloneResult.error ?? "Clone failed — no flow_id returned" },
        { status: 502 }
      );
    }

    const newFlowId = cloneResult.data.flow_id;

    // Set keyword on the cloned flow
    const keywordResult = await setFlowKeyword(
      newFlowId,
      giveaway.comment_keyword as string
    );
    if (!keywordResult.success) {
      logSync(db, giveaway_id, "set_keyword", "error", keywordResult.error);
      db.close();
      return NextResponse.json(
        { success: false, error: `Cloned but keyword set failed: ${keywordResult.error}` },
        { status: 502 }
      );
    }

    // Store flow ID back to DB
    db.prepare(
      "UPDATE giveaways SET manychat_flow_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newFlowId, giveaway_id);

    const updated = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(giveaway_id);

    logSync(db, giveaway_id, "clone", "ok");
    db.close();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
