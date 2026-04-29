import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const MC_BASE_URL = "https://mc.openclaw.io";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

interface SiteEntry {
  domain: string;
  name: string;
  hosting?: string;
}

async function loadSites(): Promise<SiteEntry[]> {
  // Try websites.db first
  const dbSites = getWebsitesForSeo();
  if (dbSites.length > 0) return dbSites as unknown as SiteEntry[];
  // Fall back to sites.json
  try {
    const raw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
    const data = JSON.parse(raw);
    return (data.sites || []) as SiteEntry[];
  } catch {
    return [];
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  const sites = await loadSites();

  const result = {
    sites: sites.map((s) => ({
      domain: s.domain,
      nlweb: `${MC_BASE_URL}/api/seo/nlweb/${s.domain}`,
      name: s.name || s.domain,
    })),
  };

  return NextResponse.json(result, { headers: CORS_HEADERS });
}
