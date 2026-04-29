import { NextRequest, NextResponse } from "next/server";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const execAsync = promisify(exec);

const DB_PATH = path.join(WS, "data/mastermind-blog.db");


interface Photo {
  url: string;
  photographer: string;
  photographerUrl?: string;
  sourceUrl: string;
  downloadLocation?: string;
  source: "Pexels" | "Unsplash" | "Web" | "HuggingFace";
  domain?: string;
}

/** Run a Node script, parse its JSON output. Returns [] on any failure.
 *  Handles agents that print non-JSON text before the JSON (e.g. Pexels status line). */
async function runAgent(cmd: string): Promise<any[]> {
  try {
    const { stdout } = await execAsync(cmd, { timeout: 15000 });
    // Find the first `{` or `[` — some agents print text before the JSON
    const jsonStart = stdout.search(/[{[]/);
    if (jsonStart === -1) return [];
    const parsed = JSON.parse(stdout.slice(jsonStart));
    const list = parsed.photos || parsed.results || parsed;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, keywords } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    if (!fs.existsSync(DB_PATH)) {
      return NextResponse.json({ error: "DB not found" }, { status: 500 });
    }

    const db = new Database(DB_PATH, { readonly: true });

    const post = db.prepare("SELECT * FROM blog_posts WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!post) {
      db.close();
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let query = keywords || (post.image_keywords as string) || (post.title as string);

    const banWordsRow = db.prepare("SELECT value FROM blog_settings WHERE key = 'image_ban_words'").get() as { value: string } | undefined;
    const styleAnchorsRow = db.prepare("SELECT value FROM blog_settings WHERE key = 'image_style_anchors'").get() as { value: string } | undefined;
    db.close();

    const banWords: string[] = banWordsRow ? JSON.parse(banWordsRow.value) : [];
    const styleAnchors: string[] = styleAnchorsRow ? JSON.parse(styleAnchorsRow.value) : [];

    if (banWords.length > 0) {
      const banSet = new Set(banWords.map((w: string) => w.toLowerCase()));
      query = query.split(/\s+/).filter((w: string) => !banSet.has(w.toLowerCase())).join(" ");
    }

    if (styleAnchors.length > 0) {
      const anchor = styleAnchors[Math.floor(Math.random() * styleAnchors.length)];
      query = `${query} ${anchor}`;
    }

    // Clean keywords query (no style anchors) used for Unsplash — anchors skew semantic results
    const cleanQuery = query.split(" ").filter((w: string) => !styleAnchors.includes(w)).join(" ").trim() || query;
    const q = query.replace(/"/g, '\\"');
    const qClean = cleanQuery.replace(/"/g, '\\"');

    // Run all four sources truly in parallel
    const [pexelsRaw, unsplashRaw, webRaw, hfRaw] = await Promise.all([
      runAgent(`node ${WS}/agents/pexel/src/index.js search "${q}" --count=6 --orientation=landscape --json`),
      runAgent(`node ${WS}/agents/unsplash/src/search.js "${qClean}" --count=6`),
      runAgent(`node ${WS}/agents/web-images/src/search.js "${q}" --count=3`),
      (async () => {
        // HuggingFace: generate 1 AI image from the query
        try {
          const hfScript = path.join(WS, "agents/huggingface/src/index.js");
          if (!fs.existsSync(hfScript)) return [];
          const outputPath = path.join(WS, "data", `hf-cover-${id}-${Date.now()}.jpg`);
          const { stdout } = await execAsync(
            `node ${hfScript} generate "${q} editorial photography natural light" --output="${outputPath}" --json`,
            { timeout: 30000 }
          );
          const jsonStart = stdout.search(/[{[]/);
          if (jsonStart === -1) return [];
          const result = JSON.parse(stdout.slice(jsonStart));
          if (result.path && fs.existsSync(result.path)) {
            return [{ url: `/api/repo/image?path=${encodeURIComponent(result.path)}`, source: "HuggingFace", photographer: "FLUX.1-schnell" }];
          }
          return [];
        } catch { return []; }
      })(),
    ]);

    const pexelsPhotos: Photo[] = pexelsRaw
      .filter((p: any) => p.url || p.src)
      .map((p: any) => ({
        url: p.url || p.src?.large2x || p.src?.large || p.src?.original || "",
        photographer: p.photographer || "Unknown",
        sourceUrl: p.pexelsUrl || p.sourceUrl || "",
        source: "Pexels" as const,
      }));

    const unsplashPhotos: Photo[] = unsplashRaw
      .filter((p: any) => p.url)
      .map((p: any) => ({
        url: p.url,
        photographer: p.photographer || "Unknown",
        photographerUrl: p.photographerUrl || "",
        sourceUrl: p.sourceUrl || "",
        downloadLocation: p.downloadLocation || "",
        source: "Unsplash" as const,
      }));

    const webPhotos: Photo[] = webRaw
      .filter((p: any) => p.url)
      .map((p: any) => ({
        url: p.url,
        photographer: p.domain || p.photographer || "Web",
        sourceUrl: p.sourceUrl || "",
        source: "Web" as const,
      }));

    const hfPhotos: Photo[] = hfRaw
      .filter((p: any) => p.url)
      .map((p: any) => ({
        url: p.url,
        photographer: p.photographer || "FLUX.1-schnell",
        sourceUrl: "",
        source: "HuggingFace" as const,
      }));

    // Order: Pexels first, Unsplash second, HuggingFace third, Web last
    const photos: Photo[] = [...pexelsPhotos, ...unsplashPhotos, ...hfPhotos, ...webPhotos];

    return NextResponse.json({ photos, query });
  } catch (err) {
    console.error("regenerate-image error:", err);
    return NextResponse.json({ error: "Failed to regenerate image" }, { status: 500 });
  }
}
