import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-blog.db");

function getDb() {
  if (!fs.existsSync(DB_PATH)) return null;
  return new Database(DB_PATH, { readonly: true });
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const siteDomain = url.searchParams.get("site_domain") || null;

    const db = getDb();
    if (!db) {
      return NextResponse.json({
        stats: {
          pending: 0,
          queued: 0,
          publishedToday: 0,
          publishedWeek: 0,
          publishedTotal: 0,
          avgQuality: 0,
          rejected: 0,
        },
      });
    }

    const count = (sql: string, params: unknown[] = []) => {
      const row = db.prepare(sql).get(...params) as { c: number } | undefined;
      return row?.c || 0;
    };

    const domainClause = siteDomain ? " AND site_domain = ?" : "";
    const domainArgs = siteDomain ? [siteDomain] : [];

    const pending = count(`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'needs_review'${domainClause}`, domainArgs);
    const queued = count(`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'queued'${domainClause}`, domainArgs);
    const publishedToday = count(
      `SELECT COUNT(*) as c FROM blog_posts WHERE status = 'published' AND published_at >= date('now')${domainClause}`,
      domainArgs
    );
    const publishedWeek = count(
      `SELECT COUNT(*) as c FROM blog_posts WHERE status = 'published' AND published_at >= date('now', '-7 days')${domainClause}`,
      domainArgs
    );
    const publishedTotal = count(`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'published'${domainClause}`, domainArgs);
    const rejected = count(`SELECT COUNT(*) as c FROM blog_posts WHERE status = 'rejected'${domainClause}`, domainArgs);

    const avgSql = siteDomain
      ? "SELECT ROUND(AVG(CASE WHEN quality_score > 10 THEN quality_score / 10.0 ELSE quality_score END), 1) as avg FROM blog_posts WHERE quality_score IS NOT NULL AND site_domain = ?"
      : "SELECT ROUND(AVG(CASE WHEN quality_score > 10 THEN quality_score / 10.0 ELSE quality_score END), 1) as avg FROM blog_posts WHERE quality_score IS NOT NULL";
    const avgRow = (siteDomain
      ? db.prepare(avgSql).get(siteDomain)
      : db.prepare(avgSql).get()) as { avg: number | null } | undefined;
    const avgQuality = avgRow?.avg ?? 0;

    db.close();

    return NextResponse.json({
      stats: {
        pending,
        queued,
        publishedToday,
        publishedWeek,
        publishedTotal,
        avgQuality,
        rejected,
      },
    });
  } catch (err) {
    console.error("cohorts stats GET error:", err);
    return NextResponse.json({
      stats: {
        pending: 0,
        queued: 0,
        publishedToday: 0,
        publishedWeek: 0,
        publishedTotal: 0,
        avgQuality: 0,
        rejected: 0,
      },
    });
  }
}
