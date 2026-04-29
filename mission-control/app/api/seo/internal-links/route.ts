import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { InternalLinkMap } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_PAGES = 20;

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<{ html: string; status: number }> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    return { html: await res.text(), status: res.status };
  } catch {
    return { html: "", status: 0 };
  }
}

async function getPageList(domain: string, baseUrl: string): Promise<string[]> {
  const pageUrls: string[] = [];

  // Try sitemap
  const sitemapCandidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap-0.xml`,
  ];

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
          const urls = locMatches
            .map((m) => m.replace(/<\/?loc>/g, ""))
            .filter((u) => {
              try {
                const parsed = new URL(u);
                return (
                  !parsed.pathname.endsWith(".xml") &&
                  !parsed.pathname.includes("sitemap")
                );
              } catch {
                return !u.match(/\.xml$/i) && !u.includes("sitemap");
              }
            })
            .slice(0, MAX_PAGES);
          if (urls.length > 0) {
            return urls;
          }
        }
      }
    } catch {
      // continue
    }
  }

  // Fallback: crawl homepage links
  const { html } = await fetchPage(baseUrl);
  if (html) {
    const root = parse(html);
    const seen = new Set<string>([baseUrl]);
    pageUrls.push(baseUrl);
    for (const a of root.querySelectorAll("a[href]")) {
      if (pageUrls.length >= MAX_PAGES) break;
      const href = a.getAttribute("href") || "";
      let resolved = "";
      if (href.startsWith("/") && !href.startsWith("//")) {
        resolved = `${baseUrl}${href}`;
      } else if (href.startsWith("http") && href.includes(domain)) {
        resolved = href;
      }
      if (
        resolved &&
        !seen.has(resolved) &&
        !resolved.includes("#") &&
        !resolved.match(/\.(pdf|jpg|png|gif|svg|css|js|zip|xml)$/i)
      ) {
        seen.add(resolved);
        pageUrls.push(resolved);
      }
    }
  }

  return pageUrls;
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove trailing slash for consistent comparison (except root)
    const path = parsed.pathname === "/" ? "/" : parsed.pathname.replace(/\/$/, "");
    return `${parsed.protocol}//${parsed.host}${path}`;
  } catch {
    return url;
  }
}

function extractTitle(html: string): string {
  try {
    const root = parse(html);
    return root.querySelector("title")?.text?.trim() || "";
  } catch {
    return "";
  }
}

function extractInternalLinks(html: string, domain: string, baseUrl: string): string[] {
  const links: string[] = [];
  try {
    const root = parse(html);
    for (const a of root.querySelectorAll("a[href]")) {
      const href = a.getAttribute("href") || "";
      let resolved = "";
      if (href.startsWith("/") && !href.startsWith("//")) {
        resolved = `${baseUrl}${href}`;
      } else if (href.startsWith("http") && href.includes(domain)) {
        resolved = href;
      }
      if (
        resolved &&
        !resolved.includes("#") &&
        !resolved.match(/\.(pdf|jpg|png|gif|svg|css|js|zip|xml)$/i)
      ) {
        links.push(normalizeUrl(resolved));
      }
    }
  } catch {
    // ignore parse errors
  }
  return links;
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!domain) {
    return NextResponse.json(
      { error: "Missing required query param: domain" },
      { status: 400 }
    );
  }

  const siteDir = join(SEO_ROOT, domain);
  const cachePath = join(siteDir, "internal-links.json");

  // Check cache unless refresh requested
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: InternalLinkMap = JSON.parse(
        await readFile(cachePath, "utf-8")
      );
      const age = Date.now() - new Date(cached.analyzedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached);
      }
    } catch {
      // Cache corrupted, proceed
    }
  }

  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;
  const normalizedBase = normalizeUrl(baseUrl);

  // Get page list
  const pageUrls = await getPageList(domain, baseUrl);

  if (pageUrls.length === 0) {
    return NextResponse.json(
      { error: "Could not discover any pages for this domain" },
      { status: 502 }
    );
  }

  // Fetch HTML for each page and collect internal links
  type PageData = {
    url: string;
    normalizedUrl: string;
    title: string;
    outboundLinks: string[]; // normalized URLs this page links to
  };

  const pageDataMap = new Map<string, PageData>();

  for (const url of pageUrls.slice(0, MAX_PAGES)) {
    try {
      const { html } = await fetchPage(url);
      if (html) {
        const normalizedUrl = normalizeUrl(url);
        const outboundLinks = extractInternalLinks(html, domain, baseUrl);
        const title = extractTitle(html);
        pageDataMap.set(normalizedUrl, {
          url,
          normalizedUrl,
          title,
          outboundLinks,
        });
      }
    } catch {
      // skip failed pages
    }
  }

  // Build inbound link counts
  const inboundCounts = new Map<string, number>();
  for (const [, pageData] of pageDataMap) {
    for (const linkedUrl of pageData.outboundLinks) {
      if (linkedUrl !== pageData.normalizedUrl) {
        inboundCounts.set(linkedUrl, (inboundCounts.get(linkedUrl) || 0) + 1);
      }
    }
  }

  // Build the result
  const pages: InternalLinkMap["pages"] = [];
  for (const [normalizedUrl, pageData] of pageDataMap) {
    const inboundLinks = inboundCounts.get(normalizedUrl) || 0;
    const isOrphan = inboundLinks === 0 && normalizedUrl !== normalizedBase;
    pages.push({
      url: pageData.url,
      title: pageData.title,
      inboundLinks,
      outboundLinks: pageData.outboundLinks.length,
      isOrphan,
    });
  }

  // Sort: orphans first, then by inbound links ascending
  pages.sort((a, b) => {
    if (a.isOrphan && !b.isOrphan) return -1;
    if (!a.isOrphan && b.isOrphan) return 1;
    return a.inboundLinks - b.inboundLinks;
  });

  const orphans = pages.filter((p) => p.isOrphan).map((p) => p.url);

  const result: InternalLinkMap = {
    domain,
    pages,
    orphans,
    analyzedAt: new Date().toISOString(),
  };

  // Ensure directory exists and cache result
  if (!(await fileExists(siteDir))) {
    await mkdir(siteDir, { recursive: true });
  }
  await writeFile(cachePath, JSON.stringify(result, null, 2));

  return NextResponse.json(result);
}
