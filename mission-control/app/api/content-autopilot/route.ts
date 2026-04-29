import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const DATA_PATH = join(WS, "data/content-autopilot.json");

interface Post {
  id: string;
  topic: string;
  tone: string;
  platforms: {
    linkedin?: { copy: string; hashtags: string[]; charCount: number };
    instagram?: { copy: string; hashtags: string[]; charCount: number };
    tiktok?: { copy: string; hashtags: string[]; charCount: number };
    youtube?: {
      title: string;
      description: string;
      tags: string[];
      charCount: number;
    };
  };
  status: "draft" | "scheduled" | "posted" | "failed";
  scheduledFor: string | null;
  postedAt: string | null;
  postedTo: string[];
  createdAt: string;
}

interface DB {
  posts: Post[];
  themes: string[];
  settings: Record<string, unknown>;
}

async function loadDB(): Promise<DB> {
  try {
    const raw = await readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { posts: [], themes: [], settings: {} };
  }
}

async function saveDB(db: DB): Promise<void> {
  await writeFile(DATA_PATH, JSON.stringify(db, null, 2) + "\n");
}

function generateContent(
  topic: string,
  tone: string,
  selectedPlatforms: string[]
): Post["platforms"] {
  const platformInstructions = selectedPlatforms
    .map((p) => {
      switch (p) {
        case "linkedin":
          return `LinkedIn: Professional ${tone} tone. 1300-2000 chars. 3-5 hashtags. Start with a hook. Line breaks for readability. End with a question or CTA.`;
        case "instagram":
          return `Instagram: ${tone} tone with emojis. Under 2000 chars. 20-30 hashtags (separate block at end). Start with a hook. Include a CTA.`;
        case "tiktok":
          return `TikTok: Punchy and short. Under 300 chars. 5-8 trending hashtags. Hook in first 5 words. Conversational voice.`;
        case "youtube":
          return `YouTube: SEO-optimized. Title under 60 chars (compelling, keyword-rich). Description 500-1500 chars with timestamps placeholder. 10-15 tags as comma-separated list.`;
        default:
          return "";
      }
    })
    .join("\n");

  const prompt = `You are a social media content expert for a business coach and AI entrepreneur based in Bali.

Generate content about: "${topic}"

Create platform-specific content for each platform below. Return ONLY valid JSON, no markdown code fences.

${platformInstructions}

Return this exact JSON structure (only include platforms that were requested):
{
  ${selectedPlatforms.includes("linkedin") ? '"linkedin": {"copy": "full post text", "hashtags": ["tag1", "tag2"]},' : ""}
  ${selectedPlatforms.includes("instagram") ? '"instagram": {"copy": "full post text with emojis", "hashtags": ["tag1", "tag2"]},' : ""}
  ${selectedPlatforms.includes("tiktok") ? '"tiktok": {"copy": "short caption", "hashtags": ["tag1", "tag2"]},' : ""}
  ${selectedPlatforms.includes("youtube") ? '"youtube": {"title": "Video Title", "description": "Full description", "tags": ["tag1", "tag2"]}' : ""}
}`;

  // Pick the right model for the job:
  // - sonnet: default for content generation (creative + structured output)
  // - haiku: simple tasks like hashtag-only or single short caption
  // - opus: complex multi-platform campaigns with 4+ platforms and long-form
  let model = "sonnet";
  if (selectedPlatforms.length >= 4) {
    model = "opus"; // complex multi-platform needs deeper reasoning
  } else if (selectedPlatforms.length === 1 && selectedPlatforms[0] === "tiktok") {
    model = "haiku"; // short caption = lightweight task
  }

  // Clean env to avoid nested session errors
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;
  cleanEnv.PATH =
    `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${join(os.homedir(), "bin")}`;

  const text = execSync(
    `claude -p --model ${model} --no-session-persistence`,
    {
      input: prompt,
      encoding: "utf-8",
      timeout: 120_000,
      env: cleanEnv,
      maxBuffer: 1024 * 1024,
    }
  ).trim();

  // Extract JSON from response (handle potential markdown fences)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON found in Claude response");

  const platforms = JSON.parse(jsonMatch[0]);

  // Add char counts
  for (const [key, val] of Object.entries(platforms)) {
    const v = val as Record<string, unknown>;
    if (v.copy) v.charCount = (v.copy as string).length;
    if (v.description) v.charCount = (v.description as string).length;
  }

  return platforms;
}

export async function GET() {
  const db = await loadDB();

  const stats = {
    total: db.posts.length,
    draft: db.posts.filter((p) => p.status === "draft").length,
    scheduled: db.posts.filter((p) => p.status === "scheduled").length,
    posted: db.posts.filter((p) => p.status === "posted").length,
  };

  return NextResponse.json({
    posts: db.posts,
    themes: db.themes,
    settings: db.settings,
    stats,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    const db = await loadDB();

    if (action === "generate") {
      const { topic, tone, platforms: selectedPlatforms } = body;
      if (!topic?.trim())
        return NextResponse.json(
          { error: "Topic is required" },
          { status: 400 }
        );

      const platformList = selectedPlatforms || [
        "linkedin",
        "instagram",
        "tiktok",
      ];
      const platforms = generateContent(
        topic.trim(),
        tone || "professional-casual",
        platformList
      );

      const post: Post = {
        id: "post_" + randomBytes(4).toString("hex"),
        topic: topic.trim(),
        tone: tone || "professional-casual",
        platforms,
        status: "draft",
        scheduledFor: null,
        postedAt: null,
        postedTo: [],
        createdAt: new Date().toISOString(),
      };

      db.posts.unshift(post);
      await saveDB(db);

      return NextResponse.json({ post }, { status: 201 });
    }

    if (action === "update") {
      const { id, ...updates } = body;
      const idx = db.posts.findIndex((p) => p.id === id);
      if (idx === -1)
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );

      db.posts[idx] = { ...db.posts[idx], ...updates };
      await saveDB(db);
      return NextResponse.json({ post: db.posts[idx] });
    }

    if (action === "mark-posted") {
      const { id, platform } = body;
      const idx = db.posts.findIndex((p) => p.id === id);
      if (idx === -1)
        return NextResponse.json(
          { error: "Post not found" },
          { status: 404 }
        );

      if (!db.posts[idx].postedTo.includes(platform)) {
        db.posts[idx].postedTo.push(platform);
      }
      // If posted to all platforms, mark as posted
      const allPlatforms = Object.keys(db.posts[idx].platforms);
      if (allPlatforms.every((p) => db.posts[idx].postedTo.includes(p))) {
        db.posts[idx].status = "posted";
        db.posts[idx].postedAt = new Date().toISOString();
      }
      await saveDB(db);
      return NextResponse.json({ post: db.posts[idx] });
    }

    if (action === "delete") {
      const { id } = body;
      db.posts = db.posts.filter((p) => p.id !== id);
      await saveDB(db);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
