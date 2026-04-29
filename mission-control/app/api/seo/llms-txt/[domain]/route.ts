import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { join } from "path";
import { generateLlmsTxt, saveLlmsTxt } from "@/lib/seo-llms";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const PLAIN_HEADERS = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "public, max-age=86400",
  ...CORS_HEADERS,
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  const { domain: rawDomain } = await context.params;
  const domain = rawDomain.toLowerCase();

  // Domain validation
  if (!/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain)) {
    return new NextResponse("# Invalid domain\n\nDomain format not recognised.", {
      status: 400,
      headers: PLAIN_HEADERS,
    });
  }

  // Check domain exists in websites.db, fall back to sites.json
  let domainFound = false;
  const dbSites = getWebsitesForSeo();
  if (dbSites.length > 0) {
    domainFound = dbSites.some((s: any) => s.domain === domain);
  } else {
    try {
      const sitesRaw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
      const sites: Array<{ domain: string }> = JSON.parse(sitesRaw).sites || [];
      domainFound = sites.some((s) => s.domain === domain);
    } catch {
      // sites.json unreadable — proceed anyway (best-effort)
      domainFound = true;
    }
  }
  if (!domainFound) {
    return new NextResponse(`# Not found\n\nNo site configured for this domain.`, {
      status: 404,
      headers: PLAIN_HEADERS,
    });
  }

  const cachePath = join(SEO_ROOT, domain, "llms.txt");

  // Serve from cache if fresh (< 24h)
  try {
    const fileStat = await stat(cachePath);
    const age = Date.now() - fileStat.mtimeMs;
    if (age < CACHE_MAX_AGE_MS) {
      const cached = await readFile(cachePath, "utf-8");
      return new NextResponse(cached, { status: 200, headers: PLAIN_HEADERS });
    }
  } catch {
    // Cache miss — generate fresh
  }

  // Generate, save, serve
  try {
    const content = await generateLlmsTxt(domain);
    await saveLlmsTxt(domain, content);
    return new NextResponse(content, { status: 200, headers: PLAIN_HEADERS });
  } catch (err: any) {
    return new NextResponse(`# Error\n\nCould not generate llms.txt: ${err.message}`, {
      status: 500,
      headers: PLAIN_HEADERS,
    });
  }
}
