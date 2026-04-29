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
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (status && status !== "all") {
      conditions.push("status = ?");
      args.push(status);
    }
    if (search) {
      conditions.push("(title LIKE ? OR excerpt LIKE ?)");
      args.push(`%${search}%`, `%${search}%`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const total = (
      db.prepare(`SELECT COUNT(*) as c FROM blog_posts ${where}`).get(...args) as { c: number }
    ).c;

    const posts = db
      .prepare(`SELECT * FROM blog_posts ${where} ORDER BY generated_at DESC LIMIT ?`)
      .all(...args, limit);

    const stats = db
      .prepare(
        `SELECT
          SUM(CASE WHEN status = 'needs_review' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
          SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          COUNT(*) as total,
          ROUND(AVG(CASE WHEN quality_score IS NOT NULL THEN quality_score END), 1) as avg_quality
        FROM blog_posts`
      )
      .get() as Record<string, number | null>;

    db.close();
    return NextResponse.json({ posts, total, stats });
  } catch (err) {
    console.error("postpilot posts GET error:", err);
    return NextResponse.json({ posts: [], total: 0, stats: {} });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;
  try {
    const body = await req.json();
    const { action, postId, reason } = body;
    const db = getClientDb(clientId, false);

    if (action === "approve") {
      db.prepare("UPDATE blog_posts SET status = 'queued' WHERE id = ?").run(postId);
    } else if (action === "reject") {
      db.prepare(
        "UPDATE blog_posts SET status = 'rejected', rejection_reason = ? WHERE id = ?"
      ).run(reason ?? null, postId);
    } else if (action === "publish") {
      db.prepare(
        "UPDATE blog_posts SET status = 'published', published_at = datetime('now') WHERE id = ?"
      ).run(postId);
    } else if (action === "restore") {
      db.prepare("UPDATE blog_posts SET status = 'needs_review' WHERE id = ?").run(postId);
    } else if (action === "delete") {
      db.prepare("DELETE FROM blog_posts WHERE id = ?").run(postId);
    } else {
      db.close();
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    db.close();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("postpilot posts POST error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
