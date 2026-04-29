import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { checkQueueAlert } from "../_utils";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DB_PATH = path.join(WS, "data/mastermind-blog.db");

function getDb(readonly = true) {
  if (!fs.existsSync(DB_PATH)) return null;
  const db = new Database(DB_PATH, readonly ? { readonly: true } : {});
  return db;
}

export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const db = getDb(false);
    if (!db) return NextResponse.json({ error: "DB error" }, { status: 500 });

    const post = db.prepare("SELECT id, status, site_domain FROM blog_posts WHERE id = ?").get(id) as
      | { id: number; status: string; site_domain?: string }
      | undefined;

    if (!post) {
      db.close();
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    if (post.status !== "approved" && post.status !== "queued") {
      db.close();
      return NextResponse.json(
        { error: `Post must be approved or queued to publish (current: ${post.status})` },
        { status: 400 }
      );
    }

    const siteDomain = post.site_domain || "mastermindshq.business";

    db.prepare("UPDATE blog_posts SET status = 'publishing' WHERE id = ?").run(id);
    db.close();

    checkQueueAlert().catch(() => {});

    const publisherPath = path.join(WS, "agents/wix/src/publisher.js");

    const child = spawn("node", [publisherPath, `--id=${id}`, `--domain=${siteDomain}`], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    return NextResponse.json({ ok: true, message: "Publishing started" });
  } catch (err) {
    console.error("cohorts publish POST error:", err);
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
