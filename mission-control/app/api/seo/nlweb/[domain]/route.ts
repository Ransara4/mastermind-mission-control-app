import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { spawnSync } from "child_process";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const MC_BASE_URL = "https://mc.openclaw.io";
const CLAUDE_BIN = "/opt/homebrew/bin/claude";

function CLAUDE_ENV(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.PATH = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
  env.HOME = "/Users/openclaw";
  return env;
}

// ── Rate limiter ──────────────────────────────────────────────────

interface RateEntry {
  count: number;
  resetAt: number;
}

const rateLimits = new Map<string, RateEntry>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;

function checkRateLimit(domain: string): boolean {
  const now = Date.now();
  const entry = rateLimits.get(domain);
  if (!entry || now >= entry.resetAt) {
    rateLimits.set(domain, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ── CORS headers ─────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Site context loader ───────────────────────────────────────────

interface SiteContext {
  profile: string | null;
  autopilot: string | null;
  gsc: string | null;
}

async function loadSiteContext(domain: string): Promise<SiteContext> {
  const read = async (file: string): Promise<string | null> => {
    try {
      return await readFile(join(SEO_ROOT, domain, file), "utf-8");
    } catch {
      return null;
    }
  };
  const [profile, autopilot, gsc] = await Promise.all([
    read("profile.md"),
    read("autopilot-latest.json"),
    read("gsc-cache.json"),
  ]);
  return { profile, autopilot, gsc };
}

// ── Extract brief context from JSON files ────────────────────────

function extractAuditSummary(autopilotJson: string | null): string {
  if (!autopilotJson) return "";
  try {
    const data = JSON.parse(autopilotJson);
    const score = data?.summary?.score ?? data?.phases?.audit?.score ?? null;
    const issues: string[] = [];
    const fixQueue: Array<{ severity: string; message: string }> = data?.fixQueue || [];
    for (const item of fixQueue.slice(0, 5)) {
      if (item.severity === "critical" || item.severity === "warning") {
        issues.push(item.message);
      }
    }
    const parts: string[] = [];
    if (score !== null) parts.push(`SEO score: ${score}/100`);
    if (issues.length > 0) parts.push(`Top issues: ${issues.join("; ")}`);
    return parts.join(". ");
  } catch {
    return "";
  }
}

function extractTopQueries(gscJson: string | null): string {
  if (!gscJson) return "";
  try {
    const data = JSON.parse(gscJson);
    const rows: Array<{ query: string; clicks: number }> = data?.rows || data?.queries || [];
    const top = rows
      .sort((a, b) => (b.clicks ?? 0) - (a.clicks ?? 0))
      .slice(0, 5)
      .map((r) => r.query)
      .filter(Boolean);
    return top.length > 0 ? `Top search queries: ${top.join(", ")}` : "";
  } catch {
    return "";
  }
}

function extractSiteName(profile: string | null, domain: string): string {
  if (!profile) return domain;
  // Try to extract a name from the first heading or "Name:" line
  const nameMatch = profile.match(/^#\s+(.+)$/m) || profile.match(/^name[:\s]+(.+)$/im);
  return nameMatch ? nameMatch[1].trim() : domain;
}

// ── Claude NLWeb query ────────────────────────────────────────────

function askClaude(domain: string, query: string, context: SiteContext): string | null {
  const siteName = extractSiteName(context.profile, domain);
  const auditSummary = extractAuditSummary(context.autopilot);
  const topQueries = extractTopQueries(context.gsc);

  const contextParts: string[] = [];
  if (context.profile) contextParts.push(`Site profile:\n${context.profile.slice(0, 800)}`);
  if (auditSummary) contextParts.push(auditSummary);
  if (topQueries) contextParts.push(topQueries);

  const prompt = `You are ${siteName} (${domain}), a website answering a visitor's question.

${contextParts.join("\n\n")}

Question: ${query}

Answer the question directly and helpfully as if you are this website/business. Be factual, specific, and friendly. Keep your answer under 200 words. Do not use markdown formatting. Do not start with "I" or "We" — answer as the business, not a robot. Return only the answer text, nothing else.`;

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
    if (result.status !== 0 || !result.stdout?.trim()) return null;
    return result.stdout.trim();
  } catch {
    return null;
  }
}

// ── Wix custom code snippet generator ────────────────────────────

function generateWixCustomCode(domain: string): { linkTag: string; wixCustomCode: string } {
  const href = `${MC_BASE_URL}/api/seo/nlweb/${domain}`;
  const linkTag = `<link rel="nlweb" href="${href}" />`;
  const wixCustomCode =
    `(function(){var l=document.createElement('link');l.rel='nlweb';l.href='${href}';document.head.appendChild(l);})();`;
  return { linkTag, wixCustomCode };
}

// ── Site entity (discovery / list mode) ──────────────────────────

function buildSiteEntity(domain: string, profile: string | null) {
  const name = extractSiteName(profile, domain);
  const description = profile
    ? profile.replace(/^#.+\n/m, "").trim().slice(0, 300)
    : "";
  return {
    "@context": "https://schema.org",
    "@type": ["WebSite", "Organization"],
    "url": `https://${domain}/`,
    "name": name,
    "description": description || undefined,
    "isPartOf": {
      "@type": "WebSite",
      "url": `https://${domain}/`,
    },
    "nlwebEndpoint": `${MC_BASE_URL}/api/seo/nlweb/${domain}`,
  };
}

// ── OPTIONS (CORS preflight) ──────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ── GET handler ───────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await context.params;
  const domain = rawDomain.toLowerCase();

  // Domain validation
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain)) {
    return NextResponse.json(
      { error: "Invalid domain format" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") || "";
  const listMode = searchParams.get("list") === "true";
  const metaMode = searchParams.get("meta") === "true";

  const siteCtx = await loadSiteContext(domain);

  // ?meta=true — return Wix custom code snippet
  if (metaMode) {
    const snippets = generateWixCustomCode(domain);
    return NextResponse.json(
      { domain, ...snippets },
      { headers: CORS_HEADERS }
    );
  }

  // ?list=true — discovery / site entity
  if (listMode) {
    const entity = buildSiteEntity(domain, siteCtx.profile);
    return NextResponse.json(entity, { headers: CORS_HEADERS });
  }

  // No query
  if (!query.trim()) {
    return NextResponse.json(
      { error: "Provide ?q= parameter or ?list=true" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Rate limit
  if (!checkRateLimit(domain)) {
    return NextResponse.json(
      { error: "Rate limit exceeded — max 10 req/min per domain" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  // Ask Claude
  const answer = askClaude(domain, query, siteCtx);
  if (!answer) {
    return NextResponse.json(
      { error: "Could not generate answer — AI unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  const siteName = extractSiteName(siteCtx.profile, domain);
  const response = {
    "@context": "https://schema.org",
    "@type": "Answer",
    "url": `https://${domain}/`,
    "text": answer,
    "datePublished": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": siteName,
    },
    "isPartOf": {
      "@type": "WebSite",
      "url": `https://${domain}/`,
    },
  };

  return NextResponse.json(response, { headers: CORS_HEADERS });
}

// ── POST handler ─────────────────────────────────────────────────

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await context.params;
  const domain = rawDomain.toLowerCase();

  // Domain validation
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain)) {
    return NextResponse.json(
      { error: "Invalid domain format" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  let query = "";
  try {
    const body = await request.json();
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (!query) {
    return NextResponse.json(
      { error: "Provide { query: string } in request body" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  // Rate limit
  if (!checkRateLimit(domain)) {
    return NextResponse.json(
      { error: "Rate limit exceeded — max 10 req/min per domain" },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const siteCtx = await loadSiteContext(domain);
  const answer = askClaude(domain, query, siteCtx);
  if (!answer) {
    return NextResponse.json(
      { error: "Could not generate answer — AI unavailable" },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  const siteName = extractSiteName(siteCtx.profile, domain);
  const response = {
    "@context": "https://schema.org",
    "@type": "Answer",
    "url": `https://${domain}/`,
    "text": answer,
    "datePublished": new Date().toISOString(),
    "author": {
      "@type": "Organization",
      "name": siteName,
    },
    "isPartOf": {
      "@type": "WebSite",
      "url": `https://${domain}/`,
    },
  };

  return NextResponse.json(response, { headers: CORS_HEADERS });
}

// ── NLWeb marker file writer (for autopilot) ──────────────────────

export async function enableNLWeb(domain: string): Promise<void> {
  const siteDir = join(SEO_ROOT, domain);
  await mkdir(siteDir, { recursive: true });
  await writeFile(
    join(siteDir, "nlweb-enabled.json"),
    JSON.stringify({ domain, enabledAt: new Date().toISOString() }, null, 2)
  );
}
