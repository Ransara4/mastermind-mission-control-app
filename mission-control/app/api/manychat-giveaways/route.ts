import { NextRequest, NextResponse } from "next/server";
import { execFileSync } from "child_process";
import path from "path";
import { getDb, logSync } from "./_db";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const BROWSER_SCRIPT = path.join(WS, "agents/manychat/src/browser.js");

function runBrowserScript(args: string[]): { success: boolean; [key: string]: unknown } {
  try {
    const out = execFileSync("node", [BROWSER_SCRIPT, ...args], {
      timeout: 90_000,
      encoding: "utf8",
    });
    return JSON.parse(out);
  } catch (err: unknown) {
    const e = err as { stdout?: string; message?: string };
    try { return JSON.parse(e.stdout || "{}"); } catch { /* ignore */ }
    return { success: false, error: String(e.message || err) };
  }
}

// GET /api/manychat-giveaways — list all giveaways
export async function GET() {
  try {
    const db = getDb();
    const giveaways = db
      .prepare("SELECT * FROM giveaways ORDER BY created_at DESC")
      .all();
    db.close();
    return NextResponse.json({ success: true, data: giveaways });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// POST /api/manychat-giveaways — create a giveaway or save a draft
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      comment_keyword,
      giveaway_name,
      giveaway_description,
      giveaway_link,
      dynamic_tag,
      manychat_flow_id,
      draft,
    } = body;

    if (draft) {
      // Draft: only keyword, name, and tag required — no link, no automation
      if (!comment_keyword || !giveaway_name || !dynamic_tag) {
        return NextResponse.json(
          { success: false, error: "Required fields: comment_keyword, giveaway_name, dynamic_tag" },
          { status: 400 }
        );
      }
      const db = getDb();
      const result = db
        .prepare(
          `INSERT INTO giveaways (comment_keyword, giveaway_name, giveaway_description, giveaway_link, dynamic_tag, manychat_flow_id, status)
           VALUES (@comment_keyword, @giveaway_name, @giveaway_description, @giveaway_link, @dynamic_tag, @manychat_flow_id, 'draft')`
        )
        .run({
          comment_keyword,
          giveaway_name,
          giveaway_description: giveaway_description ?? null,
          giveaway_link: giveaway_link?.trim() || null,
          dynamic_tag,
          manychat_flow_id: manychat_flow_id?.trim() || null,
        });
      const created = db.prepare("SELECT * FROM giveaways WHERE id = ?").get(result.lastInsertRowid);
      logSync(db, result.lastInsertRowid as number, "save_draft", "ok");
      db.close();
      return NextResponse.json({ success: true, data: created }, { status: 201 });
    }

    if (!comment_keyword || !giveaway_name || !giveaway_link || !dynamic_tag) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Required fields: comment_keyword, giveaway_name, giveaway_link, dynamic_tag",
        },
        { status: 400 }
      );
    }

    // Auto-create ManyChat automation via browser service
    let resolvedFlowId = manychat_flow_id ?? null;
    let autoCreateError: string | null = null;

    if (!resolvedFlowId) {
      const browserResult = runBrowserScript([
        "auto-create",
        "--keyword", comment_keyword,
        "--name", giveaway_name,
        "--link", giveaway_link,
        "--tag", dynamic_tag,
        ...(giveaway_description ? ["--description", giveaway_description] : []),
      ]);

      if (browserResult.success && browserResult.flowNs) {
        resolvedFlowId = browserResult.flowNs as string;
      } else {
        autoCreateError = String(browserResult.error || "Unknown browser error");
      }
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO giveaways (comment_keyword, giveaway_name, giveaway_description, giveaway_link, dynamic_tag, manychat_flow_id)
         VALUES (@comment_keyword, @giveaway_name, @giveaway_description, @giveaway_link, @dynamic_tag, @manychat_flow_id)`
      )
      .run({
        comment_keyword,
        giveaway_name,
        giveaway_description: giveaway_description ?? null,
        giveaway_link,
        dynamic_tag,
        manychat_flow_id: resolvedFlowId,
      });

    const created = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(result.lastInsertRowid);

    logSync(
      db,
      result.lastInsertRowid as number,
      "create",
      resolvedFlowId ? "ok" : "partial",
      autoCreateError ?? undefined
    );
    db.close();

    return NextResponse.json(
      {
        success: true,
        data: created,
        ...(autoCreateError ? { warning: `Automation auto-create failed: ${autoCreateError}. Flow NS must be linked manually.` } : {}),
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// PATCH /api/manychat-giveaways — update fields by id
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...fields } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const allowed = [
      "comment_keyword",
      "giveaway_name",
      "giveaway_description",
      "giveaway_link",
      "dynamic_tag",
      "manychat_flow_id",
      "status",
    ];

    const setClauses = allowed
      .filter((k) => k in fields)
      .map((k) => `${k} = @${k}`)
      .join(", ");

    if (!setClauses) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const db = getDb();
    const params: Record<string, unknown> = { id };
    for (const k of allowed) {
      if (k in fields) params[k] = fields[k] ?? null;
    }

    db.prepare(
      `UPDATE giveaways SET ${setClauses}, updated_at = datetime('now') WHERE id = @id`
    ).run(params);

    const updated = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(id);
    db.close();

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// DELETE /api/manychat-giveaways — soft-archive (body: {id}) or hard-delete (?id=<id>&hard=true)
export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const hardDelete = url.searchParams.get("hard") === "true";
    const queryId = url.searchParams.get("id");

    if (hardDelete) {
      // Hard delete via query params
      if (!queryId) {
        return NextResponse.json(
          { success: false, error: "id query param is required" },
          { status: 400 }
        );
      }

      const id = Number(queryId);
      const db = getDb();
      const existing = db
        .prepare("SELECT * FROM giveaways WHERE id = ?")
        .get(id);

      if (!existing) {
        db.close();
        return NextResponse.json(
          { success: false, error: "Giveaway not found" },
          { status: 404 }
        );
      }

      db.prepare("DELETE FROM giveaways WHERE id = ?").run(id);
      logSync(db, id, "hard_delete", "ok");
      db.close();

      return NextResponse.json({ success: true });
    }

    // Soft-archive via body
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "id is required" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      "UPDATE giveaways SET status = 'archived', updated_at = datetime('now') WHERE id = @id"
    ).run({ id });

    const archived = db
      .prepare("SELECT * FROM giveaways WHERE id = ?")
      .get(id);

    logSync(db, id, "archive", "ok");
    db.close();

    return NextResponse.json({ success: true, data: archived });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
