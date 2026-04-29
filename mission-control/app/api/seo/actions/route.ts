import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";

// ─── Helpers ────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<{ html: string; status: number; headers: Record<string, string> }> {
  const res = await fetch(url, {
    headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });
  const html = await res.text();
  const headers: Record<string, string> = {};
  res.headers.forEach((v, k) => { headers[k] = v; });
  return { html, status: res.status, headers };
}

async function tavilySearch(query: string, maxResults = 10): Promise<any> {
  if (!TAVILY_KEY) return { results: [], error: "No Tavily API key configured" };
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: TAVILY_KEY,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: true,
    }),
  });
  return res.json();
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

// ─── Duplicate Content Detection ────────────────────────────────

interface PageScan {
  url: string;
  title: string;
  metaDescription: string;
}

function detectDuplicateContent(pages: PageScan[]): { severity: "critical" | "warning" | "info" | "pass"; message: string }[] {
  const issues: { severity: "critical" | "warning" | "info" | "pass"; message: string }[] = [];

  // Normalize titles by stripping common site name suffixes (e.g., " | Site Name", " - Site Name")
  const normalizeTitle = (t: string) => t.replace(/\s*[|–—-]\s*[^|–—-]+$/, "").trim().toLowerCase();

  // Group pages by normalized title
  const titleMap = new Map<string, string[]>();
  for (const page of pages) {
    if (!page.title) continue;
    const normalized = normalizeTitle(page.title);
    if (!normalized) continue;
    const group = titleMap.get(normalized) || [];
    group.push(page.url);
    titleMap.set(normalized, group);
  }

  for (const [, urls] of titleMap) {
    if (urls.length >= 2) {
      issues.push({ severity: "warning", message: `Duplicate page titles detected: ${urls.join(", ")}` });
    }
  }

  // Group pages by meta description
  const descMap = new Map<string, string[]>();
  for (const page of pages) {
    if (!page.metaDescription) continue;
    const key = page.metaDescription.trim().toLowerCase();
    if (!key) continue;
    const group = descMap.get(key) || [];
    group.push(page.url);
    descMap.set(key, group);
  }

  const duplicateDescCount = Array.from(descMap.values()).filter((urls) => urls.length >= 2).length;
  if (duplicateDescCount > 0) {
    const totalDuplicatePages = Array.from(descMap.values()).filter((urls) => urls.length >= 2).reduce((sum, urls) => sum + urls.length, 0);
    issues.push({ severity: "warning", message: `Duplicate meta descriptions on ${totalDuplicatePages} pages` });
  }

  return issues;
}

// ─── Context-Aware Schema Suggestions ───────────────────────────

function detectContextSchemas(htmlContent: string): { severity: "critical" | "warning" | "info" | "pass"; message: string }[] {
  const issues: { severity: "critical" | "warning" | "info" | "pass"; message: string }[] = [];
  const lowerHtml = htmlContent.toLowerCase();

  const patterns: { keywords: string[]; schemaType: string; label: string }[] = [
    { keywords: ["pricing", "plan", "subscribe", "per month"], schemaType: "Product/Offer", label: "SaaS/Product" },
    { keywords: ["course", "enroll", "lesson", "module"], schemaType: "Course", label: "Course" },
    { keywords: ["mastermind", "coaching", "join"], schemaType: "Event/Organization", label: "Event or Organization" },
    { keywords: ["blog", "article", "post"], schemaType: "BlogPosting/Article", label: "BlogPosting/Article" },
  ];

  for (const pattern of patterns) {
    const matchedKeywords = pattern.keywords.filter((kw) => lowerHtml.includes(kw));
    if (matchedKeywords.length >= 2) {
      issues.push({
        severity: "info",
        message: `${pattern.label} schema suggested — detected '${matchedKeywords.join("' and '")}' keywords on page. Consider adding ${pattern.schemaType} structured data.`,
      });
    }
  }

  return issues;
}

// ─── Site Audit ─────────────────────────────────────────────────

async function runSiteAudit(domain: string) {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const { html, status, headers } = await fetchPage(url);
  const root = parse(html);

  const title = root.querySelector("title")?.text?.trim() || "";
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const metaRobots = root.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogDesc = root.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const viewport = root.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";

  const h1s = root.querySelectorAll("h1").map((el) => el.text.trim());
  const h2s = root.querySelectorAll("h2").map((el) => el.text.trim());
  const h3s = root.querySelectorAll("h3").map((el) => el.text.trim());

  const images = root.querySelectorAll("img");
  const imagesTotal = images.length;
  const imagesNoAlt = images.filter((img) => !img.getAttribute("alt")?.trim()).length;

  const links = root.querySelectorAll("a[href]");
  const internalLinks = links.filter((a) => {
    const href = a.getAttribute("href") || "";
    return href.startsWith("/") || href.includes(domain);
  }).length;
  const externalLinks = links.length - internalLinks;

  const scripts = root.querySelectorAll("script").length;
  const stylesheets = root.querySelectorAll('link[rel="stylesheet"]').length;

  // JSON-LD
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]');
  const schemas = jsonLd.map((el) => {
    try { return JSON.parse(el.text); } catch { return null; }
  }).filter(Boolean);

  const httpsRedirect = url.startsWith("https://");
  const hasHsts = !!headers["strict-transport-security"];

  // Scoring
  const issues: { severity: "critical" | "warning" | "info" | "pass"; message: string }[] = [];

  // Title
  if (!title) issues.push({ severity: "critical", message: "Missing title tag" });
  else if (title.length < 30) issues.push({ severity: "warning", message: `Title too short (${title.length} chars) — aim for 50-60` });
  else if (title.length > 60) issues.push({ severity: "warning", message: `Title too long (${title.length} chars) — aim for 50-60` });
  else issues.push({ severity: "pass", message: `Title tag: "${title}" (${title.length} chars)` });

  // Meta description
  if (!metaDesc) issues.push({ severity: "critical", message: "Missing meta description" });
  else if (metaDesc.length < 120) issues.push({ severity: "warning", message: `Meta description short (${metaDesc.length} chars) — aim for 150-160` });
  else if (metaDesc.length > 160) issues.push({ severity: "warning", message: `Meta description long (${metaDesc.length} chars) — aim for 150-160` });
  else issues.push({ severity: "pass", message: `Meta description (${metaDesc.length} chars)` });

  // H1
  if (h1s.length === 0) issues.push({ severity: "critical", message: "No H1 tag found" });
  else if (h1s.length > 1) issues.push({ severity: "warning", message: `Multiple H1 tags (${h1s.length}) — use only one` });
  else issues.push({ severity: "pass", message: `H1: "${h1s[0]}"` });

  // Images — alt text
  if (imagesNoAlt > 0) issues.push({ severity: "warning", message: `${imagesNoAlt} of ${imagesTotal} images missing alt text` });
  else if (imagesTotal > 0) issues.push({ severity: "pass", message: `All ${imagesTotal} images have alt text` });

  // Images — lazy loading
  const imagesNoLazy = images.filter((img) => {
    const loading = img.getAttribute("loading");
    return loading !== "lazy" && loading !== "eager";
  }).length;
  if (imagesNoLazy > 0) issues.push({ severity: "warning", message: `${imagesNoLazy} images missing lazy-loading attribute` });
  else if (imagesTotal > 0) issues.push({ severity: "pass", message: "All images have loading attribute" });

  // Images — modern format
  const nonModernFormatImages = images.filter((img) => {
    const src = (img.getAttribute("src") || "").toLowerCase();
    return /\.(jpg|jpeg|png|bmp|gif)(\?|$)/.test(src);
  }).length;
  if (nonModernFormatImages > 0) issues.push({ severity: "info", message: `${nonModernFormatImages} images not served in modern format (WebP/AVIF)` });

  // Images — width/height (CLS)
  const imagesMissingDimensions = images.filter((img) => {
    return !img.getAttribute("width") || !img.getAttribute("height");
  }).length;
  if (imagesMissingDimensions > 0) issues.push({ severity: "warning", message: `${imagesMissingDimensions} images missing width/height attributes — causes CLS` });
  else if (imagesTotal > 0) issues.push({ severity: "pass", message: "All images have width/height attributes" });

  // Open Graph
  if (!ogTitle || !ogDesc) issues.push({ severity: "warning", message: "Incomplete Open Graph tags (missing title or description)" });
  else issues.push({ severity: "pass", message: "Open Graph tags present" });

  if (!ogImage) issues.push({ severity: "warning", message: "Missing og:image" });
  else issues.push({ severity: "pass", message: "OG image set" });

  // Mobile
  if (!viewport) issues.push({ severity: "critical", message: "Missing viewport meta tag — not mobile-friendly" });
  else issues.push({ severity: "pass", message: "Viewport meta tag present" });

  // Canonical
  if (!canonical) issues.push({ severity: "warning", message: "No canonical URL set" });
  else issues.push({ severity: "pass", message: `Canonical: ${canonical}` });

  // Schema
  if (schemas.length === 0) issues.push({ severity: "info", message: "No structured data (JSON-LD) found" });
  else issues.push({ severity: "pass", message: `${schemas.length} schema markup(s) found` });

  // HTTPS
  if (!httpsRedirect) issues.push({ severity: "critical", message: "Site not using HTTPS" });
  else issues.push({ severity: "pass", message: "HTTPS enabled" });

  if (hasHsts) issues.push({ severity: "pass", message: "HSTS header present" });

  // Robots
  if (metaRobots.includes("noindex")) issues.push({ severity: "critical", message: "Page is set to noindex!" });

  // Context-aware schema suggestions
  const contextSchemaIssues = detectContextSchemas(html);
  issues.push(...contextSchemaIssues);

  // Crawl internal pages for duplicate content detection (up to 5 pages)
  const internalUrls = links
    .map((a) => a.getAttribute("href") || "")
    .filter((href) => href.startsWith("/") && !href.startsWith("//") && !href.includes("#"))
    .map((href) => new URL(href, url).href);
  const uniqueInternalUrls = [...new Set(internalUrls)].slice(0, 5);

  const crawledPages: PageScan[] = [{ url, title, metaDescription: metaDesc }];

  const crawlResults = await Promise.allSettled(
    uniqueInternalUrls.map(async (pageUrl) => {
      const { html: pageHtml } = await fetchPage(pageUrl);
      const pageRoot = parse(pageHtml);
      return {
        url: pageUrl,
        title: pageRoot.querySelector("title")?.text?.trim() || "",
        metaDescription: pageRoot.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "",
      };
    })
  );

  for (const result of crawlResults) {
    if (result.status === "fulfilled") {
      crawledPages.push(result.value);
    }
  }

  const duplicateIssues = detectDuplicateContent(crawledPages);
  issues.push(...duplicateIssues);

  // Calculate score
  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const passes = issues.filter((i) => i.severity === "pass").length;
  const total = critical + warnings + passes;
  const score = total > 0 ? Math.round(((passes - critical * 2) / total) * 100) : 0;
  const clampedScore = Math.max(0, Math.min(100, score));

  const result = {
    url,
    status,
    score: clampedScore,
    grade: scoreToGrade(clampedScore),
    title,
    metaDescription: metaDesc,
    h1s,
    h2s: h2s.slice(0, 10),
    h3s: h3s.slice(0, 10),
    images: { total: imagesTotal, missingAlt: imagesNoAlt, missingLazy: imagesNoLazy, nonModernFormat: nonModernFormatImages, missingDimensions: imagesMissingDimensions },
    links: { internal: internalLinks, external: externalLinks },
    schemas: schemas.map((s: any) => s["@type"] || "Unknown"),
    resources: { scripts, stylesheets },
    issues,
    summary: {
      critical,
      warnings,
      passes,
      info: issues.filter((i) => i.severity === "info").length,
    },
  };

  // Save audit report
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const auditDir = join(SEO_ROOT, domain, "audits");
  await mkdir(auditDir, { recursive: true });
  const reportLines = [
    `# Site Audit — ${domain}`,
    `**Date**: ${new Date().toISOString().slice(0, 10)}`,
    `**Score**: ${clampedScore}/100 (${scoreToGrade(clampedScore)})`,
    "",
    "## Issues",
    ...issues.map((i) => `- ${i.severity === "pass" ? "PASS" : i.severity === "critical" ? "CRITICAL" : i.severity === "warning" ? "WARNING" : "INFO"}: ${i.message}`),
    "",
    `## Structure`,
    `- H1s: ${h1s.join(", ") || "none"}`,
    `- H2s: ${h2s.slice(0, 5).join(", ") || "none"}`,
    `- Images: ${imagesTotal} total, ${imagesNoAlt} missing alt`,
    `- Links: ${internalLinks} internal, ${externalLinks} external`,
    `- Schemas: ${schemas.map((s: any) => s["@type"]).join(", ") || "none"}`,
  ];
  await writeFile(join(auditDir, `audit-${timestamp}.md`), reportLines.join("\n"));

  return result;
}

// ─── Keyword Research ───────────────────────────────────────────

async function runKeywordResearch(domain: string, topic?: string) {
  const searchQuery = topic
    ? `${topic} keywords SEO search volume`
    : `${domain} main keywords SEO what does this site rank for`;

  const relatedQuery = topic
    ? `${topic} related long tail keywords people also ask`
    : `${domain} competitors keywords SEO niche`;

  const [mainSearch, relatedSearch] = await Promise.all([
    tavilySearch(searchQuery, 8),
    tavilySearch(relatedQuery, 5),
  ]);

  return {
    query: topic || domain,
    answer: mainSearch.answer || "",
    results: (mainSearch.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200),
    })),
    relatedInsights: (relatedSearch.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200),
    })),
    relatedAnswer: relatedSearch.answer || "",
  };
}

// ─── Content Brief ──────────────────────────────────────────────

async function runContentBrief(domain: string, keyword: string) {
  const [serpSearch, questionsSearch] = await Promise.all([
    tavilySearch(`${keyword} comprehensive guide`, 8),
    tavilySearch(`${keyword} people also ask questions FAQ`, 5),
  ]);

  const topResults = (serpSearch.results || []).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content?.slice(0, 300),
  }));

  const questions = (questionsSearch.results || []).map((r: any) => ({
    title: r.title,
    snippet: r.content?.slice(0, 200),
  }));

  const brief = {
    keyword,
    domain,
    searchIntent: serpSearch.answer || "",
    topCompetitors: topResults,
    questionsToAnswer: questions,
    suggestedOutline: [
      `# [Title targeting "${keyword}"]`,
      "",
      "## Introduction",
      `- Answer "${keyword}" in first 100 words`,
      "- Hook the reader with a stat or question",
      "",
      ...topResults.slice(0, 5).map((r: any, i: number) => `## ${i + 2}. ${r.title.split(" - ")[0].split(" | ")[0]}`),
      "",
      "## FAQ Section",
      ...questions.slice(0, 5).map((q: any) => `### ${q.title.split(" - ")[0].split(" | ")[0]}`),
      "",
      "## Conclusion + CTA",
    ].join("\n"),
  };

  // Save brief
  const slug = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);
  const contentDir = join(SEO_ROOT, domain, "content");
  await mkdir(contentDir, { recursive: true });
  await writeFile(
    join(contentDir, `brief-${slug}.md`),
    [
      `# Content Brief: ${keyword}`,
      `**Site**: ${domain}`,
      `**Date**: ${new Date().toISOString().slice(0, 10)}`,
      "",
      "## Search Intent",
      brief.searchIntent,
      "",
      "## Suggested Outline",
      brief.suggestedOutline,
      "",
      "## Top Competitors",
      ...topResults.map((r: any) => `- [${r.title}](${r.url})`),
      "",
      "## Questions to Answer",
      ...questions.map((q: any) => `- ${q.title}`),
    ].join("\n")
  );

  return brief;
}

// ─── Backlink Analysis ──────────────────────────────────────────

async function runBacklinkAnalysis(domain: string) {
  const search = await tavilySearch(`${domain} backlinks referring domains site authority`, 8);

  return {
    domain,
    answer: search.answer || "",
    sources: (search.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 250),
    })),
    note: "For detailed backlink data, connect Semrush or Ahrefs via Rube.",
  };
}

// ─── Schema Markup ──────────────────────────────────────────────

async function runSchemaAnalysis(domain: string) {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const { html } = await fetchPage(url);
  const root = parse(html);

  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]');
  const existing = jsonLd.map((el) => {
    try { return JSON.parse(el.text); } catch { return null; }
  }).filter(Boolean);

  const hasOrg = existing.some((s: any) => s["@type"] === "Organization");
  const hasWebsite = existing.some((s: any) => s["@type"] === "WebSite");
  const hasLocal = existing.some((s: any) => s["@type"] === "LocalBusiness");
  const hasBreadcrumb = existing.some((s: any) => s["@type"] === "BreadcrumbList");
  const hasFaq = existing.some((s: any) => s["@type"] === "FAQPage");

  const suggestions: string[] = [];
  if (!hasOrg) suggestions.push("Add Organization schema with logo, name, social profiles");
  if (!hasWebsite) suggestions.push("Add WebSite schema with SearchAction for sitelinks search box");
  if (!hasLocal) suggestions.push("Consider LocalBusiness schema if you serve local customers");
  if (!hasBreadcrumb) suggestions.push("Add BreadcrumbList schema for better SERP display");
  if (!hasFaq) suggestions.push("Add FAQPage schema to FAQ content for rich results");

  // Context-aware schema suggestions based on page content
  const contextIssues = detectContextSchemas(html);
  for (const issue of contextIssues) {
    suggestions.push(issue.message);
  }

  return {
    domain,
    existing: existing.map((s: any) => ({
      type: s["@type"] || "Unknown",
      raw: JSON.stringify(s, null, 2).slice(0, 500),
    })),
    suggestions,
    score: existing.length > 0 ? Math.min(100, existing.length * 25) : 0,
  };
}

// ─── Local SEO ──────────────────────────────────────────────────

async function runLocalSeo(domain: string) {
  const [businessSearch, reviewSearch] = await Promise.all([
    tavilySearch(`"${domain}" Google Business Profile local SEO NAP`, 5),
    tavilySearch(`"${domain}" reviews ratings local listings`, 5),
  ]);

  return {
    domain,
    businessPresence: businessSearch.answer || "",
    businessResults: (businessSearch.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200),
    })),
    reviewInsights: reviewSearch.answer || "",
    reviewResults: (reviewSearch.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 200),
    })),
  };
}

// ─── Technical Check (robots.txt, sitemap, headers) ────────────

async function runTechnicalCheck(domain: string) {
  const base = domain.startsWith("http") ? domain : `https://${domain}`;

  // Check robots.txt
  let robotsTxt = "";
  let robotsStatus = 0;
  try {
    const r = await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(10000) });
    robotsStatus = r.status;
    if (r.ok) robotsTxt = await r.text();
  } catch { robotsStatus = 0; }

  // Check sitemap
  let sitemapUrl = "";
  let sitemapStatus = 0;
  let sitemapUrls = 0;

  // Try from robots.txt first
  const sitemapMatch = robotsTxt.match(/Sitemap:\s*(.+)/i);
  if (sitemapMatch) sitemapUrl = sitemapMatch[1].trim();
  else sitemapUrl = `${base}/sitemap.xml`;

  try {
    const r = await fetch(sitemapUrl, { signal: AbortSignal.timeout(10000) });
    sitemapStatus = r.status;
    if (r.ok) {
      const text = await r.text();
      sitemapUrls = (text.match(/<loc>/g) || []).length;
    }
  } catch { sitemapStatus = 0; }

  // Check security headers
  let headers: Record<string, string> = {};
  try {
    const r = await fetch(base, { method: "HEAD", signal: AbortSignal.timeout(10000), redirect: "follow" });
    r.headers.forEach((v, k) => { headers[k] = v; });
  } catch {}

  const securityHeaders = {
    hsts: !!headers["strict-transport-security"],
    xFrameOptions: headers["x-frame-options"] || "",
    xContentType: headers["x-content-type-options"] || "",
    csp: !!headers["content-security-policy"],
    referrerPolicy: headers["referrer-policy"] || "",
  };

  // Check redirect chain
  let redirects: string[] = [];
  try {
    const r = await fetch(`http://${domain}`, {
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });
    if (r.status >= 300 && r.status < 400) {
      redirects.push(`http://${domain} → ${r.headers.get("location") || "unknown"}`);
    }
  } catch {}

  const issues: { severity: string; message: string }[] = [];

  if (robotsStatus !== 200) issues.push({ severity: "warning", message: `robots.txt returned ${robotsStatus || "unreachable"}` });
  else issues.push({ severity: "pass", message: "robots.txt found" });

  if (sitemapStatus !== 200) issues.push({ severity: "warning", message: `Sitemap returned ${sitemapStatus || "unreachable"}` });
  else issues.push({ severity: "pass", message: `Sitemap found with ${sitemapUrls} URLs` });

  if (!securityHeaders.hsts) issues.push({ severity: "warning", message: "Missing HSTS header" });
  else issues.push({ severity: "pass", message: "HSTS header present" });

  if (!securityHeaders.xContentType) issues.push({ severity: "info", message: "Missing X-Content-Type-Options header" });
  if (!securityHeaders.csp) issues.push({ severity: "info", message: "Missing Content-Security-Policy header" });

  return {
    domain,
    robotsTxt: robotsTxt.slice(0, 2000),
    robotsStatus,
    sitemapUrl,
    sitemapStatus,
    sitemapUrls,
    securityHeaders,
    redirects,
    issues,
    serverHeader: headers["server"] || "",
    poweredBy: headers["x-powered-by"] || "",
  };
}

// ─── Find Competitors ───────────────────────────────────────────

async function findCompetitors(domain: string): Promise<{ domains: string[]; source: string }> {
  // 1. Check profile.md for already-listed competitors
  const profilePath = join(SEO_ROOT, domain, "profile.md");
  let profileCompetitors: string[] = [];
  try {
    const { readFile } = await import("fs/promises");
    const profile = await readFile(profilePath, "utf-8");
    const match = profile.match(/\*\*Competitors\*\*:\s*(.+)/i);
    if (match) {
      // Extract domains from comma-separated names — map known names to domains
      profileCompetitors = match[1]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch { /* no profile */ }

  // 2. Tavily search for competitor domains
  const query = `top competitors of ${domain} similar websites alternative`;
  const search = await tavilySearch(query, 8);
  const tavilyDomains: string[] = [];
  for (const r of search.results || []) {
    try {
      const u = new URL(r.url);
      const d = u.hostname.replace(/^www\./, "");
      if (d && d !== domain && !d.includes("google.") && !d.includes("wikipedia.") && !d.includes("reddit.")) {
        tavilyDomains.push(d);
      }
    } catch {}
  }

  // Deduplicate
  const seen = new Set<string>([domain]);
  const results: string[] = [];
  for (const d of tavilyDomains) {
    if (!seen.has(d)) { seen.add(d); results.push(d); }
    if (results.length >= 5) break;
  }

  return {
    domains: results,
    source: profileCompetitors.length > 0 ? `Profile lists: ${profileCompetitors.slice(0, 4).join(", ")}` : "",
  };
}

// ─── Route Handler ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, domain, keyword, topic } = body;

    if (!action || !domain) {
      return NextResponse.json({ error: "Missing action or domain" }, { status: 400 });
    }

    let result: any;

    switch (action) {
      case "site-audit":
        result = await runSiteAudit(domain);
        break;
      case "keyword-research":
        result = await runKeywordResearch(domain, topic);
        break;
      case "content-brief":
        if (!keyword) return NextResponse.json({ error: "Missing keyword for content brief" }, { status: 400 });
        result = await runContentBrief(domain, keyword);
        break;
      case "backlink-analysis":
        result = await runBacklinkAnalysis(domain);
        break;
      case "schema-markup":
        result = await runSchemaAnalysis(domain);
        break;
      case "local-seo":
        result = await runLocalSeo(domain);
        break;
      case "technical-check":
        result = await runTechnicalCheck(domain);
        break;
      case "find-competitors":
        result = await findCompetitors(domain);
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, action, domain, result });
  } catch (err: any) {
    console.error("SEO action error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Action failed" },
      { status: 500 }
    );
  }
}
