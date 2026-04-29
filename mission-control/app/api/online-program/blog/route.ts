import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { checkQueueAlert } from "../_utils";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/online-program-blog.db");

const SCHEMA = `CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wix_post_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  excerpt TEXT,
  content_markdown TEXT,
  content_ricos TEXT,
  category_ids TEXT DEFAULT '[]',
  tag_ids TEXT DEFAULT '[]',
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  og_title TEXT,
  og_description TEXT,
  twitter_title TEXT,
  twitter_description TEXT,
  cta_type TEXT DEFAULT 'online-programvsl',
  internal_links TEXT DEFAULT '[]',
  quality_score INTEGER,
  quality_notes TEXT,
  status TEXT DEFAULT 'needs_review',
  rejection_reason TEXT,
  generated_at TEXT DEFAULT (datetime('now')),
  approved_at TEXT,
  queued_at TEXT,
  published_at TEXT,
  topic_source TEXT,
  content_pillar TEXT,
  word_count INTEGER,
  target_segment TEXT,
  validation_status TEXT,
  validation_notes TEXT,
  cover_image_url TEXT,
  image_keywords TEXT,
  cover_image_source TEXT,
  cover_image_photographer TEXT,
  cover_image_source_url TEXT,
  cover_image_options TEXT DEFAULT '[]'
)`;

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) {
    if (readonly) return null;
    const db = new Database(DB_PATH);
    db.exec(SCHEMA);
    return db;
  }
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  if (!readonly) db.exec(SCHEMA);
  return db;
}

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    if (!db) return NextResponse.json({ posts: [], total: 0 });

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const post = db.prepare("SELECT * FROM blog_posts WHERE id = ?").get(parseInt(id, 10));
      db.close();
      return NextResponse.json({ post: post || null });
    }

    const status = url.searchParams.get("status");
    const pillar = url.searchParams.get("pillar");
    const minScore = url.searchParams.get("minScore");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (status) {
      conditions.push("status = ?");
      params.push(status);
    }
    if (pillar) {
      conditions.push("content_pillar = ?");
      params.push(pillar);
    }
    if (minScore) {
      conditions.push("quality_score >= ?");
      params.push(parseInt(minScore, 10));
    }
    if (search) {
      conditions.push("(title LIKE ? OR excerpt LIKE ? OR content_markdown LIKE ?)");
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM blog_posts ${where}`).get(...params) as { count: number } | undefined;
    const total = totalRow?.count || 0;

    const posts = db.prepare(
      `SELECT * FROM blog_posts ${where} ORDER BY generated_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    db.close();
    return NextResponse.json({ posts, total });
  } catch (err) {
    console.error("online-program blog GET error:", err);
    return NextResponse.json({ posts: [], total: 0 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    const stmt = db.prepare(
      `INSERT INTO blog_posts (
        wix_post_id, title, slug, excerpt, content_markdown, content_ricos,
        category_ids, tag_ids, seo_title, seo_description, seo_keywords,
        og_title, og_description, twitter_title, twitter_description,
        cta_type, internal_links, quality_score, quality_notes, status,
        rejection_reason, topic_source, content_pillar, word_count,
        target_segment, validation_status, validation_notes, image_keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const result = stmt.run(
      body.wix_post_id || null,
      body.title,
      body.slug,
      body.excerpt || null,
      body.content_markdown || null,
      body.content_ricos || null,
      body.category_ids || "[]",
      body.tag_ids || "[]",
      body.seo_title || null,
      body.seo_description || null,
      body.seo_keywords || null,
      body.og_title || null,
      body.og_description || null,
      body.twitter_title || null,
      body.twitter_description || null,
      body.cta_type || "online-programvsl",
      body.internal_links || "[]",
      body.quality_score ?? null,
      body.quality_notes || null,
      body.status || "needs_review",
      body.rejection_reason || null,
      body.topic_source || null,
      body.content_pillar || null,
      body.word_count ?? null,
      body.target_segment || null,
      body.validation_status || null,
      body.validation_notes || null,
      body.image_keywords || null
    );

    db.close();
    return NextResponse.json({ id: result.lastInsertRowid });
  } catch (err) {
    console.error("online-program blog POST error:", err);
    return NextResponse.json({ error: "Failed to create" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    // Handle status transition logic
    if (body.status === "queued" && !body.queued_at) {
      body.queued_at = new Date().toISOString().replace("T", " ").slice(0, 19);
    }
    // rejection_reason is optional — do not block if absent

    // Write markdown file when post is queued (not at generation time)
    if (body.status === "queued") {
      try {
        const post = db.prepare("SELECT * FROM blog_posts WHERE id = ?").get(body.id) as Record<string, unknown> | undefined;
        if (post) {
          const SITE_BASE = "https://www.online-programhq.business";
          const blogDir = path.join(WS, "projects/online-program/blog");
          const dateStr = new Date().toISOString().split("T")[0];
          const slug = (post.slug as string) || (post.title as string).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          // Apply any content edits from this request before writing
          const title = (body.title as string | undefined) || (post.title as string);
          const content = (body.content_markdown as string | undefined) || (post.content_markdown as string);
          const seoTitle = (body.seo_title as string | undefined) || (post.seo_title as string);
          const seoDesc = (body.seo_description as string | undefined) || (post.seo_description as string);
          const seoKw = (body.seo_keywords as string | undefined) || (post.seo_keywords as string);
          const pillar = (post.content_pillar as string);
          const segment = (post.target_segment as string);
          const score = post.quality_score as number | null;
          const postUrl = `${SITE_BASE}/post/${slug}`;

          // Replace relative /blog/ and /post/ links with full URLs, and /services/ /mentorship/ etc.
          const fullContent = content
            .replace(/\]\(\/post\//g, `](${SITE_BASE}/post/`)
            .replace(/\]\(\/blog\//g, `](${SITE_BASE}/post/`)
            .replace(/\]\(\/services\b/g, `](${SITE_BASE}/services`)
            .replace(/\]\(\/mentorship\b/g, `](${SITE_BASE}/mentorship`)
            .replace(/\]\(\/application\b/g, `](${SITE_BASE}/application`)
            .replace(/\]\(\/online-programvsl\b/g, `](${SITE_BASE}/online-programvsl`);

          const mdContent = `# ${title}\n\n**Status:** Queued\n**URL:** ${postUrl}\n**Queued:** ${dateStr}\n**Quality Score:** ${score ?? "N/A"}\n**Pillar:** ${pillar}\n**Target:** ${segment}\n\n## SEO\n- **Title:** ${seoTitle}\n- **Description:** ${seoDesc}\n- **Keywords:** ${seoKw}\n\n## Content\n\n${fullContent}\n`;

          fs.writeFileSync(path.join(blogDir, `${dateStr}-${slug}.md`), mdContent);
        }
      } catch (mdErr) {
        console.warn("Markdown write on queue failed (non-fatal):", mdErr);
      }
    }

    const { id, ...fields } = body;
    const keys = Object.keys(fields);
    if (keys.length === 0) {
      db.close();
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const prevPost = db.prepare("SELECT status FROM blog_posts WHERE id = ?").get(id) as { status: string } | undefined;
    const wasQueued = prevPost?.status === "queued";

    const setClauses = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k] ?? null);

    db.prepare(`UPDATE blog_posts SET ${setClauses} WHERE id = ?`).run(...values, id);
    db.close();

    if (wasQueued && body.status && body.status !== "queued") {
      checkQueueAlert().catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("online-program blog PUT error:", err);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });
    db.prepare("DELETE FROM blog_posts WHERE id = ?").run(id);
    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("online-program blog DELETE error:", err);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
