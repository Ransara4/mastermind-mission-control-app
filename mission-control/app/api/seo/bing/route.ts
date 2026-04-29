import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { BingStats, BingQueryStat, BingPageStat } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const BING_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseBingDate(d: string): string {
  const ms = parseInt(d.replace(/\/Date\((-?\d+)[^)]*\)\//, "$1"));
  return new Date(ms).toISOString().split("T")[0];
}

async function bingGet(endpoint: string, apiKey: string): Promise<any> {
  const res = await fetch(`${BING_BASE}/${endpoint}&apikey=${apiKey}`, {
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Bing API ${endpoint.split("?")[0]} returned ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchQuota(siteUrl: string, apiKey: string): Promise<{ daily: number; monthly: number } | undefined> {
  try {
    const data = await bingGet(`GetUrlSubmissionQuota?siteUrl=${encodeURIComponent(siteUrl)}`, apiKey);
    return {
      daily: data.d?.DailyQuota ?? 0,
      monthly: data.d?.MonthlyQuota ?? 0,
    };
  } catch {
    return undefined;
  }
}

// ─── GET Handler ─────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const action = request.nextUrl.searchParams.get("action") || "stats";

  if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
    return NextResponse.json(
      { error: "Missing or invalid domain" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const apiKey = process.env.BING_WEBMASTER_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "BING_WEBMASTER_API_KEY not configured", configured: false },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  const siteUrl = `https://${domain}/`;
  const encodedUrl = encodeURIComponent(siteUrl);

  if (action === "quota") {
    const quota = await fetchQuota(siteUrl, apiKey);
    return NextResponse.json({ quota }, { headers: CORS_HEADERS });
  }

  // action === "stats" (default)
  const siteDir = join(SEO_ROOT, domain);
  const cachePath = join(siteDir, "bing-stats.json");

  // Return cache if fresh
  if (await fileExists(cachePath)) {
    try {
      const cached: BingStats = JSON.parse(await readFile(cachePath, "utf-8"));
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached, { headers: CORS_HEADERS });
      }
    } catch {
      // Cache corrupted, proceed to fetch
    }
  }

  try {
    const [queryData, pageData, trafficData, quota] = await Promise.all([
      bingGet(`GetQueryStats?siteUrl=${encodedUrl}`, apiKey).catch(() => null),
      bingGet(`GetPageStats?siteUrl=${encodedUrl}`, apiKey).catch(() => null),
      bingGet(`GetRankAndTrafficStats?siteUrl=${encodedUrl}`, apiKey).catch(() => null),
      fetchQuota(siteUrl, apiKey),
    ]);

    const queryStats: BingQueryStat[] = (queryData?.d || []).map((item: any) => ({
      query: item.Query || "",
      clicks: item.Clicks ?? 0,
      impressions: item.Impressions ?? 0,
      avgClickPosition: item.AvgClickPosition ?? 0,
      avgImpressionPosition: item.AvgImpressionPosition ?? 0,
      date: item.Date ? parseBingDate(item.Date) : "",
    }));

    const pageStats: BingPageStat[] = (pageData?.d || []).map((item: any) => ({
      url: item.Query || "",
      clicks: item.Clicks ?? 0,
      impressions: item.Impressions ?? 0,
      avgClickPosition: item.AvgClickPosition ?? 0,
      avgImpressionPosition: item.AvgImpressionPosition ?? 0,
      date: item.Date ? parseBingDate(item.Date) : "",
    }));

    const dailyStats = (trafficData?.d || []).map((item: any) => ({
      date: item.Date ? parseBingDate(item.Date) : "",
      clicks: item.Clicks ?? 0,
      impressions: item.Impressions ?? 0,
    }));

    const result: BingStats = {
      domain,
      queryStats,
      pageStats,
      dailyStats,
      ...(quota ? { quota } : {}),
      fetchedAt: new Date().toISOString(),
    };

    if (!(await fileExists(siteDir))) {
      await mkdir(siteDir, { recursive: true });
    }
    await writeFile(cachePath, JSON.stringify(result, null, 2));

    return NextResponse.json(result, { headers: CORS_HEADERS });
  } catch (err: any) {
    console.error("Bing stats fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch Bing stats" },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}

// ─── POST Handler ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const apiKey = process.env.BING_WEBMASTER_API_KEY || "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "BING_WEBMASTER_API_KEY not configured", configured: false },
      { status: 200, headers: CORS_HEADERS }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400, headers: CORS_HEADERS });
  }

  const { domain, action, url, urlList } = body;

  if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
    return NextResponse.json(
      { error: "Missing or invalid domain" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const siteUrl = `https://${domain}/`;

  if (action === "submit-url") {
    if (!url) {
      return NextResponse.json({ error: "Missing url" }, { status: 400, headers: CORS_HEADERS });
    }
    try {
      const res = await fetch(`${BING_BASE}/SubmitUrl?apikey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, url }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `Bing SubmitUrl returned ${res.status}: ${errBody.slice(0, 200)}` },
          { status: 502, headers: CORS_HEADERS }
        );
      }
      return NextResponse.json({ submitted: 1, url }, { headers: CORS_HEADERS });
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Failed to submit URL" },
        { status: 502, headers: CORS_HEADERS }
      );
    }
  }

  if (action === "submit-batch") {
    if (!Array.isArray(urlList) || urlList.length === 0) {
      return NextResponse.json({ error: "Missing or empty urlList" }, { status: 400, headers: CORS_HEADERS });
    }

    // Check quota first
    const quota = await fetchQuota(siteUrl, apiKey);
    const remaining = quota?.daily ?? 500;
    const batch = urlList.slice(0, Math.min(500, remaining));

    if (batch.length === 0) {
      return NextResponse.json({ submitted: 0, remaining: 0, error: "Daily quota exhausted" }, { headers: CORS_HEADERS });
    }

    try {
      const res = await fetch(`${BING_BASE}/SubmitUrlBatch?apikey=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteUrl, urlList: batch }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "");
        return NextResponse.json(
          { error: `Bing SubmitUrlBatch returned ${res.status}: ${errBody.slice(0, 200)}` },
          { status: 502, headers: CORS_HEADERS }
        );
      }
      return NextResponse.json(
        { submitted: batch.length, remaining: remaining - batch.length },
        { headers: CORS_HEADERS }
      );
    } catch (err: any) {
      return NextResponse.json(
        { error: err.message || "Failed to submit URL batch" },
        { status: 502, headers: CORS_HEADERS }
      );
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers: CORS_HEADERS });
}

// ─── OPTIONS preflight ───────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
