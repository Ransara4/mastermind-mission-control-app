import { NextRequest, NextResponse } from "next/server";
import { parse } from "node-html-parser";
import { readFile, writeFile, mkdir, stat } from "fs/promises";
import { join } from "path";
import type { SchemaTestResult } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const RICH_RESULT_TYPES = new Set([
  "FAQPage",
  "HowTo",
  "Recipe",
  "Article",
  "Product",
  "Review",
  "Event",
  "LocalBusiness",
  "Organization",
  "BreadcrumbList",
  "SiteNavigationElement",
  "JobPosting",
  "Course",
]);

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function validateSchema(schema: any): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!schema["@context"]) {
    issues.push('Missing @context (should be "https://schema.org")');
  }

  if (!schema["@type"]) {
    issues.push("Missing @type field");
    return { valid: false, issues };
  }

  const type = Array.isArray(schema["@type"]) ? schema["@type"][0] : schema["@type"];

  switch (type) {
    case "FAQPage": {
      if (!schema.mainEntity) {
        issues.push("FAQPage: missing mainEntity array");
      } else if (!Array.isArray(schema.mainEntity)) {
        issues.push("FAQPage: mainEntity must be an array");
      } else {
        for (let i = 0; i < schema.mainEntity.length; i++) {
          const q = schema.mainEntity[i];
          if (!q.name) issues.push(`FAQPage: question[${i}] missing name`);
          if (!q.acceptedAnswer) {
            issues.push(`FAQPage: question[${i}] missing acceptedAnswer`);
          } else if (!q.acceptedAnswer.text) {
            issues.push(`FAQPage: question[${i}].acceptedAnswer missing text`);
          }
        }
      }
      break;
    }
    case "Organization": {
      if (!schema.name) issues.push("Organization: missing name");
      if (!schema.url) issues.push("Organization: missing url");
      break;
    }
    case "LocalBusiness": {
      if (!schema.name) issues.push("LocalBusiness: missing name");
      if (!schema.address) issues.push("LocalBusiness: missing address");
      break;
    }
    case "BreadcrumbList": {
      if (!schema.itemListElement || !Array.isArray(schema.itemListElement)) {
        issues.push("BreadcrumbList: missing itemListElement array");
      } else if (schema.itemListElement.length === 0) {
        issues.push("BreadcrumbList: itemListElement is empty");
      }
      break;
    }
    default: {
      // For other types: just check @type and @context are present (already done above)
      break;
    }
  }

  return { valid: issues.length === 0, issues };
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

export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get("domain");
  const urlParam = request.nextUrl.searchParams.get("url");
  const refresh = request.nextUrl.searchParams.get("refresh") === "true";

  if (!domain) {
    return NextResponse.json(
      { error: "Missing required query param: domain" },
      { status: 400 }
    );
  }

  const siteDir = join(SEO_ROOT, domain);
  const cachePath = join(siteDir, "schema-test.json");

  // Check cache unless refresh requested
  if (!refresh && (await fileExists(cachePath))) {
    try {
      const cached: SchemaTestResult = JSON.parse(
        await readFile(cachePath, "utf-8")
      );
      const age = Date.now() - new Date(cached.testedAt).getTime();
      if (age < CACHE_MAX_AGE_MS) {
        return NextResponse.json(cached);
      }
    } catch {
      // Cache corrupted, proceed to fetch
    }
  }

  const targetUrl = urlParam || (domain.startsWith("http") ? domain : `https://${domain}/`);

  const html = await fetchPage(targetUrl);
  if (!html) {
    return NextResponse.json(
      { error: `Could not fetch page: ${targetUrl}` },
      { status: 502 }
    );
  }

  const root = parse(html);
  const jsonLdBlocks = root.querySelectorAll('script[type="application/ld+json"]');

  const schemasFound: SchemaTestResult["schemasFound"] = [];

  for (const block of jsonLdBlocks) {
    let parsed: any = null;
    let parseError = "";

    try {
      parsed = JSON.parse(block.text);
    } catch (err: any) {
      parseError = `JSON parse error: ${err.message}`;
    }

    if (!parsed) {
      schemasFound.push({
        type: "Unknown",
        valid: false,
        issues: [parseError || "Failed to parse JSON-LD block"],
        richResultEligible: false,
      });
      continue;
    }

    const type = Array.isArray(parsed["@type"])
      ? parsed["@type"][0] || "Unknown"
      : parsed["@type"] || "Unknown";

    const { valid, issues } = validateSchema(parsed);
    const richResultEligible = RICH_RESULT_TYPES.has(type) && valid;

    schemasFound.push({
      type,
      valid,
      issues,
      richResultEligible,
    });
  }

  const result: SchemaTestResult = {
    url: targetUrl,
    schemasFound,
    totalSchemas: schemasFound.length,
    hasErrors: schemasFound.some((s) => !s.valid),
    testedAt: new Date().toISOString(),
  };

  // Ensure directory exists and cache result
  if (!(await fileExists(siteDir))) {
    await mkdir(siteDir, { recursive: true });
  }
  await writeFile(cachePath, JSON.stringify(result, null, 2));

  return NextResponse.json(result);
}
