import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const PAGESPEED_API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const CACHE_MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

interface VitalsMetrics {
  score: number;
  lcp: number;
  fid: number;
  cls: number;
  fcp: number;
  ttfb: number;
}

interface PageSpeedResult {
  url: string;
  mobile: VitalsMetrics;
  desktop: VitalsMetrics;
  fetchedAt: string;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function extractMetrics(lighthouseResult: any): VitalsMetrics {
  const categories = lighthouseResult?.categories || {};
  const audits = lighthouseResult?.audits || {};

  const perfScore = categories?.performance?.score ?? 0;

  return {
    score: Math.round(perfScore * 100),
    lcp: audits["largest-contentful-paint"]?.numericValue ?? 0,
    fid: audits["max-potential-fid"]?.numericValue ?? 0,
    cls: audits["cumulative-layout-shift"]?.numericValue ?? 0,
    fcp: audits["first-contentful-paint"]?.numericValue ?? 0,
    ttfb: audits["server-response-time"]?.numericValue ?? 0,
  };
}

async function fetchPageSpeed(
  url: string,
  strategy: "mobile" | "desktop"
): Promise<VitalsMetrics> {
  const apiKey =
    process.env.PAGESPEED_API_KEY || process.env.GOOGLE_API_KEY || "";

  const params = new URLSearchParams({
    url,
    strategy,
    category: "performance",
  });
  if (apiKey) {
    params.set("key", apiKey);
  }

  const response = await fetch(`${PAGESPEED_API}?${params.toString()}`, {
    signal: AbortSignal.timeout(120_000),
  });

  if (response.status === 429) {
    throw Object.assign(new Error("rate_limited"), { rateLimited: true });
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `PageSpeed API returned ${response.status}: ${body.slice(0, 300)}`
    );
  }

  const data = await response.json();
  return extractMetrics(data.lighthouseResult);
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
  const cachePath = join(siteDir, "pagespeed-latest.json");

  // Check cache unless refresh requested
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: PageSpeedResult = JSON.parse(
        await readFile(cachePath, "utf-8")
      );
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached);
      }
    } catch {
      // Cache corrupted, proceed to fetch
    }
  }

  // Determine URL to test
  const url = domain.startsWith("http") ? domain : `https://${domain}`;

  try {
    const [mobile, desktop] = await Promise.all([
      fetchPageSpeed(url, "mobile"),
      fetchPageSpeed(url, "desktop"),
    ]);

    const result: PageSpeedResult = {
      url,
      mobile,
      desktop,
      fetchedAt: new Date().toISOString(),
    };

    // Ensure directory exists and cache result
    if (!(await fileExists(siteDir))) {
      await mkdir(siteDir, { recursive: true });
    }
    await writeFile(cachePath, JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (err: any) {
    // On rate limit, return cached data if available
    if (err?.rateLimited) {
      if (await fileExists(cachePath)) {
        try {
          const cached = JSON.parse(await readFile(cachePath, "utf-8"));
          return NextResponse.json({ ...cached, rateLimited: true, fromCache: true });
        } catch { /* cache corrupted, fall through */ }
      }
      return NextResponse.json({ rateLimited: true, fromCache: false, error: "Rate limited — no cached data available" }, { status: 429 });
    }

    console.error("PageSpeed fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch PageSpeed data" },
      { status: 502 }
    );
  }
}
