import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

// Load env vars from .env file if not already set
try {
  const envPath = path.join(WS, ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.+)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2].trim();
      }
    }
  }
} catch { /* ignore */ }

const DB_PATH = path.join(WS, "data/online-program-blog.db");

/** Ping Unsplash download endpoint (required by API guidelines). Fire-and-forget. */
async function triggerUnsplashDownload(downloadLocation: string) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key || !downloadLocation) return;
  try {
    await fetch(`${downloadLocation}`, {
      headers: { Authorization: `Client-ID ${key}` },
    });
  } catch {
    // Non-blocking — log but don't fail the request
    console.warn("Unsplash download trigger failed (non-fatal)");
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, imageUrl, image_keywords, source, photographer, sourceUrl, downloadLocation } = body;

    if (!id || !imageUrl) {
      return NextResponse.json(
        { error: "id and imageUrl are required" },
        { status: 400 }
      );
    }

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    // Trigger Unsplash download event (required by Unsplash API guidelines)
    if (source === "Unsplash" && downloadLocation) {
      triggerUnsplashDownload(downloadLocation); // fire-and-forget
    }

    const db = new Database(DB_PATH);

    db.prepare(`
      UPDATE blog_posts
      SET cover_image_url = ?,
          cover_image_source = ?,
          cover_image_photographer = ?,
          cover_image_source_url = ?
      WHERE id = ?
    `).run(imageUrl, source || null, photographer || null, sourceUrl || null, id);

    if (image_keywords) {
      db.prepare("UPDATE blog_posts SET image_keywords = ? WHERE id = ?").run(image_keywords, id);
    }

    db.close();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("set-cover error:", err);
    return NextResponse.json(
      { error: "Failed to set cover image" },
      { status: 500 }
    );
  }
}
