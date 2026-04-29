import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateLlmsTxt, saveLlmsTxt } from "@/lib/seo-llms";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");

interface SiteEntry {
  domain: string;
}

async function loadAllDomains(): Promise<string[]> {
  // Try websites.db first
  const dbSites = getWebsitesForSeo();
  if (dbSites.length > 0) return dbSites.map((s: any) => s.domain).filter(Boolean);
  // Fall back to sites.json
  try {
    const raw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
    const sites: SiteEntry[] = JSON.parse(raw).sites || [];
    return sites.map((s) => s.domain).filter(Boolean);
  } catch {
    return [];
  }
}

export async function POST(request: NextRequest) {
  let targetDomains: string[] = [];

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.domain && typeof body.domain === "string") {
      targetDomains = [body.domain.toLowerCase()];
    } else {
      targetDomains = await loadAllDomains();
    }
  } catch {
    targetDomains = await loadAllDomains();
  }

  if (targetDomains.length === 0) {
    return NextResponse.json({ error: "No domains configured in ~/seo/sites.json" }, { status: 400 });
  }

  const generated: string[] = [];
  const errors: Record<string, string> = {};

  await Promise.all(
    targetDomains.map(async (domain) => {
      try {
        const content = await generateLlmsTxt(domain);
        await saveLlmsTxt(domain, content);
        generated.push(domain);
      } catch (err: any) {
        errors[domain] = err.message || "Unknown error";
      }
    })
  );

  return NextResponse.json({ generated, errors });
}
