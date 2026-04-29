import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const GSC_DIR = join(HOME, "seo");
const GSC_TOOLS = join(WS, "agents/seo-monitor/src/gsc-tools.js");

function runGscTool(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      "node",
      [GSC_TOOLS, ...args],
      { cwd: join(WS, "agents/seo-monitor"), timeout: 30000 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve({ stdout, stderr });
      }
    );
  });
}

async function readJson(path: string) {
  try {
    const content = await readFile(path, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  if (!domain) {
    return NextResponse.json({ error: "domain parameter required" }, { status: 400 });
  }
  const gscDir = join(GSC_DIR, domain, "gsc");

  const [dailyMetrics, topQueries, topPages, healthCheck, lastFetched] =
    await Promise.all([
      readJson(join(gscDir, "daily-metrics.json")),
      readJson(join(gscDir, "top-queries.json")),
      readJson(join(gscDir, "top-pages.json")),
      readJson(join(gscDir, "health-check.json")),
      readJson(join(gscDir, "last-fetched.json")),
    ]);

  const metrics = dailyMetrics || [];
  const hasData = metrics.length > 0;

  let summary = null;
  if (hasData) {
    const totalClicks = metrics.reduce((s: number, d: any) => s + d.clicks, 0);
    const totalImpressions = metrics.reduce((s: number, d: any) => s + d.impressions, 0);
    const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;
    const avgPosition = metrics.reduce((s: number, d: any) => s + d.position, 0) / metrics.length;

    const recent7 = metrics.slice(-7);
    const prev7 = metrics.slice(-14, -7);
    const recentClicks = recent7.reduce((s: number, d: any) => s + d.clicks, 0);
    const prevClicks = prev7.length > 0 ? prev7.reduce((s: number, d: any) => s + d.clicks, 0) : 0;
    const recentImpressions = recent7.reduce((s: number, d: any) => s + d.impressions, 0);
    const prevImpressions = prev7.length > 0 ? prev7.reduce((s: number, d: any) => s + d.impressions, 0) : 0;

    summary = {
      totalClicks,
      totalImpressions,
      avgCtr: Math.round(avgCtr * 10000) / 100,
      avgPosition: Math.round(avgPosition * 100) / 100,
      clicksTrend: prevClicks > 0 ? Math.round(((recentClicks - prevClicks) / prevClicks) * 100) : 0,
      impressionsTrend: prevImpressions > 0 ? Math.round(((recentImpressions - prevImpressions) / prevImpressions) * 100) : 0,
    };
  }

  return NextResponse.json({
    domain,
    hasData,
    summary,
    lastFetched: lastFetched || null,
    dateRange: lastFetched?.dateRange || null,
    dailyMetrics: metrics,
    topQueries: topQueries || [],
    topPages: topPages || [],
    healthCheck: healthCheck || null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, url, site } = body;
    const siteArgs = site ? ["--site=" + site] : [];

    switch (action) {
      case "submit-sitemap": {
        if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
        const result = await runGscTool(["submit-sitemap", url, ...siteArgs]);
        return NextResponse.json({ success: true, output: result.stdout });
      }
      case "list-sitemaps": {
        const result = await runGscTool(["list-sitemaps", ...siteArgs]);
        return NextResponse.json({ success: true, output: result.stdout });
      }
      case "inspect-url": {
        if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
        const result = await runGscTool(["inspect-url", url, ...siteArgs]);
        return NextResponse.json({ success: true, output: result.stdout });
      }
      case "request-indexing": {
        if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
        const result = await runGscTool(["request-indexing", url]);
        return NextResponse.json({ success: true, output: result.stdout });
      }
      case "list-sites": {
        const result = await runGscTool(["list-sites"]);
        return NextResponse.json({ success: true, output: result.stdout });
      }
      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid: submit-sitemap, list-sitemaps, inspect-url, request-indexing, list-sites` },
          { status: 400 }
        );
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
