import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";
import { getDb, logSync } from "../_db";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const BROWSER_SCRIPT = path.join(WS, "agents/manychat/src/browser.js");

function runBrowserScript(args: string[]): { success: boolean; [key: string]: unknown } {
  try {
    const out = execFileSync("node", [BROWSER_SCRIPT, ...args], {
      timeout: 60_000,
      encoding: "utf8",
    });
    return JSON.parse(out);
  } catch (err: unknown) {
    const e = err as { stdout?: string; message?: string };
    try { return JSON.parse(e.stdout || "{}"); } catch { /* ignore */ }
    return { success: false, error: String(e.message || err) };
  }
}

// POST /api/manychat-giveaways/deactivate
// Deactivates growth tool widget in ManyChat, sets status = 'paused' in DB
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, giveaway_id } = body;
    const rowId = id ?? giveaway_id;

    if (!rowId) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const giveaway = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(rowId) as Record<string, unknown> | undefined;

    if (!giveaway) {
      db.close();
      return NextResponse.json(
        { success: false, error: "Giveaway not found" },
        { status: 404 }
      );
    }

    if (!giveaway.manychat_flow_id) {
      db.close();
      return NextResponse.json(
        { success: false, error: "Giveaway has no Flow NS — link a ManyChat flow first" },
        { status: 400 }
      );
    }

    const flowNs = giveaway.manychat_flow_id as string;
    const result = runBrowserScript(["set-widget-status", "--ns", flowNs, "--status", "stopped"]);
    if (!result.success) {
      logSync(db, rowId, "deactivate", "error", result.error as string | undefined);
      db.close();
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 502 }
      );
    }

    db.prepare(
      "UPDATE giveaways SET status = 'paused', updated_at = datetime('now') WHERE id = ?"
    ).run(rowId);

    const updated = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(rowId);

    logSync(db, rowId, "deactivate", "ok");
    db.close();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
