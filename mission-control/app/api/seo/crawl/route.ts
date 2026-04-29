import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { PageScan, CrawlResult } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");

async function fetchHtml(url: string): Promise<{ html: string; status: number }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenClaw-SEO-Crawler/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    const html = await res.text();
    return { html, status: res.status };
  } catch {
    return { html: "", status: 0 };
  }
}

function extractDomain(urlStr: string): string {
  try {
    return new URL(urlStr).hostname;
  } catch {
    return "";
  }
}

async function discoverSitemap(baseUrl: string): Promise<{ sitemapUrl: string; urls: string[] }> {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap-0.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: { "User-Agent": "OpenClaw-SEO-Crawler/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        const locMatches = text.match(/<loc>(.*?)<\/loc>/g);
        if (locMatches && locMatches.length > 0) {
          const urls = locMatches.map((m) => m.replace(/<\/?loc>/g, ""));
          return { sitemapUrl: candidate, urls };
        }
      }
    } catch {
      // continue to next candidate
    }
  }

  return { sitemapUrl: "", urls: [] };
}

async function crawlHomepageLinks(baseUrl: string, domain: string): Promise<string[]> {
  const { html } = await fetchHtml(baseUrl);
  if (!html) return [baseUrl];

  const root = parse(html);
  const anchors = root.querySelectorAll("a[href]");
  const seen = new Set<string>([baseUrl]);
  const result = [baseUrl];

  for (const a of anchors) {
    if (result.length >= 20) break;
    const href = a.getAttribute("href") || "";
    let resolved = "";

    if (href.startsWith("/") && !href.startsWith("//")) {
      resolved = `${baseUrl}${href}`;
    } else if (href.startsWith("http") && href.includes(domain)) {
      resolved = href;
    }

    if (resolved && !seen.has(resolved) && !resolved.includes("#") && !resolved.match(/\.(pdf|jpg|png|gif|svg|css|js|zip)$/i)) {
      seen.add(resolved);
      result.push(resolved);
    }
  }

  return result;
}

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

  // Score calculation
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

  return {
    url,
    title,
    metaDesc,
    h1: h1Text,
    h1Count,
    imageCount,
    imagesMissingAlt,
    hasCanonical,
    status,
    score: Math.max(0, score),
    issues,
  };
}

async function runCrawl(domain: string, maxPages: number = 30): Promise<CrawlResult> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const cleanDomain = extractDomain(baseUrl) || domain;

  // Discover pages
  const { sitemapUrl, urls: sitemapUrls } = await discoverSitemap(baseUrl);
  let pageUrls: string[];

  if (sitemapUrls.length > 0) {
    pageUrls = sitemapUrls.slice(0, maxPages);
  } else {
    pageUrls = await crawlHomepageLinks(baseUrl, cleanDomain);
  }

  const totalFound = sitemapUrls.length || pageUrls.length;

  // Scan each page
  const pages: PageScan[] = [];
  for (const pageUrl of pageUrls.slice(0, maxPages)) {
    const { html, status } = await fetchHtml(pageUrl);
    if (html) {
      pages.push(scanPage(html, pageUrl, status));
    }
  }

  // Sort by score ascending (worst first)
  pages.sort((a, b) => a.score - b.score);

  const result: CrawlResult = {
    pages,
    sitemapUrl,
    totalFound,
    scanned: pages.length,
  };

  // Save crawl result
  const crawlDir = join(SEO_ROOT, domain);
  await mkdir(crawlDir, { recursive: true });
  await writeFile(join(crawlDir, "crawl-latest.json"), JSON.stringify(result, null, 2));

  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, maxPages } = body;

    if (!domain) {
      return NextResponse.json({ error: "Missing domain" }, { status: 400 });
    }

    const result = await runCrawl(domain, maxPages || 30);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Crawl error:", err);
    return NextResponse.json({ error: err.message || "Crawl failed" }, { status: 500 });
  }
}
