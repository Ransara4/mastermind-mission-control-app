import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { DuplicateContentResult } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PAGES = 30;

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function fetchPage(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    return await res.text();
  } catch {
    return "";
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
  const html = await fetchPage(baseUrl);
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

function extractMeta(html: string): { title: string; description: string } {
  try {
    const root = parse(html);
    const title = root.querySelector("title")?.text?.trim() || "";
    const description =
      root
        .querySelector('meta[name="description"]')
        ?.getAttribute("content")
        ?.trim() || "";
    return { title, description };
  } catch {
    return { title: "", description: "" };
  }
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
  const cachePath = join(siteDir, "duplicates.json");

  // Check cache unless refresh requested
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: DuplicateContentResult = JSON.parse(
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

  // Get page list
  const pageUrls = await getPageList(domain, baseUrl);

  if (pageUrls.length === 0) {
    return NextResponse.json(
      { error: "Could not discover any pages for this domain" },
      { status: 502 }
    );
  }

  // Normalize URL: strip www. so https://example.com and https://www.example.com
  // are treated as the same page and don't produce false duplicates
  function normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hostname = u.hostname.replace(/^www\./, "");
      return u.toString();
    } catch {
      return url;
    }
  }

  // Collect titles and descriptions per page (keyed by normalized URL)
  const titleMap = new Map<string, string[]>(); // title -> list of URLs
  const descMap = new Map<string, string[]>(); // description -> list of URLs
  const missingTitles: string[] = [];
  const missingDescriptions: string[] = [];
  const seenNormalized = new Set<string>();

  for (const url of pageUrls.slice(0, MAX_PAGES)) {
    try {
      // Skip if we've already processed the normalized form of this URL
      const normalized = normalizeUrl(url);
      if (seenNormalized.has(normalized)) continue;
      seenNormalized.add(normalized);

      const html = await fetchPage(url);
      if (!html) continue;

      const { title, description } = extractMeta(html);

      if (!title) {
        missingTitles.push(url);
      } else {
        const existing = titleMap.get(title) || [];
        existing.push(url);
        titleMap.set(title, existing);
      }

      if (!description) {
        missingDescriptions.push(url);
      } else {
        const existing = descMap.get(description) || [];
        existing.push(url);
        descMap.set(description, existing);
      }
    } catch {
      // skip failed pages
    }
  }

  // Filter to duplicates only (2+ pages sharing the same value)
  const duplicateTitles: DuplicateContentResult["duplicateTitles"] = [];
  for (const [title, urls] of titleMap) {
    if (urls.length >= 2) {
      duplicateTitles.push({ title, urls });
    }
  }

  const duplicateDescriptions: DuplicateContentResult["duplicateDescriptions"] = [];
  for (const [description, urls] of descMap) {
    if (urls.length >= 2) {
      duplicateDescriptions.push({ description, urls });
    }
  }

  // Sort by number of duplicates descending (most widespread issue first)
  duplicateTitles.sort((a, b) => b.urls.length - a.urls.length);
  duplicateDescriptions.sort((a, b) => b.urls.length - a.urls.length);

  const result: DuplicateContentResult = {
    domain,
    duplicateTitles,
    duplicateDescriptions,
    missingTitles,
    missingDescriptions,
    analyzedAt: new Date().toISOString(),
  };

  // Ensure directory exists and cache result
  if (!(await fileExists(siteDir))) {
    await mkdir(siteDir, { recursive: true });
  }
  await writeFile(cachePath, JSON.stringify(result, null, 2));

  return NextResponse.json(result);
}
