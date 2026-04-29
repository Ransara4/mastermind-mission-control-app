import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { BrokenLink, BrokenLinksResult, RedirectChain } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours
const MAX_PAGES = 20;
const MAX_LINKS = 200;
const BATCH_SIZE = 5;
const FETCH_TIMEOUT = 8000;
const PAGE_TIMEOUT = 10000;
const MAX_REDIRECT_HOPS = 5;

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function normalizeHostname(domain: string): string {
  return domain.replace(/^www\./, "");
}

function isInternalUrl(href: string, domain: string): boolean {
  try {
    const parsed = new URL(href);
    const normalized = normalizeHostname(parsed.hostname);
    return normalized === normalizeHostname(domain) || parsed.hostname === domain;
  } catch {
    return false;
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function shouldSkip(href: string): boolean {
  if (!href) return true;
  const lower = href.toLowerCase().trim();
  if (lower.startsWith("mailto:")) return true;
  if (lower.startsWith("tel:")) return true;
  if (lower.startsWith("javascript:")) return true;
  if (lower.startsWith("#")) return true;
  if (lower === "/" || lower === "") return true;
  return false;
}

async function fetchSitemapUrls(baseUrl: string): Promise<string[]> {
  const candidates = [
    `${baseUrl}/sitemap.xml`,
    `${baseUrl}/sitemap_index.xml`,
    `${baseUrl}/sitemap-0.xml`,
  ];

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const text = await res.text();
        const locMatches = text.match(/<loc>(.*?)<\/loc>/g);
        if (locMatches && locMatches.length > 0) {
          return locMatches
            .map((m) => m.replace(/<\/?loc>/g, "").trim())
            .filter((u) => {
              try {
                const parsed = new URL(u);
                return (
                  !parsed.pathname.endsWith(".xml") &&
                  !parsed.pathname.includes("sitemap")
                );
              } catch {
                return false;
              }
            })
            .slice(0, MAX_PAGES);
        }
      }
    } catch {
      // try next candidate
    }
  }
  return [];
}

async function extractLinksFromPage(
  url: string
): Promise<Array<{ href: string; text: string }>> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
      redirect: "follow",
      signal: AbortSignal.timeout(PAGE_TIMEOUT),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const links: Array<{ href: string; text: string }> = [];
    // Simple regex extraction — avoids node-html-parser import in this route
    const anchorRegex = /<a[^>]+href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = anchorRegex.exec(html)) !== null) {
      const href = match[1]?.trim() || "";
      // Strip tags from anchor text
      const text = (match[2] || "").replace(/<[^>]+>/g, "").trim().slice(0, 100);
      if (href) {
        links.push({ href, text });
      }
    }
    return links;
  } catch {
    return [];
  }
}

async function checkLink(
  url: string,
  foundOn: string,
  linkText: string,
  domain: string
): Promise<{
  broken: BrokenLink | null;
  redirect: RedirectChain | null;
}> {
  const isInternal = isInternalUrl(url, domain);
  const isExternal = !isInternal;

  try {
    // First try HEAD
    let res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
    });

    // Fall back to GET if HEAD fails or returns method not allowed
    if (res.status === 405 || res.status === 0) {
      res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
        headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
      });
    }

    const status = res.status;

    // Detect redirect chain
    if (status >= 300 && status < 400) {
      const chain: Array<{ url: string; statusCode: number }> = [
        { url, statusCode: status },
      ];
      let currentUrl = url;
      let hops = 1;

      while (hops < MAX_REDIRECT_HOPS) {
        const location = res.headers.get("location");
        if (!location) break;
        const resolved = resolveUrl(location, currentUrl);
        if (!resolved) break;
        currentUrl = resolved;

        try {
          const nextRes = await fetch(currentUrl, {
            method: "HEAD",
            redirect: "manual",
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
            headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
          });
          chain.push({ url: currentUrl, statusCode: nextRes.status });
          if (nextRes.status < 300 || nextRes.status >= 400) break;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          res = nextRes;
          hops++;
        } catch {
          break;
        }
      }

      const finalUrl = chain[chain.length - 1]?.url || currentUrl;
      const finalStatus = chain[chain.length - 1]?.statusCode || status;

      // Broken at the final destination?
      if (finalStatus >= 400) {
        return {
          broken: {
            url,
            foundOn,
            statusCode: finalStatus,
            linkText: linkText || undefined,
            isInternal,
            isExternal,
          },
          redirect: null,
        };
      }

      // Flag chains with >= 2 hops (double redirect)
      if (hops >= 2) {
        return {
          broken: null,
          redirect: {
            url,
            chain,
            finalUrl,
            hops,
            foundOn,
          },
        };
      }

      return { broken: null, redirect: null };
    }

    if (status >= 400) {
      return {
        broken: {
          url,
          foundOn,
          statusCode: status,
          linkText: linkText || undefined,
          isInternal,
          isExternal,
        },
        redirect: null,
      };
    }

    return { broken: null, redirect: null };
  } catch {
    // Network error — treat as broken (status 0)
    return {
      broken: {
        url,
        foundOn,
        statusCode: 0,
        linkText: linkText || undefined,
        isInternal,
        isExternal,
      },
      redirect: null,
    };
  }
}

async function runBrokenLinkScan(domain: string): Promise<BrokenLinksResult> {
  const baseUrl = domain.startsWith("http") ? domain : `https://${domain}`;

  // 1. Discover pages
  let pageUrls = await fetchSitemapUrls(baseUrl);

  if (pageUrls.length === 0) {
    // Fallback: fetch homepage and extract internal links
    try {
      const res = await fetch(baseUrl, {
        headers: { "User-Agent": "OpenClaw-SEO-Auditor/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(PAGE_TIMEOUT),
      });
      if (res.ok) {
        const html = await res.text();
        const anchorRegex = /<a[^>]+href=["']([^"'#][^"']*)["'][^>]*>/gi;
        const seen = new Set<string>([baseUrl]);
        pageUrls = [baseUrl];
        let match;
        while ((match = anchorRegex.exec(html)) !== null && pageUrls.length < MAX_PAGES) {
          const href = match[1]?.trim() || "";
          if (!href) continue;
          const resolved = resolveUrl(href, baseUrl);
          if (!resolved || seen.has(resolved)) continue;
          if (!isInternalUrl(resolved, domain)) continue;
          if (resolved.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|xml|webp|ico|woff|woff2|ttf)$/i)) continue;
          seen.add(resolved);
          pageUrls.push(resolved);
        }
      }
    } catch {
      pageUrls = [baseUrl];
    }
  }

  // 2. Collect all links from each page
  const allLinks = new Map<string, { foundOn: string; text: string }>(); // url -> first occurrence
  let scanned = 0;

  for (const pageUrl of pageUrls.slice(0, MAX_PAGES)) {
    const rawLinks = await extractLinksFromPage(pageUrl);
    scanned++;

    for (const { href, text } of rawLinks) {
      if (shouldSkip(href)) continue;
      const resolved = resolveUrl(href, pageUrl);
      if (!resolved) continue;
      if (resolved.match(/\.(pdf|jpg|jpeg|png|gif|svg|css|js|zip|webp|ico|woff|woff2|ttf)$/i)) continue;

      if (!allLinks.has(resolved) && allLinks.size < MAX_LINKS) {
        allLinks.set(resolved, { foundOn: pageUrl, text });
      }
    }
  }

  // 3. Check links in batches of BATCH_SIZE
  const broken: BrokenLink[] = [];
  const redirectChains: RedirectChain[] = [];
  const linkEntries = Array.from(allLinks.entries());

  for (let i = 0; i < linkEntries.length; i += BATCH_SIZE) {
    const batch = linkEntries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(([url, { foundOn, text }]) =>
        checkLink(url, foundOn, text, domain)
      )
    );

    for (const result of results) {
      if (result.broken) broken.push(result.broken);
      if (result.redirect) redirectChains.push(result.redirect);
    }
  }

  // Deduplicate broken links by URL
  const deduped = Array.from(
    new Map(broken.map((b) => [b.url, b])).values()
  );

  return {
    domain,
    scanned,
    linksChecked: allLinks.size,
    broken: deduped,
    redirectChains,
    fetchedAt: new Date().toISOString(),
  };
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
    return NextResponse.json(
      { error: "Missing or invalid domain parameter" },
      { status: 400 }
    );
  }

  const siteDir = join(SEO_ROOT, domain);
  const cachePath = join(siteDir, "broken-links.json");

  // Return cache if fresh and not forced refresh
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: BrokenLinksResult = JSON.parse(
        await readFile(cachePath, "utf-8")
      );
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached);
      }
    } catch {
      // Cache corrupted, proceed to scan
    }
  }

  try {
    const result = await runBrokenLinkScan(domain);

    // Save to cache
    if (!(await fileExists(siteDir))) {
      await mkdir(siteDir, { recursive: true });
    }
    await writeFile(cachePath, JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Broken link scan error:", err);
    return NextResponse.json(
      { error: err.message || "Broken link scan failed" },
      { status: 502 }
    );
  }
}
