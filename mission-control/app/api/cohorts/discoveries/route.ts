import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-blog.db");

const DISCOVERIES_SCHEMA = `
CREATE TABLE IF NOT EXISTS discoveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  url TEXT,
  description TEXT,
  why_it_matters TEXT,
  content_category TEXT,
  tags TEXT DEFAULT '[]',
  audience_relevance_score INTEGER,
  confidence_score INTEGER,
  keywords TEXT DEFAULT '[]',
  content_opportunity TEXT,
  status TEXT DEFAULT 'active',
  date_discovered TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS research_keywords (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  keyword TEXT NOT NULL UNIQUE,
  category TEXT,
  signal_strength INTEGER DEFAULT 5,
  status TEXT DEFAULT 'active',
  times_used INTEGER DEFAULT 0,
  added_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT
);
`;

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.exec(DISCOVERIES_SCHEMA);
    // Migrate: add site_domain to discoveries and research_keywords if missing
    try {
      db.exec("ALTER TABLE discoveries ADD COLUMN site_domain TEXT DEFAULT 'mastermindshq.business'");
    } catch {}
    try {
      db.exec("ALTER TABLE research_keywords ADD COLUMN site_domain TEXT DEFAULT 'mastermindshq.business'");
    } catch {}
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) {
    db.exec(DISCOVERIES_SCHEMA);
    // Migrate: add site_domain to discoveries and research_keywords if missing
    try {
      db.exec("ALTER TABLE discoveries ADD COLUMN site_domain TEXT DEFAULT 'mastermindshq.business'");
    } catch {}
    try {
      db.exec("ALTER TABLE research_keywords ADD COLUMN site_domain TEXT DEFAULT 'mastermindshq.business'");
    } catch {}
  }
  return db;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ discoveries: [], total: 0, keywords: [] });

    const url = new URL(req.url);
    const type = url.searchParams.get("type");

    if (type === "keywords") {
      const siteDomain = url.searchParams.get("site_domain");
      const kwConditions: string[] = ["status = 'active'"];
      const kwParams: (string | number)[] = [];
      if (siteDomain) {
        kwConditions.push("site_domain = ?");
        kwParams.push(siteDomain);
      }
      const kwWhere = `WHERE ${kwConditions.join(" AND ")}`;
      const keywords = db
        .prepare(
          `SELECT * FROM research_keywords ${kwWhere} ORDER BY signal_strength DESC, times_used DESC`
        )
        .all(...kwParams);
      db.close();
      return NextResponse.json({ keywords });
    }

    const platform = url.searchParams.get("platform");
    const category = url.searchParams.get("category");
    const minScore = url.searchParams.get("minScore");
    const search = url.searchParams.get("search");
    const siteDomain = url.searchParams.get("site_domain");
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const conditions: string[] = ["status != 'deleted'"];
    const params: (string | number)[] = [];

    if (platform) {
      conditions.push("platform = ?");
      params.push(platform);
    }
    if (category) {
      conditions.push("content_category = ?");
      params.push(category);
    }
    if (minScore) {
      conditions.push("audience_relevance_score >= ?");
      params.push(parseInt(minScore, 10));
    }
    if (search) {
      conditions.push(
        "(source_name LIKE ? OR description LIKE ? OR why_it_matters LIKE ?)"
      );
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (siteDomain) {
      conditions.push("site_domain = ?");
      params.push(siteDomain);
    }

    const where = `WHERE ${conditions.join(" AND ")}`;

    const totalRow = db
      .prepare(`SELECT COUNT(*) as count FROM discoveries ${where}`)
      .get(...params) as { count: number } | undefined;
    const total = totalRow?.count || 0;

    const discoveries = db
      .prepare(
        `SELECT * FROM discoveries ${where} ORDER BY date_discovered DESC, audience_relevance_score DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset);

    db.close();
    return NextResponse.json({ discoveries, total });
  } catch (err) {
    console.error("discoveries GET error:", err);
    return NextResponse.json({ discoveries: [], total: 0, keywords: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    // Handle keyword operations
    if (body.action === "add_keyword") {
      db.prepare(
        "INSERT OR IGNORE INTO research_keywords (keyword, category, signal_strength, site_domain) VALUES (?, ?, ?, ?)"
      ).run(body.keyword, body.category || "manual", body.signal_strength || 5, body.site_domain || "mastermindshq.business");
      db.close();
      return NextResponse.json({ ok: true });
    }

    if (body.action === "remove_keyword") {
      db.prepare(
        "UPDATE research_keywords SET status = 'removed' WHERE id = ?"
      ).run(body.id);
      db.close();
      return NextResponse.json({ ok: true });
    }

    // Insert new discovery
    const result = db
      .prepare(
        `INSERT INTO discoveries (
          source_name, platform, url, description, why_it_matters,
          content_category, tags, audience_relevance_score, confidence_score,
          keywords, content_opportunity, status, date_discovered, site_domain
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.source_name,
        body.platform,
        body.url || null,
        body.description || null,
        body.why_it_matters || null,
        body.content_category || null,
        JSON.stringify(body.tags || []),
        body.audience_relevance_score ?? null,
        body.confidence_score ?? null,
        JSON.stringify(body.keywords || []),
        body.content_opportunity || null,
        body.status || "active",
        body.date_discovered || new Date().toISOString().split("T")[0],
        body.site_domain || "mastermindshq.business"
      );

    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("discoveries POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });
    db.prepare("DELETE FROM discoveries WHERE id = ?").run(id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("discoveries DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
