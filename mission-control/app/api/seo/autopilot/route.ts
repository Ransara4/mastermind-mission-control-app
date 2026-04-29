import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type {
  AutopilotResult,
  AuditIssue,
  TechIssue,
  FixQueueItem,
  PageScan,
  RankResult,
  CruxResult,
} from "@/lib/seo-types";
import { scoreToGrade } from "@/lib/seo-types";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();


function scanPage(html: string, url: string, status: number): PageScan {
  const root = parse(html);
  const title = root.querySelector("title")?.text?.trim() || "";
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const h1s = root.querySelectorAll("h1");
  const h1Text = h1s.length > 0 ? h1s[0].text.trim() : "";
  const h1Count = h1s.length;
  const images = root.querySelectorAll("img");
  const imageCount = images.length;
  const imagesMissingAlt = images.filter((img) => !img.getAttribute("alt")?.trim()).length;
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const hasCanonical = !!canonical;
  const issues: string[] = [];
  let score = 100;
  if (!title) { score -= 20; issues.push("No title tag"); }
  else if (title.length < 30 || title.length > 60) { score -= 10; issues.push(`Title length ${title.length} (aim 30-60)`); }
  if (!metaDesc) { score -= 20; issues.push("Missing meta description"); }
  else if (metaDesc.length < 120 || metaDesc.length > 160) { score -= 10; issues.push(`Meta description length ${metaDesc.length} (aim 120-160)`); }
  if (h1Count === 0) { score -= 20; issues.push("No H1"); }
  else if (h1Count > 1) { score -= 10; issues.push(`Multiple H1 tags (${h1Count})`); }
  if (imagesMissingAlt > 0) {
    const deduction = Math.min(20, imagesMissingAlt * 5);
    score -= deduction;
    issues.push(`${imagesMissingAlt} images missing alt text`);
  }
  if (!hasCanonical) { score -= 5; issues.push("No canonical URL"); }
  return { url, title, metaDesc, h1: h1Text, h1Count, imageCount, imagesMissingAlt, hasCanonical, status, score: Math.max(0, score), issues };
}

const SEO_ROOT = join(HOME, "seo");
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";

// ─── Shared Helpers ──────────────────────────────────────────────

async function fetchPage(url: string): Promise<{ html: string; status: number; headers: Record<string, string> }> {
  const tryFetch = async (u: string) => {
    const res = await fetch(u, {
      headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    const html = await res.text();
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    return { html, status: res.status, headers };
  };
  try {
    const result = await tryFetch(url);
    if (result.html) return result;
    // Retry with www. prefix if bare domain failed
    if (!url.includes("://www.")) {
      const wwwUrl = url.replace("://", "://www.");
      return await tryFetch(wwwUrl);
    }
    return result;
  } catch {
    // Retry with www. on network error
    if (!url.includes("://www.")) {
      try {
        return await tryFetch(url.replace("://", "://www."));
      } catch {}
    }
    return { html: "", status: 0, headers: {} };
  }
}

async function readText(path: string): Promise<string> {
  try { return await readFile(path, "utf-8"); } catch { return ""; }
}

// ─── Phase 1: Crawl ─────────────────────────────────────────────

async function phaseCrawl(domain: string): Promise<{ ok: boolean; pagesFound: number; worstPages: PageScan[] }> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  // Try sitemap
  let pageUrls: string[] = [];
  const sitemapCandidates = [`${baseUrl}/sitemap.xml`, `${baseUrl}/sitemap_index.xml`, `${baseUrl}/sitemap-0.xml`];

  for (const candidate of sitemapCandidates) {
    try {
      const res = await fetch(candidate, {
        headers: { "User-Agent": "OpenClaw-SEO-Crawler/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        const locMatches = text.match(/<loc>(.*?)<\/loc>/g);
        if (locMatches && locMatches.length > 0) {
          pageUrls = locMatches
            .map((m) => m.replace(/<\/?loc>/g, ""))
            .filter((u) => {
              try {
                const parsed = new URL(u);
                return !parsed.pathname.endsWith('.xml') && !parsed.pathname.includes('sitemap');
              } catch { return !u.match(/\.xml$/i) && !u.includes('sitemap'); }
            })
            .slice(0, 20);
          break;
        }
      }
    } catch { /* continue */ }
  }

  // Fallback: crawl homepage links
  if (pageUrls.length === 0) {
    const { html } = await fetchPage(baseUrl);
    if (html) {
      const root = parse(html);
      const seen = new Set<string>([baseUrl]);
      pageUrls = [baseUrl];
      for (const a of root.querySelectorAll("a[href]")) {
        if (pageUrls.length >= 20) break;
        const href = a.getAttribute("href") || "";
        let resolved = "";
        if (href.startsWith("/") && !href.startsWith("//")) {
          resolved = `${baseUrl}${href}`;
        } else if (href.startsWith("http") && href.includes(domain)) {
          resolved = href;
        }
        if (resolved && !seen.has(resolved) && !resolved.includes("#") && !resolved.match(/\.(pdf|jpg|png|gif|svg|css|js|zip|xml)$/i)) {
          seen.add(resolved);
          pageUrls.push(resolved);
        }
      }
    }
  }

  // Scan pages
  const pages: PageScan[] = [];
  for (const url of pageUrls.slice(0, 20)) {
    try {
      const { html, status } = await fetchPage(url);
      if (html) {
        pages.push(scanPage(html, url, status));
      }
    } catch { /* skip failed pages */ }
  }

  pages.sort((a, b) => a.score - b.score);

  return { ok: true, pagesFound: pages.length, worstPages: pages };
}

// ─── Phase 2: Homepage Audit ────────────────────────────────────

async function phaseAudit(domain: string): Promise<{ ok: boolean; score: number; grade: string; issues: AuditIssue[] }> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const { html, headers } = await fetchPage(url);
  if (!html) return { ok: false, score: 0, grade: "F", issues: [{ severity: "critical", message: "Could not fetch homepage" }] };

  const root = parse(html);
  const title = root.querySelector("title")?.text?.trim() || "";
  const metaDesc = root.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
  const metaRobots = root.querySelector('meta[name="robots"]')?.getAttribute("content") || "";
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  const ogTitle = root.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";
  const ogDesc = root.querySelector('meta[property="og:description"]')?.getAttribute("content") || "";
  const ogImage = root.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";
  const viewport = root.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";
  const h1s = root.querySelectorAll("h1");
  const images = root.querySelectorAll("img");
  const imagesNoAlt = images.filter((img) => !img.getAttribute("alt")?.trim()).length;

  const issues: AuditIssue[] = [];

  if (!title) issues.push({ severity: "critical", message: "Missing title tag" });
  else if (title.length < 30) issues.push({ severity: "warning", message: `Title too short (${title.length} chars)` });
  else if (title.length > 60) issues.push({ severity: "warning", message: `Title too long (${title.length} chars)` });
  else issues.push({ severity: "pass", message: `Title: "${title}" (${title.length} chars)` });

  if (!metaDesc) issues.push({ severity: "critical", message: "Missing meta description" });
  else if (metaDesc.length < 120) issues.push({ severity: "warning", message: `Meta description short (${metaDesc.length} chars)` });
  else if (metaDesc.length > 160) issues.push({ severity: "warning", message: `Meta description long (${metaDesc.length} chars)` });
  else issues.push({ severity: "pass", message: `Meta description (${metaDesc.length} chars)` });

  if (h1s.length === 0) issues.push({ severity: "critical", message: "No H1 tag found" });
  else if (h1s.length > 1) issues.push({ severity: "warning", message: `Multiple H1 tags (${h1s.length})` });
  else issues.push({ severity: "pass", message: `H1: "${h1s[0].text.trim()}"` });

  if (imagesNoAlt > 0) issues.push({ severity: "warning", message: `${imagesNoAlt} of ${images.length} images missing alt text` });
  else if (images.length > 0) issues.push({ severity: "pass", message: `All ${images.length} images have alt text` });

  if (!ogTitle || !ogDesc) issues.push({ severity: "warning", message: "Incomplete Open Graph tags" });
  else issues.push({ severity: "pass", message: "Open Graph tags present" });
  if (!ogImage) issues.push({ severity: "warning", message: "Missing og:image" });

  if (!viewport) issues.push({ severity: "critical", message: "Missing viewport meta tag" });
  else issues.push({ severity: "pass", message: "Viewport meta tag present" });

  if (!canonical) issues.push({ severity: "warning", message: "No canonical URL set" });
  else issues.push({ severity: "pass", message: `Canonical: ${canonical}` });

  if (metaRobots.includes("noindex")) issues.push({ severity: "critical", message: "Page is set to noindex!" });

  if (!url.startsWith("https://")) issues.push({ severity: "critical", message: "Site not using HTTPS" });
  else issues.push({ severity: "pass", message: "HTTPS enabled" });

  if (headers["strict-transport-security"]) issues.push({ severity: "pass", message: "HSTS header present" });

  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const passes = issues.filter((i) => i.severity === "pass").length;
  const total = critical + warnings + passes;
  const rawScore = total > 0 ? Math.round(((passes - critical * 2) / total) * 100) : 0;
  const score = Math.max(0, Math.min(100, rawScore));

  return { ok: true, score, grade: scoreToGrade(score), issues };
}

// ─── Phase 3: Technical Check ───────────────────────────────────

async function phaseTechnical(domain: string): Promise<{ ok: boolean; issues: TechIssue[] }> {
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  const issues: TechIssue[] = [];

  // robots.txt
  try {
    const r = await fetch(`${base}/robots.txt`, { signal: AbortSignal.timeout(10000) });
    if (r.status !== 200) issues.push({ severity: "warning", message: `robots.txt returned ${r.status}` });
    else issues.push({ severity: "pass", message: "robots.txt found" });
  } catch { issues.push({ severity: "warning", message: "robots.txt unreachable" }); }

  // sitemap
  let sitemapFound = false;
  for (const path of ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-0.xml"]) {
    try {
      const r = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(8000) });
      if (r.ok) { sitemapFound = true; issues.push({ severity: "pass", message: `Sitemap found at ${path}` }); break; }
    } catch { /* continue */ }
  }
  if (!sitemapFound) issues.push({ severity: "warning", message: "No sitemap found" });

  // Security headers
  try {
    const r = await fetch(base, { method: "HEAD", signal: AbortSignal.timeout(10000), redirect: "follow" });
    const headers: Record<string, string> = {};
    r.headers.forEach((v, k) => { headers[k] = v; });

    if (!headers["strict-transport-security"]) issues.push({ severity: "warning", message: "Missing HSTS header" });
    else issues.push({ severity: "pass", message: "HSTS header present" });

    if (!headers["content-security-policy"]) issues.push({ severity: "info", message: "Missing Content-Security-Policy header" });
    if (!headers["x-content-type-options"]) issues.push({ severity: "info", message: "Missing X-Content-Type-Options header" });
  } catch { issues.push({ severity: "warning", message: "Could not check security headers" }); }

  // HTTP → HTTPS redirect + redirect chain detection
  try {
    let currentUrl = `http://${domain}`;
    let hops = 0;
    const maxHops = 5;
    let finalIsHttps = false;

    while (hops < maxHops) {
      const r = await fetch(currentUrl, { redirect: "manual", signal: AbortSignal.timeout(8000) });
      if (r.status >= 300 && r.status < 400) {
        hops++;
        const loc = r.headers.get("location") || "";
        if (!loc) break;
        // Resolve relative redirects
        currentUrl = loc.startsWith("/") ? new URL(loc, currentUrl).href : loc;
        if (loc.startsWith("https://")) finalIsHttps = true;
      } else {
        // Not a redirect — stop
        break;
      }
    }

    if (hops > 0) {
      if (finalIsHttps) {
        issues.push({ severity: "pass", message: "HTTP redirects to HTTPS" });
      } else {
        issues.push({ severity: "warning", message: `HTTP redirects but final destination is not HTTPS` });
      }
    }

    if (hops > 2) {
      issues.push({
        severity: "warning",
        message: `Redirect chain of ${hops} hops detected — consolidate to single redirect for SEO`,
      });
    }
  } catch { /* ignore */ }

  return { ok: true, issues };
}

// ─── Phase 4: Schema Analysis ───────────────────────────────────

async function phaseSchema(domain: string): Promise<{ ok: boolean; existing: string[]; suggestions: string[] }> {
  const url = domain.startsWith("http") ? domain : `https://${domain}`;
  const { html } = await fetchPage(url);
  if (!html) return { ok: false, existing: [], suggestions: ["Could not fetch page"] };

  const root = parse(html);
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]');
  const schemas = jsonLd.map((el) => {
    try { return JSON.parse(el.text); } catch { return null; }
  }).filter(Boolean);

  const existing = schemas.map((s: any) => s["@type"] || "Unknown");

  const suggestions: string[] = [];
  const hasType = (t: string) => existing.includes(t);
  if (!hasType("Organization")) suggestions.push("Add Organization schema with logo, name, social profiles");
  if (!hasType("WebSite")) suggestions.push("Add WebSite schema with SearchAction for sitelinks search box");
  if (!hasType("LocalBusiness")) suggestions.push("Consider LocalBusiness schema if you serve local customers");
  if (!hasType("BreadcrumbList")) suggestions.push("Add BreadcrumbList schema for better SERP display");
  if (!hasType("FAQPage")) suggestions.push("Add FAQPage schema to FAQ content for rich results");

  return { ok: true, existing, suggestions };
}

// ─── Phase 5: Rankings ──────────────────────────────────────────

async function phaseRankings(domain: string): Promise<{ ok: boolean; checked: number; results: RankResult[] }> {
  const keywordsPath = join(SEO_ROOT, domain, "keywords.md");
  const content = await readText(keywordsPath);
  if (!content) return { ok: true, checked: 0, results: [] };

  // Parse keyword table
  const keywords: string[] = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells[0] === "Keyword") { inTable = true; continue; }
    if (cells[0]?.startsWith("---")) continue;
    if (inTable && cells.length >= 1 && cells[0]) {
      keywords.push(cells[0]);
    }
  }

  if (keywords.length === 0) return { ok: true, checked: 0, results: [] };
  if (!TAVILY_KEY) return { ok: false, checked: 0, results: [] };

  const results: RankResult[] = [];
  const now = new Date().toISOString().slice(0, 10);

  for (const keyword of keywords.slice(0, 10)) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_KEY,
          query: keyword,
          max_results: 10,
          search_depth: "basic",
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      const searchResults = data.results || [];
      let found = false;
      for (let i = 0; i < searchResults.length; i++) {
        if ((searchResults[i].url || "").includes(domain)) {
          results.push({ keyword, position: i + 1, found: true, url: searchResults[i].url, checkedAt: now });
          found = true;
          break;
        }
      }
      if (!found) {
        results.push({ keyword, position: 0, found: false, checkedAt: now });
      }
    } catch {
      results.push({ keyword, position: 0, found: false, checkedAt: now });
    }
  }

  // Update keywords.md with new ranks
  const updatedLines: string[] = [];
  let headerDone = false;
  for (const line of lines) {
    if (!headerDone) {
      updatedLines.push(line);
      if (line.trim().startsWith("|---")) headerDone = true;
      continue;
    }
    if (!line.includes("|") || !line.trim()) {
      updatedLines.push(line);
      continue;
    }
    const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
    if (cells.length >= 6) {
      const result = results.find((r) => r.keyword.toLowerCase() === cells[0].toLowerCase());
      if (result && result.found) {
        cells[1] = String(result.position);
        cells[5] = result.checkedAt;
      } else if (result) {
        cells[5] = result.checkedAt;
      }
      updatedLines.push(`| ${cells.join(" | ")} |`);
    } else {
      updatedLines.push(line);
    }
  }

  await writeFile(keywordsPath, updatedLines.join("\n"));

  return { ok: true, checked: results.length, results };
}

// ─── Fix Queue Generation ───────────────────────────────────────

async function buildFixQueue(
  domain: string,
  crawlPages: PageScan[],
  auditIssues: AuditIssue[],
  techIssues: TechIssue[],
  schemaResult: { existing: string[]; suggestions: string[] },
  hosting: string,
): Promise<FixQueueItem[]> {
  const items: FixQueueItem[] = [];
  let idCounter = 1;

  // Pre-fetch homepage data for generating auto-fix values
  let siteTitle = "";
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const { html } = await fetchPage(url);
    if (html) {
      const root = parse(html);
      siteTitle = root.querySelector("title")?.text?.trim() || "";
    }
  } catch { /* best-effort */ }

  function nextId(): string {
    return `fix_${Date.now()}_${idCounter++}`;
  }

  function classifyFix(issueMsg: string): "auto" | "claude" | "manual" {
    const msg = issueMsg.toLowerCase();

    // Manual items
    if (msg.includes("google business")) return "manual";
    if (msg.includes("hsts")) return "manual";
    if (msg.includes("content-security-policy") || msg.includes("csp")) return "manual";
    if (msg.includes("og:image") && msg.includes("missing")) return "manual";
    if (msg.includes("noindex")) return "manual";

    // Auto for Wix sites
    if (hosting === "wix") {
      if (msg.includes("meta description")) return "auto";
      if (msg.includes("site display name")) return "auto";
    }

    // Claude fixes (browser-fix tier)
    if (msg.includes("alt text") || msg.includes("alt")) return "claude";
    if (msg.includes("schema") || msg.includes("json-ld") || msg.includes("structured data")) return "claude";
    if (msg.includes("canonical")) return "claude";
    if (msg.includes("robots.txt")) return "claude";
    if (msg.includes("sitemap")) return "claude";
    if (msg.includes("title") && !msg.includes("og:")) return "claude";
    if (msg.includes("h1") || msg.includes("no h1") || msg.includes("missing h1")) return "claude";

    return "manual";
  }

  function classifySeverity(sev: string): "critical" | "warning" | "info" {
    if (sev === "critical") return "critical";
    if (sev === "warning") return "warning";
    return "info";
  }

  // From audit issues (homepage)
  for (const issue of auditIssues) {
    if (issue.severity === "pass") continue;
    const fixType = classifyFix(issue.message);
    const item: FixQueueItem = {
      id: nextId(),
      severity: classifySeverity(issue.severity),
      category: "audit",
      message: issue.message,
      page: `https://${domain}`,
      fixType,
      status: "pending",
    };

    if (fixType === "auto") {
      const isDescription = issue.message.toLowerCase().includes("meta description");
      if (isDescription) {
        // Meta description: always fix via the fix route (which calls Claude + pushes to Wix)
        // Mark as auto so FixAllBanner runs it through fixOne → /api/seo/fix
        item.fixType = "auto";
        item.fixAction = "updateDescription";
        // fixParams.value is intentionally empty — fix route will generate via Claude
        item.fixParams = { domain, value: "__ai_generate__" };
      } else {
        // updateSiteDisplayName
        const cleanDomain = domain.replace(/^www\./, "");
        const displayName = siteTitle || cleanDomain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        if (displayName) {
          item.fixAction = "updateSiteDisplayName";
          item.fixParams = { domain, value: displayName };
        } else {
          item.fixType = "claude";
          item.claudeCommand = `Determine and set the site display name for ${domain}`;
        }
      }
    }
    if (fixType === "claude") {
      item.claudeCommand = item.claudeCommand || buildClaudeCommand(issue.message, domain, `https://${domain}`);
    }
    if (fixType === "manual") {
      item.steps = buildManualSteps(issue.message, domain);
    }

    items.push(item);
  }

  // From technical issues
  for (const issue of techIssues) {
    if (issue.severity === "pass") continue;
    const fixType = classifyFix(issue.message);
    const item: FixQueueItem = {
      id: nextId(),
      severity: classifySeverity(issue.severity),
      category: "technical",
      message: issue.message,
      page: `https://${domain}`,
      fixType,
      status: "pending",
    };

    if (fixType === "claude") {
      item.claudeCommand = buildClaudeCommand(issue.message, domain, `https://${domain}`);
    }
    if (fixType === "manual") {
      item.steps = buildManualSteps(issue.message, domain);
    }

    items.push(item);
  }

  // From schema suggestions
  for (const suggestion of schemaResult.suggestions) {
    items.push({
      id: nextId(),
      severity: "info",
      category: "schema",
      message: suggestion,
      page: `https://${domain}`,
      fixType: "claude",
      claudeCommand: `Generate and inject ${suggestion.split(" ")[1] || "Organization"} schema markup for ${domain}`,
      status: "pending",
    });
  }

  // NLWeb availability check
  try {
    await stat(join(SEO_ROOT, domain, "nlweb-enabled.json"));
    // File exists — NLWeb is configured, no issue needed
  } catch {
    // File missing — NLWeb not configured
    items.push({
      id: nextId(),
      severity: "info",
      category: "nlweb",
      message: "NLWeb not configured — AI agents cannot query this site",
      page: `https://${domain}`,
      fixType: "manual",
      status: "pending",
      steps: [
        "Open Wix Dashboard → Settings → Custom Code",
        "Click Add Code → Head section → All pages",
        `Paste: (function(){var l=document.createElement('link');l.rel='nlweb';l.href='https://mc.openclaw.io/api/seo/nlweb/${domain}';document.head.appendChild(l);})();`,
        "Save",
      ],
    });
  }

  // llms.txt availability check
  try {
    await stat(join(SEO_ROOT, domain, "llms.txt"));
    // File exists — llms.txt is generated, no issue needed
  } catch {
    // File missing — llms.txt not generated
    items.push({
      id: nextId(),
      severity: "info",
      category: "llms",
      message: "llms.txt not generated — AI models cannot discover this site's content structure",
      page: `https://${domain}`,
      fixType: "auto",
      status: "pending",
    });
  }

  // Broken links — check cache, trigger background scan if missing
  try {
    const brokenLinksPath = join(SEO_ROOT, domain, "broken-links.json");
    let hasBrokenLinksCache = false;
    try {
      await stat(brokenLinksPath);
      hasBrokenLinksCache = true;
    } catch { /* no cache yet */ }

    if (hasBrokenLinksCache) {
      try {
        const raw = await readFile(brokenLinksPath, "utf-8");
        const cached = JSON.parse(raw);
        const brokenCount = cached?.broken?.length ?? 0;
        if (brokenCount > 0) {
          items.push({
            id: nextId(),
            severity: "warning",
            category: "technical",
            message: `${brokenCount} broken link${brokenCount === 1 ? "" : "s"} found — hurts crawlability and user experience`,
            page: `https://${domain}`,
            fixType: "manual",
            status: "pending",
            steps: [
              "Open the Broken Links panel in the SEO Overview tab",
              "Review each broken URL and the page it was found on",
              "Update or remove each broken link in your CMS",
            ],
          });
        }
      } catch { /* corrupted cache, skip */ }
    } else {
      // Kick off a background scan — non-blocking, ignore errors
      fetch(`http://localhost:3000/api/seo/broken-links?domain=${encodeURIComponent(domain)}`, {
        signal: AbortSignal.timeout(60_000),
      }).catch(() => { /* background only */ });
    }
  } catch { /* best-effort */ }

  // From crawl (page-level issues) — deduplicate by normalizing URLs
  const seen = new Set<string>();
  const normalizeUrl = (u: string) => u.replace(/^https?:\/\/(www\.)?/, "").replace(/\/+$/, "");
  const seenCrawlUrls = new Set<string>();
  for (const page of crawlPages) {
    const normUrl = normalizeUrl(page.url);
    if (seenCrawlUrls.has(normUrl)) continue;
    seenCrawlUrls.add(normUrl);
    for (const issue of page.issues) {
      const dedupeKey = `${issue}-${normUrl}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      // Skip if we already have this issue from the audit (homepage)
      if (page.url.replace(/\/$/, "") === `https://${domain}`.replace(/\/$/, "")) continue;

      const fixType = classifyFix(issue);
      const item: FixQueueItem = {
        id: nextId(),
        severity: issue.toLowerCase().startsWith("no ") || issue.toLowerCase().startsWith("missing") ? "critical" : "warning",
        category: "page",
        message: issue,
        page: page.url,
        fixType,
        status: "pending",
      };

      if (fixType === "claude") {
        item.claudeCommand = buildClaudeCommand(issue, domain, page.url);
      }
      if (fixType === "manual") {
        item.steps = buildManualSteps(issue, domain);
      }

      items.push(item);
    }
  }

  return items;
}

function buildClaudeCommand(issue: string, domain: string, pageUrl: string): string {
  const msg = issue.toLowerCase();
  if (msg.includes("alt text") || msg.includes("alt")) {
    return `Fix missing alt text on all images at ${pageUrl} for site ${domain}`;
  }
  if (msg.includes("schema") || msg.includes("json-ld") || msg.includes("structured data")) {
    return `Generate and inject schema markup for ${domain}`;
  }
  if (msg.includes("robots")) {
    return `Fix robots.txt for ${domain}`;
  }
  if (msg.includes("sitemap")) {
    return `Fix sitemap for ${domain}`;
  }
  if (msg.includes("canonical")) {
    return `Fix canonical URL on ${pageUrl} for ${domain}`;
  }
  if (msg.includes("title")) {
    return `Fix page title on ${pageUrl} for ${domain}`;
  }
  if (msg.includes("h1")) {
    return `Fix H1 heading on ${pageUrl} for ${domain}`;
  }
  if (msg.includes("meta description")) {
    return `Fix meta description on ${pageUrl} for ${domain}`;
  }
  return `Fix SEO issue "${issue}" on ${pageUrl} for ${domain}`;
}

function buildManualSteps(issue: string, domain: string): string[] {
  const msg = issue.toLowerCase();
  if (msg.includes("hsts")) return ["Configure HSTS header in hosting/CDN settings", "Set max-age to at least 31536000", "Include subdomains if applicable"];
  if (msg.includes("csp") || msg.includes("content-security-policy")) return ["Configure Content-Security-Policy header in hosting settings", "Start with a report-only policy to avoid breaking the site"];
  if (msg.includes("noindex")) return ["Remove noindex from the page's meta robots tag", "Check robots.txt for Disallow rules", "Republish the page"];
  if (msg.includes("og:image")) return ["Create a 1200x630px social share image", "Upload to hosting or CDN", "Set the og:image meta tag"];
  if (msg.includes("google business")) return ["Claim your Google Business Profile", "Verify ownership", "Complete all profile fields"];
  return [`Address: ${issue}`, `Check the page at https://${domain}`, "Save and publish when done"];
}

// ─── Main Autopilot Orchestrator ─────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain } = body;

    if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    const startTime = Date.now();

    // Load hosting info from websites.db, fall back to sites.json
    let hosting = "";
    const dbSites = getWebsitesForSeo();
    const dbEntry = dbSites.find((s: any) => s.domain === domain);
    if (dbEntry) {
      hosting = dbEntry.hosting || "";
    } else {
      try {
        const sitesRaw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
        const sitesData = JSON.parse(sitesRaw);
        const siteEntry = (sitesData.sites || []).find((s: any) => s.domain === domain);
        hosting = siteEntry?.hosting || "";
      } catch { /* no sites.json */ }
    }

    // Phase 1: Crawl
    let crawlResult: { ok: boolean; pagesFound: number; worstPages: PageScan[] } = { ok: false, pagesFound: 0, worstPages: [] };
    try {
      crawlResult = await phaseCrawl(domain);
    } catch (err: any) {
      console.error("Autopilot Phase 1 (Crawl) error:", err.message);
    }

    // Phase 2: Audit
    let auditResult: { ok: boolean; score: number; grade: string; issues: AuditIssue[] } = { ok: false, score: 0, grade: "F", issues: [] };
    try {
      auditResult = await phaseAudit(domain);
    } catch (err: any) {
      console.error("Autopilot Phase 2 (Audit) error:", err.message);
    }

    // Phase 3: Technical
    let techResult: { ok: boolean; issues: TechIssue[] } = { ok: false, issues: [] };
    try {
      techResult = await phaseTechnical(domain);
    } catch (err: any) {
      console.error("Autopilot Phase 3 (Technical) error:", err.message);
    }

    // Phase 4: Schema
    let schemaResult: { ok: boolean; existing: string[]; suggestions: string[] } = { ok: false, existing: [], suggestions: [] };
    try {
      schemaResult = await phaseSchema(domain);
    } catch (err: any) {
      console.error("Autopilot Phase 4 (Schema) error:", err.message);
    }

    // Phase 5: Rankings
    let rankResult: { ok: boolean; checked: number; results: RankResult[] } = { ok: false, checked: 0, results: [] };
    try {
      rankResult = await phaseRankings(domain);
    } catch (err: any) {
      console.error("Autopilot Phase 5 (Rankings) error:", err.message);
    }

    // Build fix queue
    const fixQueue = await buildFixQueue(
      domain,
      crawlResult.worstPages,
      auditResult.issues,
      techResult.issues,
      schemaResult,
      hosting,
    );

    // Schema validation — test homepage JSON-LD and add issues to fix queue
    try {
      const schemaTestRes = await fetch(
        `http://localhost:3000/api/seo/schema-test?domain=${encodeURIComponent(domain)}`,
        { signal: AbortSignal.timeout(20_000) }
      );
      if (schemaTestRes.ok) {
        const schemaTest = await schemaTestRes.json();
        let schemaIdCounter = Date.now() + 800;
        if (schemaTest.totalSchemas === 0) {
          fixQueue.push({
            id: `fix_${schemaIdCounter++}`,
            severity: "info",
            category: "schema",
            message: "No schema markup found — add structured data for rich results",
            page: `https://${domain}`,
            fixType: "claude",
            claudeCommand: `Generate and inject Organization schema markup for ${domain}`,
            status: "pending",
          });
        } else if (schemaTest.hasErrors) {
          fixQueue.push({
            id: `fix_${schemaIdCounter++}`,
            severity: "warning",
            category: "schema",
            message: "Schema errors found — rich results may not appear",
            page: `https://${domain}`,
            fixType: "claude",
            claudeCommand: `Fix invalid JSON-LD schema markup on ${domain} — errors found in structured data`,
            status: "pending",
          });
        }
      }
    } catch (err: any) {
      console.error("Autopilot schema-test error:", err.message);
    }

    // Internal links — check for orphan pages and add issues to fix queue
    try {
      const internalLinksRes = await fetch(
        `http://localhost:3000/api/seo/internal-links?domain=${encodeURIComponent(domain)}`,
        { signal: AbortSignal.timeout(60_000) }
      );
      if (internalLinksRes.ok) {
        const linkMap = await internalLinksRes.json();
        if (linkMap.orphans && linkMap.orphans.length > 0) {
          const count = linkMap.orphans.length;
          fixQueue.push({
            id: `fix_${Date.now() + 801}`,
            severity: "warning",
            category: "technical",
            message: `${count} orphan page${count === 1 ? "" : "s"} found — Google may not discover or rank them`,
            page: `https://${domain}`,
            fixType: "manual",
            status: "pending",
            steps: [
              "Review the Internal Links report in the SEO dashboard",
              "Add links to orphan pages from relevant pages on your site",
              "Consider adding them to your site navigation or a sitemap page",
            ],
          });
        }
      }
    } catch (err: any) {
      console.error("Autopilot internal-links error:", err.message);
    }

    // Duplicate content — check for duplicate titles/descriptions
    try {
      const duplicatesRes = await fetch(
        `http://localhost:3000/api/seo/duplicates?domain=${encodeURIComponent(domain)}`,
        { signal: AbortSignal.timeout(60_000) }
      );
      if (duplicatesRes.ok) {
        const dupes = await duplicatesRes.json();
        let dupIdCounter = Date.now() + 802;
        if (dupes.duplicateTitles && dupes.duplicateTitles.length > 0) {
          const count = dupes.duplicateTitles.length;
          fixQueue.push({
            id: `fix_${dupIdCounter++}`,
            severity: "warning",
            category: "audit",
            message: `${count} page${count === 1 ? "" : "s"} share duplicate titles — confuses Google about which to rank`,
            page: `https://${domain}`,
            fixType: "manual",
            status: "pending",
            steps: [
              "Review pages with duplicate titles in the SEO dashboard",
              "Give each page a unique, descriptive title (50-60 chars)",
              "Focus on your most important pages first",
            ],
          });
        }
        if (dupes.duplicateDescriptions && dupes.duplicateDescriptions.length > 0) {
          const count = dupes.duplicateDescriptions.length;
          fixQueue.push({
            id: `fix_${dupIdCounter++}`,
            severity: "info",
            category: "audit",
            message: `${count} page${count === 1 ? "" : "s"} share duplicate meta descriptions`,
            page: `https://${domain}`,
            fixType: "manual",
            status: "pending",
            steps: [
              "Write a unique meta description for each page (150-160 chars)",
              "Descriptions should reflect the specific content of each page",
            ],
          });
        }
      }
    } catch (err: any) {
      console.error("Autopilot duplicates error:", err.message);
    }

    // Fetch CrUX real-user data and append performance issues
    let cruxResult: CruxResult | null = null;
    try {
      const cruxRes = await fetch(`http://localhost:3000/api/seo/crux?domain=${encodeURIComponent(domain)}`, {
        signal: AbortSignal.timeout(30_000),
      });
      if (cruxRes.ok) {
        cruxResult = await cruxRes.json();
        if (cruxResult && cruxResult.dataSource !== "not_found") {
          let cruxIdCounter = Date.now() + 900;
          if (cruxResult.lcp && cruxResult.lcp.p75 > 4000) {
            fixQueue.push({
              id: `fix_${cruxIdCounter++}`,
              severity: "warning",
              category: "performance",
              message: `Poor real-user LCP: ${cruxResult.lcp.p75}ms (p75) — real users experience slow page loads`,
              page: `https://${domain}`,
              fixType: "manual",
              status: "pending",
              steps: [
                "Optimize largest image or hero element on the page",
                "Enable server-side caching or use a CDN",
                "Remove render-blocking resources (large CSS/JS in <head>)",
              ],
            });
          }
          if (cruxResult.inp && cruxResult.inp.p75 > 500) {
            fixQueue.push({
              id: `fix_${cruxIdCounter++}`,
              severity: "warning",
              category: "performance",
              message: `Poor real-user INP: ${cruxResult.inp.p75}ms (p75) — page feels unresponsive to real users`,
              page: `https://${domain}`,
              fixType: "manual",
              status: "pending",
              steps: [
                "Reduce JavaScript execution time on main thread",
                "Break up long tasks (> 50ms) into smaller chunks",
                "Defer non-critical JavaScript",
              ],
            });
          }
        }
      }
    } catch (err: any) {
      console.error("Autopilot CrUX fetch error:", err.message);
    }

    const critical = fixQueue.filter((i) => i.severity === "critical").length;
    const warnings = fixQueue.filter((i) => i.severity === "warning").length;
    const autoFixable = fixQueue.filter((i) => i.fixType === "auto").length;
    const claudeFixable = fixQueue.filter((i) => i.fixType === "claude").length;
    const manualItems = fixQueue.filter((i) => i.fixType === "manual").length;

    // If audit failed (score=0, ok=false), fall back to crawl-based average
    let overallScore = auditResult.score;
    if (!auditResult.ok && crawlResult.ok && crawlResult.worstPages.length > 0) {
      const crawlAvg = Math.round(
        crawlResult.worstPages.reduce((sum, p) => sum + p.score, 0) / crawlResult.worstPages.length
      );
      overallScore = crawlAvg;
    }
    const grade = scoreToGrade(overallScore);

    const result: AutopilotResult = {
      domain,
      runAt: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      summary: {
        score: overallScore,
        grade,
        pagesScanned: crawlResult.pagesFound,
        critical,
        warnings,
        autoFixable,
        claudeFixable,
        manualItems,
      },
      phases: {
        crawl: crawlResult,
        audit: auditResult,
        technical: techResult,
        schema: schemaResult,
        rankings: rankResult,
      },
      fixQueue,
      crux: cruxResult,
    };

    // Save results
    const siteDir = join(SEO_ROOT, domain);
    await mkdir(siteDir, { recursive: true });
    await writeFile(join(siteDir, "autopilot-latest.json"), JSON.stringify(result, null, 2));
    await writeFile(join(siteDir, "fix-queue.json"), JSON.stringify(fixQueue, null, 2));

    // Append audit history for trending
    const historyPath = join(siteDir, "audit-history.json");
    let auditHistory: Array<Record<string, unknown>> = [];
    try {
      const raw = await readFile(historyPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) auditHistory = parsed;
    } catch { /* file doesn't exist yet */ }
    auditHistory.push({
      date: result.runAt,
      score: overallScore,
      grade,
      critical,
      warnings,
      passes: auditResult.issues.filter((i) => i.severity === "pass").length,
      pages: crawlResult.pagesFound,
    });
    await writeFile(historyPath, JSON.stringify(auditHistory, null, 2));

    // Also save crawl
    await writeFile(join(siteDir, "crawl-latest.json"), JSON.stringify({
      pages: crawlResult.worstPages,
      sitemapUrl: "",
      totalFound: crawlResult.pagesFound,
      scanned: crawlResult.pagesFound,
    }, null, 2));

    // Fire-and-forget sitemap submission to Google + Bing
    fetch("http://localhost:3000/api/seo/submit-sitemap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    }).catch(() => {});

    // Fire-and-forget competitor discovery — populate if no cache exists yet
    stat(join(SEO_ROOT, domain, "competitors.json")).catch(() => {
      fetch(
        `http://localhost:3000/api/seo/competitors?domain=${encodeURIComponent(domain)}&refresh=true`,
        { signal: AbortSignal.timeout(300_000) }
      ).catch(() => {});
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Autopilot error:", err);
    return NextResponse.json({ error: err.message || "Autopilot failed" }, { status: 500 });
  }
}
