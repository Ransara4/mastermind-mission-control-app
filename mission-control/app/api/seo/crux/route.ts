import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { CruxResult, CruxMetric } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CRUX_API = "https://chromeuxreport.googleapis.com/v1/records:queryRecord";
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function parseCruxMetric(raw: any): CruxMetric | undefined {
  if (!raw) return undefined;
  return {
    p75: raw.percentiles?.p75 ?? 0,
    histogram: (raw.histogram || []).map((bin: any) => ({
      start: bin.start,
      ...(bin.end !== undefined ? { end: bin.end } : {}),
      density: bin.density,
    })),
  };
}

function parseDateObj(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

function buildCruxResult(domain: string, record: any, dataSource: "url" | "origin"): CruxResult {
  const metrics = record.metrics || {};
  const cp = record.collectionPeriod;
  return {
    url: domain,
    dataSource,
    lcp: parseCruxMetric(metrics.largest_contentful_paint),
    inp: parseCruxMetric(metrics.interaction_to_next_paint),
    cls: parseCruxMetric(metrics.cumulative_layout_shift),
    fcp: parseCruxMetric(metrics.first_contentful_paint),
    ttfb: parseCruxMetric(metrics.experimental_time_to_first_byte),
    collectionPeriod: cp
      ? { firstDate: parseDateObj(cp.firstDate), lastDate: parseDateObj(cp.lastDate) }
      : undefined,
    fetchedAt: new Date().toISOString(),
  };
}

async function queryCrux(
  payload: Record<string, unknown>,
  apiKey: string
): Promise<{ record: any } | null> {
  const url = apiKey ? `${CRUX_API}?key=${apiKey}` : CRUX_API;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CrUX API returned ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/i.test(domain)) {
    return NextResponse.json(
      { error: "Missing or invalid domain" },
      { status: 400 }
    );
  }

  const siteDir = join(SEO_ROOT, domain);
  const cachePath = join(siteDir, "crux-latest.json");

  // Return cache if fresh
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: CruxResult = JSON.parse(await readFile(cachePath, "utf-8"));
      const age = Date.now() - new Date(cached.fetchedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached);
      }
    } catch {
      // Cache corrupted, proceed to fetch
    }
  }

  const apiKey =
    process.env.CRUX_API_KEY ||
    process.env.PAGESPEED_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    "";

  const metrics = [
    "largest_contentful_paint",
    "interaction_to_next_paint",
    "cumulative_layout_shift",
    "first_contentful_paint",
    "experimental_time_to_first_byte",
  ];

  try {
    // Try URL-level first
    const urlData = await queryCrux(
      { url: `https://${domain}/`, metrics },
      apiKey
    );

    let resolvedData: { record: any } | null = urlData;
    let resolvedSource: "url" | "origin" = "url";

    if (!urlData) {
      // Fall back to origin-level
      const originData = await queryCrux(
        { origin: `https://${domain}`, metrics },
        apiKey
      );
      if (originData) {
        resolvedData = originData;
        resolvedSource = "origin";
      } else {
        resolvedData = null;
      }
    }

    if (!resolvedData) {
      const notFound: CruxResult = {
        url: domain,
        dataSource: "not_found",
        fetchedAt: new Date().toISOString(),
      };
      // Cache the not_found result too
      if (!(await fileExists(siteDir))) {
        await mkdir(siteDir, { recursive: true });
      }
      await writeFile(cachePath, JSON.stringify(notFound, null, 2));
      return NextResponse.json(notFound);
    }

    const result = buildCruxResult(domain, resolvedData.record, resolvedSource);

    if (!(await fileExists(siteDir))) {
      await mkdir(siteDir, { recursive: true });
    }
    await writeFile(cachePath, JSON.stringify(result, null, 2));

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("CrUX fetch error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch CrUX data" },
      { status: 502 }
    );
  }
}
