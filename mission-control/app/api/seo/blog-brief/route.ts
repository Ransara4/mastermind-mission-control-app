import { NextRequest, NextResponse } from "next/server";
import { readFile, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";
import type { BlogBrief } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CLAUDE_BIN = "/opt/homebrew/bin/claude";

function CLAUDE_ENV(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  env.HOME = "/Users/openclaw";
  return env;
}

async function loadProfile(domain: string): Promise<string> {
  try {
    return await readFile(join(SEO_ROOT, domain, "profile.md"), "utf-8");
  } catch {
    return "";
  }
}

async function loadTopQueries(domain: string): Promise<string[]> {
  try {
    const raw = await readFile(join(SEO_ROOT, domain, "gsc", "top-queries.json"), "utf-8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5).map((q: { query?: string; keyword?: string }) => q.query || q.keyword || "").filter(Boolean);
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  let body: { domain?: string; keyword?: string; extraContext?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, keyword, extraContext } = body;

  if (!domain || typeof domain !== "string" || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return NextResponse.json({ error: "Invalid or missing domain" }, { status: 400 });
  }
  if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
    return NextResponse.json({ error: "Missing keyword" }, { status: 400 });
  }

  const profile = await loadProfile(domain);
  const topQueries = await loadTopQueries(domain);

  const topQueriesStr = topQueries.length > 0
    ? topQueries.map((q, i) => `${i + 1}. ${q}`).join("\n")
    : "No GSC data available yet.";

  const prompt = `You are an expert SEO content strategist. Create a detailed blog content brief.

Site: ${domain}
Business profile:
${profile || "No profile available — infer from the domain and keyword."}

Target keyword: "${keyword.trim()}"
${extraContext ? `Additional context: ${extraContext}` : ""}

Top queries this site already ranks for:
${topQueriesStr}

Generate a complete SEO content brief in this exact JSON format:
{
  "title": "H1 title (50-60 chars, includes keyword)",
  "metaDescription": "Meta description (150-160 chars, includes keyword, ends with CTA, no em dashes)",
  "slug": "url-friendly-slug",
  "intent": "informational|commercial|transactional|navigational",
  "outline": [
    { "heading": "H2 heading", "level": 2, "description": "What to cover", "wordCount": 200 },
    { "heading": "H3 subheading", "level": 3, "description": "Specific point", "wordCount": 150 }
  ],
  "wordCount": 1200,
  "targetAudience": "Who this is written for",
  "tone": "Describe the tone",
  "internalLinks": ["https://${domain}/page1", "https://${domain}/page2"],
  "faqQuestions": ["Question 1?", "Question 2?", "Question 3?"]
}

Rules:
- title must be 50-60 characters and include the keyword
- metaDescription must be 150-160 characters, end with a CTA, no em dashes (—), no words: delve, unlock, elevate, harness, seamlessly, leverage, cutting-edge
- slug must be lowercase with hyphens only
- outline must have 5-8 sections mixing H2 and H3
- faqQuestions must be 3-5 questions
- internalLinks should reference real-looking pages on the domain

Return ONLY valid JSON. No markdown, no explanation.`;

  let raw = "";
  try {
    const result = spawnSync(
      CLAUDE_BIN,
      ["-p", "--model", "claude-haiku-4-5-20251001"],
      {
        input: prompt,
        timeout: 60000,
        encoding: "utf-8",
        env: CLAUDE_ENV(),
      }
    );

    if (result.status !== 0 || !result.stdout) {
      const stderr = result.stderr || "";
      return NextResponse.json(
        { error: "Claude invocation failed", details: stderr, exitCode: result.status },
        { status: 500 }
      );
    }

    raw = result.stdout.trim();
  } catch (err) {
    return NextResponse.json({ error: "spawnSync threw", details: String(err) }, { status: 500 });
  }

  // Strip possible markdown code fences
  const jsonStr = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  let parsed: Partial<BlogBrief>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return NextResponse.json({ error: "Failed to parse Claude output as JSON", raw }, { status: 500 });
  }

  const brief: BlogBrief = {
    keyword: keyword.trim(),
    domain,
    title: parsed.title || "",
    metaDescription: parsed.metaDescription || "",
    slug: parsed.slug || keyword.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
    intent: (["informational", "commercial", "transactional", "navigational"].includes(parsed.intent as string)
      ? parsed.intent
      : "informational") as BlogBrief["intent"],
    outline: Array.isArray(parsed.outline) ? parsed.outline : [],
    wordCount: typeof parsed.wordCount === "number" ? parsed.wordCount : 1200,
    targetAudience: parsed.targetAudience || "",
    tone: parsed.tone || "",
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
    faqQuestions: Array.isArray(parsed.faqQuestions) ? parsed.faqQuestions : [],
    generatedAt: new Date().toISOString(),
  };

  // Save brief to disk
  try {
    const brifsDir = join(SEO_ROOT, domain, "blog-briefs");
    await mkdir(brifsDir, { recursive: true });
    await writeFile(join(brifsDir, `${brief.slug}.json`), JSON.stringify(brief, null, 2), "utf-8");
  } catch {
    // Non-fatal — return the brief even if saving fails
  }

  return NextResponse.json(brief);
}
