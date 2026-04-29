import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";
import { parse } from "node-html-parser";
import type { Competitor, CompetitorDatabase } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";
const CLAUDE_BIN = "/opt/homebrew/bin/claude";
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function CLAUDE_ENV(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  env.HOME = "/Users/openclaw";
  return env;
}

async function readText(path: string): Promise<string> {
  try { return await readFile(path, "utf-8"); } catch { return ""; }
}

async function loadProfile(domain: string): Promise<string> {
  return readText(join(SEO_ROOT, domain, "profile.md"));
}

async function loadCache(domain: string): Promise<CompetitorDatabase | null> {
  try {
    const raw = await readFile(join(SEO_ROOT, domain, "competitors.json"), "utf-8");
    return JSON.parse(raw) as CompetitorDatabase;
  } catch {
    return null;
  }
}

async function saveCache(db: CompetitorDatabase) {
  const dir = join(SEO_ROOT, db.domain);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "competitors.json"), JSON.stringify(db, null, 2) + "\n");
}

function isFresh(db: CompetitorDatabase): boolean {
  if (!db.lastUpdated) return false;
  const age = Date.now() - new Date(db.lastUpdated).getTime();
  return age < CACHE_MAX_AGE_MS;
}

/** Extract competitor domains from profile.md competitors: field */
function extractProfileCompetitors(profile: string): string[] {
  const lines = profile.split("\n");
  const domains: string[] = [];
  let inCompetitors = false;
  for (const line of lines) {
    if (/^competitors:/i.test(line.trim())) {
      inCompetitors = true;
      // Also handle inline: competitors: a.com, b.com
      const inline = line.replace(/^competitors:/i, "").trim();
      if (inline) {
        for (const part of inline.split(/[,\s]+/)) {
          const d = part.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
          if (d && d.includes(".")) domains.push(d);
        }
      }
      continue;
    }
    if (inCompetitors) {
      if (/^[a-z#\-]/i.test(line.trim()) && !line.trim().startsWith("-")) break;
      const match = line.match(/[-*]\s*(https?:\/\/)?(www\.)?([a-z0-9][a-z0-9\-\.]+\.[a-z]{2,})/i);
      if (match) domains.push(match[3]);
    }
  }
  return domains;
}

/** Detect tech hints from HTTP headers and HTML */
function detectTechHints(headers: Record<string, string>, html: string): string[] {
  const hints = new Set<string>();
  const xPowered = headers["x-powered-by"] || "";
  if (/wix/i.test(xPowered)) hints.add("Wix");
  if (/wordpress/i.test(xPowered) || /wp-content/i.test(html)) hints.add("WordPress");
  if (/shopify/i.test(xPowered) || /cdn\.shopify/i.test(html)) hints.add("Shopify");
  if (/squarespace/i.test(html)) hints.add("Squarespace");
  if (/webflow/i.test(html)) hints.add("Webflow");
  if (/react/i.test(html) && /reactdom/i.test(html)) hints.add("React");
  if (/next\.js/i.test(html) || /_next\//i.test(html)) hints.add("Next.js");
  if (/vue\.js/i.test(html) || /vue\//i.test(html)) hints.add("Vue");
  if (/angular/i.test(html)) hints.add("Angular");
  if (headers["server"]) hints.add(headers["server"].split("/")[0]);
  if (/cloudflare/i.test(headers["server"] || "")) hints.add("Cloudflare");
  return Array.from(hints).slice(0, 6);
}

/** Fetch a competitor's homepage and extract basic signals */
async function fetchCompetitorPage(domain: string): Promise<{
  title: string;
  description: string;
  h1: string;
  techHints: string[];
  metaKeywords: string[];
}> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenClaw-SEO-Scout/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });

    const root = parse(html);
    const title = root.querySelector("title")?.text?.trim() || domain;
    const description = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
    const h1 = root.querySelector("h1")?.text?.trim() || "";
    const metaKeywordsRaw = root.querySelector('meta[name="keywords"]')?.getAttribute("content")?.trim() || "";
    const metaKeywords = metaKeywordsRaw
      ? metaKeywordsRaw.split(",").map((k) => k.trim()).filter(Boolean).slice(0, 8)
      : [];
    const techHints = detectTechHints(headers, html);

    return { title, description, h1, techHints, metaKeywords };
  } catch {
    return { title: domain, description: "", h1: "", techHints: [], metaKeywords: [] };
  }
}

/** Use Claude Haiku to analyze a competitor vs. the user's site */
function analyzeCompetitorWithClaude(
  userDomain: string,
  userProfile: string,
  competitorDomain: string,
  competitorData: { title: string; description: string; h1: string; metaKeywords: string[] }
): { strengths: string[]; contentGaps: string[] } {
  const prompt = `You are an SEO competitive analyst. Analyze this competitor vs. the user's site.

USER'S SITE: ${userDomain}
${userProfile ? `User's business profile:\n${userProfile}\n` : ""}

COMPETITOR: ${competitorDomain}
Title: ${competitorData.title}
Meta description: ${competitorData.description || "none"}
H1: ${competitorData.h1 || "none"}
Meta keywords: ${competitorData.metaKeywords.join(", ") || "none"}

Return JSON only — no markdown, no explanation:
{
  "strengths": ["3-5 bullet points about what this competitor does well in SEO/content"],
  "contentGaps": ["3-5 topics or keywords the competitor covers that the user's site likely doesn't"]
}`;

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
      return { strengths: [], contentGaps: [] };
    }
    // Strip markdown code fences if present
    let raw = result.stdout.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(raw);
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5) : [],
      contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.slice(0, 5) : [],
    };
  } catch {
    return { strengths: [], contentGaps: [] };
  }
}

/** Use Claude Haiku to generate 5-8 competitor domain suggestions when Tavily unavailable */
function discoverCompetitorsWithClaude(userDomain: string, profile: string): string[] {
  const prompt = `You are an SEO analyst. Based on this business profile, name 6 likely competitor websites.

Domain: ${userDomain}
Profile:
${profile || "(no profile available)"}

Return JSON only — no markdown, no explanation:
{"competitors": ["competitor1.com", "competitor2.com", "competitor3.com", "competitor4.com", "competitor5.com", "competitor6.com"]}`;

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
    if (result.status !== 0 || !result.stdout) return [];
    let raw = result.stdout.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.competitors) ? parsed.competitors.slice(0, 8) : [];
  } catch {
    return [];
  }
}

/** Search Tavily for competitor domains */
async function searchTavilyForCompetitors(profile: string, userDomain: string): Promise<string[]> {
  if (!TAVILY_KEY) return [];

  // Extract business type, industry, and first keyword from profile
  const businessTypeMatch = profile.match(/(?:business[- ]type|type):\s*(.+)/i);
  const industryMatch = profile.match(/(?:industry|niche|category):\s*(.+)/i);
  const keywordMatch = profile.match(/(?:keyword|keywords|target keyword)s?:\s*(.+)/i);

  const businessType = businessTypeMatch?.[1]?.trim() || "";
  const industry = industryMatch?.[1]?.trim() || "";
  const keyword = keywordMatch?.[1]?.split(",")[0]?.trim() || "";

  const queries: string[] = [];
  if (businessType && industry) {
    queries.push(`${businessType} ${industry} competitors`);
  }
  if (keyword) {
    queries.push(`best ${keyword} websites`);
  }
  if (queries.length === 0) {
    queries.push(`competitors of ${userDomain}`);
  }

  const domains = new Set<string>();

  for (const query of queries.slice(0, 2)) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query,
          max_results: 10,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      for (const r of data.results || []) {
        try {
          const u = new URL(r.url);
          const d = u.hostname.replace(/^www\./, "");
          if (d && d !== userDomain && d !== `www.${userDomain}` && !d.includes("google") && !d.includes("wikipedia")) {
            domains.add(d);
          }
        } catch { /* invalid URL */ }
      }
    } catch { /* Tavily error — skip */ }
  }

  return Array.from(domains).slice(0, 10);
}

/** Full competitor discovery and analysis pipeline */
async function discoverAndAnalyze(domain: string): Promise<CompetitorDatabase> {
  const profile = await loadProfile(domain);
  const now = new Date().toISOString();

  // 1. Check profile for manually listed competitors
  const profileDomains = extractProfileCompetitors(profile);

  // 2. Search Tavily for more
  let tavilyDomains: string[] = [];
  if (TAVILY_KEY) {
    tavilyDomains = await searchTavilyForCompetitors(profile, domain);
  }

  // 3. If neither source gave us anything, use Claude Haiku
  let allDomains = [...new Set([...profileDomains, ...tavilyDomains])].slice(0, 10);
  if (allDomains.length === 0) {
    const claudeDomains = discoverCompetitorsWithClaude(domain, profile);
    allDomains = claudeDomains;
  }

  // 4. For each domain: fetch page + Claude analysis
  const competitors: Competitor[] = [];
  for (const compDomain of allDomains.slice(0, 10)) {
    const pageData = await fetchCompetitorPage(compDomain);
    const source: Competitor["source"] = profileDomains.includes(compDomain)
      ? "profile"
      : tavilyDomains.includes(compDomain)
      ? "tavily"
      : "manual";

    // Determine top keywords: prefer meta keywords, fallback to title words
    let topKeywords = pageData.metaKeywords;
    if (topKeywords.length === 0 && pageData.title) {
      // Extract meaningful words from title (skip short words)
      topKeywords = pageData.title
        .split(/[\s|–\-,]+/)
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.length > 3)
        .slice(0, 6);
    }

    const { strengths, contentGaps } = analyzeCompetitorWithClaude(
      domain,
      profile,
      compDomain,
      {
        title: pageData.title,
        description: pageData.description,
        h1: pageData.h1,
        metaKeywords: pageData.metaKeywords,
      }
    );

    competitors.push({
      domain: compDomain,
      name: pageData.title || compDomain,
      description: pageData.description || `Competitor site: ${compDomain}`,
      h1: pageData.h1,
      techHints: pageData.techHints,
      topKeywords,
      strengths,
      contentGaps,
      discoveredAt: now,
      source,
    });
  }

  const db: CompetitorDatabase = {
    domain,
    competitors,
    lastUpdated: now,
    status: competitors.length > 0 ? "fresh" : "empty",
  };

  await saveCache(db);
  return db;
}

// ─── GET /api/seo/competitors?domain=x&refresh=false ──────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const refresh = searchParams.get("refresh") === "true";

  if (!domain) {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  // Check cache
  if (!refresh) {
    const cached = await loadCache(domain);
    if (cached) {
      const fresh = isFresh(cached);
      cached.status = fresh ? "fresh" : "stale";
      return NextResponse.json(cached);
    }
    // Return empty — don't auto-run
    return NextResponse.json({
      domain,
      competitors: [],
      lastUpdated: "",
      status: "empty",
    } as CompetitorDatabase);
  }

  // Run discovery
  try {
    const db = await discoverAndAnalyze(domain);
    return NextResponse.json(db);
  } catch (err: any) {
    console.error("Competitor discovery error:", err);
    return NextResponse.json({ error: err.message || "Discovery failed" }, { status: 500 });
  }
}

// ─── POST /api/seo/competitors — add manual competitors ───────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, competitors: newDomains } = body as { domain: string; competitors: string[] };

    if (!domain) return NextResponse.json({ error: "domain is required" }, { status: 400 });
    if (!Array.isArray(newDomains) || newDomains.length === 0) {
      return NextResponse.json({ error: "competitors array is required" }, { status: 400 });
    }

    const profile = await loadProfile(domain);
    const now = new Date().toISOString();

    // Load existing
    let db = await loadCache(domain);
    if (!db) {
      db = { domain, competitors: [], lastUpdated: now, status: "fresh" };
    }

    const existingDomains = new Set(db.competitors.map((c) => c.domain));
    const toAdd = newDomains.filter((d) => !existingDomains.has(d));

    for (const compDomain of toAdd.slice(0, 10)) {
      const pageData = await fetchCompetitorPage(compDomain);
      let topKeywords = pageData.metaKeywords;
      if (topKeywords.length === 0 && pageData.title) {
        topKeywords = pageData.title
          .split(/[\s|–\-,]+/)
          .map((w) => w.trim().toLowerCase())
          .filter((w) => w.length > 3)
          .slice(0, 6);
      }

      const { strengths, contentGaps } = analyzeCompetitorWithClaude(
        domain,
        profile,
        compDomain,
        { title: pageData.title, description: pageData.description, h1: pageData.h1, metaKeywords: pageData.metaKeywords }
      );

      db.competitors.push({
        domain: compDomain,
        name: pageData.title || compDomain,
        description: pageData.description || `Competitor site: ${compDomain}`,
        h1: pageData.h1,
        techHints: pageData.techHints,
        topKeywords,
        strengths,
        contentGaps,
        discoveredAt: now,
        source: "manual",
      });
    }

    db.lastUpdated = now;
    db.status = "fresh";
    await saveCache(db);

    return NextResponse.json(db);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}

// ─── DELETE /api/seo/competitors?domain=x&competitor=y ───────────

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");
  const competitor = searchParams.get("competitor");

  if (!domain || !competitor) {
    return NextResponse.json({ error: "domain and competitor are required" }, { status: 400 });
  }

  const db = await loadCache(domain);
  if (!db) {
    return NextResponse.json({ error: "No competitor database found for this domain" }, { status: 404 });
  }

  const before = db.competitors.length;
  db.competitors = db.competitors.filter((c) => c.domain !== competitor);

  if (db.competitors.length === before) {
    return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
  }

  db.lastUpdated = new Date().toISOString();
  await saveCache(db);

  return NextResponse.json(db);
}
