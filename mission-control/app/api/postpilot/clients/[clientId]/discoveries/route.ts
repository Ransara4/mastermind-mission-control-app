import { NextRequest, NextResponse } from "next/server";
import { getClientDb } from "../_db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const db = getClientDb(clientId, true);
    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    if (type === "keywords") {
      const keywords = db
        .prepare("SELECT * FROM research_keywords ORDER BY signal_strength DESC, times_used DESC")
        .all();
      db.close();
      return NextResponse.json({ keywords });
    }

    const platform = url.searchParams.get("platform");
    const category = url.searchParams.get("category");
    const minScore = url.searchParams.get("minScore");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const conditions: string[] = ["status != 'deleted'"];
    const args: (string | number)[] = [];

    if (platform) { conditions.push("platform = ?"); args.push(platform); }
    if (category) { conditions.push("content_category = ?"); args.push(category); }
    if (minScore) { conditions.push("audience_relevance_score >= ?"); args.push(parseInt(minScore, 10)); }
    if (search) {
      conditions.push("(source_name LIKE ? OR description LIKE ? OR why_it_matters LIKE ?)");
      const term = `%${search}%`;
      args.push(term, term, term);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const totalRow = db
      .prepare(`SELECT COUNT(*) as count FROM discoveries ${where}`)
      .get(...args) as { count: number } | undefined;
    const total = totalRow?.count ?? 0;

    const discoveries = db
      .prepare(
        `SELECT * FROM discoveries ${where} ORDER BY date_discovered DESC, audience_relevance_score DESC LIMIT ? OFFSET ?`
      )
      .all(...args, limit, offset);

    db.close();
    return NextResponse.json({ discoveries, total });
  } catch (err) {
    console.error("postpilot discoveries GET error:", err);
    return NextResponse.json({ discoveries: [], total: 0, keywords: [] });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const body = await req.json();
    const db = getClientDb(clientId, false);

    if (body.action === "add_keyword") {
      db.prepare(
        "INSERT OR IGNORE INTO research_keywords (keyword, category, signal_strength) VALUES (?, ?, ?)"
      ).run(body.keyword, body.category || "manual", body.signal_strength || 5);
      db.close();
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove_keyword") {
      db.prepare("UPDATE research_keywords SET status = 'removed' WHERE id = ?").run(body.id);
      db.close();
      return NextResponse.json({ ok: true });
    }

    const result = db
      .prepare(
        `INSERT INTO discoveries (
          source_name, platform, url, description, why_it_matters,
          content_category, tags, audience_relevance_score, confidence_score,
          keywords, content_opportunity, status, date_discovered
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.source_name, body.platform,
        body.url ?? null, body.description ?? null, body.why_it_matters ?? null,
        body.content_category ?? null, JSON.stringify(body.tags ?? []),
        body.audience_relevance_score ?? null, body.confidence_score ?? null,
        JSON.stringify(body.keywords ?? []), body.content_opportunity ?? null,
        body.status ?? "active",
        body.date_discovered ?? new Date().toISOString().split("T")[0]
      );

    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("postpilot discoveries POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const { id } = await req.json();
    const db = getClientDb(clientId, false);
    db.prepare("DELETE FROM discoveries WHERE id = ?").run(id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("postpilot discoveries DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
