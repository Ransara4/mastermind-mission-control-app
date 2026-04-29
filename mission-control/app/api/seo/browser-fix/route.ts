import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { parse } from "node-html-parser";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const WIX_API_TOKEN = process.env.WIX_API_TOKEN || "";
const WIX_ACCOUNT_ID = process.env.WIX_ACCOUNT_ID || "";

async function getSiteId(domain: string): Promise<string> {
  // Try websites.db first
  const dbSites = getWebsitesForSeo();
  const dbEntry = dbSites.find((s: any) => s.domain === domain);
  if (dbEntry?.wixSiteId) return dbEntry.wixSiteId;
  // Fall back to sites.json
  try {
    const raw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
    const sites: any[] = JSON.parse(raw).sites || [];
    const site = sites.find((s: any) => s.domain === domain);
    return site?.wixSiteId || "";
  } catch {
    return "";
  }
}

interface BrowserFixResult {
  tier: "browser";
  status: "fixed" | "failed" | "skipped";
  message: string;
  details?: string;
}

// Schema type detection from issue message
function detectSchemaType(message: string): string | null {
  const msg = message.toLowerCase();
  if (msg.includes("organization") || msg.includes("org schema")) return "Organization";
  if (msg.includes("localbusiness") || msg.includes("local business")) return "LocalBusiness";
  if (msg.includes("faqpage") || msg.includes("faq")) return "FAQPage";
  if (msg.includes("breadcrumb")) return "BreadcrumbList";
  if (msg.includes("schema") || msg.includes("structured data") || msg.includes("json-ld")) return "Organization";
  return null;
}

// Read profile data for a domain
async function readProfile(domain: string): Promise<Record<string, string>> {
  try {
    const raw = await readFile(join(SEO_ROOT, domain, "profile.md"), "utf-8");
    const profile: Record<string, string> = {};
    for (const line of raw.split("\n")) {
      const match = line.match(/^[-*]\s*\*?\*?(\w[\w\s]*?)\*?\*?\s*[:=]\s*(.+)/);
      if (match) {
        profile[match[1].trim().toLowerCase()] = match[2].trim();
      }
    }
    return profile;
  } catch {
    return {};
  }
}

// Generate JSON-LD for a given schema type
function generateJsonLd(
  schemaType: string,
  domain: string,
  profile: Record<string, string>
): string {
  const siteName = profile["name"] || profile["site name"] || domain;
  const description = profile["description"] || profile["tagline"] || "";
  const url = `https://${domain}`;

  switch (schemaType) {
    case "Organization":
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: siteName,
          url,
          description,
          logo: profile["logo"] || `${url}/favicon.ico`,
          sameAs: [
            profile["instagram"],
            profile["linkedin"],
            profile["twitter"],
            profile["facebook"],
          ].filter(Boolean),
        },
        null,
        2
      );

    case "LocalBusiness":
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: siteName,
          url,
          description,
          address: {
            "@type": "PostalAddress",
            addressLocality: profile["city"] || "",
            addressCountry: profile["country"] || "",
          },
        },
        null,
        2
      );

    case "FAQPage":
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: `What is ${siteName}?`,
              acceptedAnswer: {
                "@type": "Answer",
                text: description || `${siteName} is a platform at ${url}.`,
              },
            },
          ],
        },
        null,
        2
      );

    case "BreadcrumbList":
      return JSON.stringify(
        {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: "Home",
              item: url,
            },
          ],
        },
        null,
        2
      );

    default:
      return "";
  }
}

// POST custom code to Wix
async function wixPostCustomCode(
  siteId: string,
  displayName: string,
  code: string
): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch("https://www.wixapis.com/marketing/v1/custom-codes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WIX_API_TOKEN}`,
      "wix-account-id": WIX_ACCOUNT_ID,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customCode: {
        displayName,
        code,
        pages: { allPages: {} },
        position: "HEAD",
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

// GET existing custom codes
async function wixGetCustomCodes(
  siteId: string
): Promise<{ ok: boolean; codes: any[] }> {
  try {
    const res = await fetch("https://www.wixapis.com/marketing/v1/custom-codes", {
      headers: {
        Authorization: `Bearer ${WIX_API_TOKEN}`,
        "wix-account-id": WIX_ACCOUNT_ID,
        "wix-site-id": siteId,
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { ok: false, codes: [] };
    const data = await res.json();
    return { ok: true, codes: data.customCodes || [] };
  } catch {
    return { ok: false, codes: [] };
  }
}

// ── H1 detection and fix ──────────────────────────────────────

async function fetchPageHtml(domain: string): Promise<string> {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenClawSEO/1.0)" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      // retry with www.
      if (!url.includes("://www.")) {
        const r2 = await fetch(url.replace("://", "://www."), {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenClawSEO/1.0)" },
          redirect: "follow",
          signal: AbortSignal.timeout(15000),
        });
        return await r2.text();
      }
    }
    return await res.text();
  } catch {
    return "";
  }
}

interface H1Candidate {
  compId: string;
  text: string;
  tag: string;
  className: string;
  score: number;
}

function detectH1Candidate(html: string, domain: string): H1Candidate | null {
  const root = parse(html);

  // Pass 1: if real H1 already exists, no fix needed
  const existingH1 = root.querySelector("h1");
  if (existingH1 && existingH1.text.trim().length > 0) return null;

  // Wix font classes — body classes to skip
  const bodyFontClasses = ["font_5", "font_6", "font_7", "font_8", "font_9"];

  const candidates: H1Candidate[] = [];
  let domIndex = 0;
  const totalElements = root.querySelectorAll("*").length;

  // Find all Wix text components
  const comps = root.querySelectorAll("[data-comp-id]");
  for (const comp of comps) {
    const compId = comp.getAttribute("data-comp-id") || "";
    if (!compId) continue;

    // Look for text elements inside the component
    const textEls = comp.querySelectorAll("p, span, div");
    for (const el of textEls) {
      const tag = el.tagName?.toLowerCase() || "";
      if (tag === "h1") return null; // H1 exists, stop

      const className = el.getAttribute("class") || "";
      const text = el.text?.trim() || "";
      if (!text || text.length < 3 || text.length > 200) continue;

      // Skip nav/footer/header context
      if (comp.closest("nav") || comp.closest("footer") || comp.closest("header")) continue;

      let score = 0;

      // Font class scoring
      if (className.includes("font_0") || className.includes("font_1")) score += 4;
      else if (className.includes("font_2") || className.includes("font_3")) score += 3;
      else if (className.includes("font_4")) score += 1;
      else if (bodyFontClasses.some((c) => className.includes(c))) continue; // skip body text

      // Wix rich text element check
      if (className.includes("wixui-rich-text__text") || comp.getAttribute("data-testid") === "richTextElement") score += 1;

      // Position in DOM (earlier = better)
      const positionRatio = domIndex / Math.max(totalElements, 1);
      if (positionRatio < 0.15) score += 2;
      else if (positionRatio < 0.30) score += 1;

      // Title-like length
      if (text.length >= 5 && text.length <= 80) score += 2;

      // Not all lowercase
      if (text !== text.toLowerCase()) score += 1;

      // Not a button or link
      if (el.closest("a") || el.closest("button")) continue;

      // Contains domain name / business name hint
      const domainBase = domain.replace(/^www\./, "").split(".")[0].toLowerCase();
      if (text.toLowerCase().includes(domainBase)) score += 1;

      if (score >= 3) {
        candidates.push({ compId, text, tag, className, score });
      }

      domIndex++;
    }
  }

  if (candidates.length === 0) return null;

  // Return highest-scoring candidate
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0];
}

function buildH1InjectionScript(candidate: H1Candidate): string {
  const escapedCompId = candidate.compId.replace(/['"\\]/g, "\\$&");
  // Sanitize className - only allow alphanumeric, hyphens, underscores, spaces, dots
  const safeClass = candidate.className.replace(/[^a-zA-Z0-9\s\-_]/g, "");
  const firstClass = safeClass.split(" ")[0];
  return `/* SEO H1 Fix — OpenClaw */
(function() {
  try {
    var comp = document.querySelector('[data-comp-id="${escapedCompId}"]');
    if (!comp) return;
    var el = comp.querySelector('p.${firstClass}, p, span.wixui-rich-text__text');
    if (!el || el.tagName === 'H1') return;
    var h1 = document.createElement('h1');
    h1.className = el.className;
    var s = el.getAttribute('style');
    if (s) h1.setAttribute('style', s);
    h1.innerHTML = el.innerHTML;
    el.parentNode.replaceChild(h1, el);
  } catch(e) {}
})();`;
}

async function fixH1(domain: string, siteId: string): Promise<BrowserFixResult> {
  const html = await fetchPageHtml(domain);
  if (!html) {
    return { tier: "browser", status: "failed", message: "Could not fetch page HTML for H1 detection" };
  }

  // Check for existing H1 first
  const root = parse(html);
  const existingH1 = root.querySelector("h1");
  if (existingH1 && existingH1.text.trim()) {
    return { tier: "browser", status: "fixed", message: "H1 already present on page — likely a false positive from SSR rendering" };
  }

  const candidate = detectH1Candidate(html, domain);
  if (!candidate) {
    return {
      tier: "browser",
      status: "skipped",
      message: "Could not identify H1 candidate — manual fix required",
      details: `Open Wix Editor → click the main page title text → Format toolbar → change to "Heading 1"`,
    };
  }

  const script = buildH1InjectionScript(candidate);
  const displayName = "SEO: H1 Fix";

  // Check for existing H1 fix custom code
  const existing = await wixGetCustomCodes(siteId);
  if (existing.ok) {
    const duplicate = existing.codes.find((c: any) => c.displayName === displayName);
    if (duplicate) {
      return {
        tier: "browser",
        status: "fixed",
        message: `H1 fix already injected for: "${candidate.text}"`,
        details: `Component: ${candidate.compId}`,
      };
    }
  }

  const result = await wixPostCustomCode(siteId, displayName, `<script>${script}</script>`);

  if (result.ok) {
    return {
      tier: "browser",
      status: "fixed",
      message: `H1 injected for: "${candidate.text.slice(0, 60)}"`,
      details: `Component: ${candidate.compId} (score: ${candidate.score})\nLong-term fix: open Wix Editor → click this element → set to Heading 1`,
    };
  }

  const dashboardUrl = `https://manage.wix.com/dashboard/${siteId}/settings`;
  return {
    tier: "browser",
    status: "skipped",
    message: `Custom Code API unavailable — H1 candidate identified, manual injection needed`,
    details: `Candidate: "${candidate.text}" (comp-id: ${candidate.compId})\n\n1. Open: ${dashboardUrl}\n2. Settings → Custom Code → Add Code → Body End\n3. Paste:\n\n<script>\n${script}\n</script>`,
  };
}

export async function POST(request: NextRequest): Promise<NextResponse<BrowserFixResult>> {
  try {
    const body = await request.json();
    const { domain, issue, siteId: overrideSiteId } = body;

    if (!domain || !issue) {
      return NextResponse.json({
        tier: "browser",
        status: "failed",
        message: "Missing domain or issue in request body",
      });
    }

    if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
      return NextResponse.json({ tier: "browser", status: "failed", message: "Invalid domain format" }, { status: 400 });
    }

    const siteId = overrideSiteId || await getSiteId(domain);
    if (!siteId) {
      return NextResponse.json({
        tier: "browser",
        status: "skipped",
        message: `No Wix site ID found for ${domain}`,
      });
    }

    if (!WIX_API_TOKEN) {
      return NextResponse.json({
        tier: "browser",
        status: "skipped",
        message: "WIX_API_TOKEN not configured",
      });
    }

    // H1 missing/no H1 → run H1 detection + injection
    const issueMsg = (issue.message || "").toLowerCase();
    if (issueMsg.includes("no h1") || issueMsg.includes("missing h1") || issueMsg.includes("h1 missing") || (issueMsg.includes("h1") && (issueMsg.includes("missing") || issueMsg.includes("no ") || issueMsg.includes("lack")))) {
      const h1Result = await fixH1(domain, siteId);
      return NextResponse.json(h1Result);
    }

    // Determine schema type from issue message
    const schemaType = detectSchemaType(issue.message || "");
    if (!schemaType) {
      return NextResponse.json({
        tier: "browser",
        status: "skipped",
        message: "Browser tier cannot handle this issue type",
      });
    }

    // Read profile data for richer schema
    const profile = await readProfile(domain);

    // Generate the JSON-LD
    const jsonLd = generateJsonLd(schemaType, domain, profile);
    if (!jsonLd) {
      return NextResponse.json({
        tier: "browser",
        status: "failed",
        message: `Failed to generate JSON-LD for ${schemaType}`,
      });
    }

    const scriptTag = `<script type="application/ld+json">\n${jsonLd}\n</script>`;
    const displayName = `SEO: ${schemaType} Schema`;

    // Check for existing custom code with same name to avoid duplicates
    const existing = await wixGetCustomCodes(siteId);
    if (existing.ok) {
      const duplicate = existing.codes.find(
        (c: any) => c.displayName === displayName
      );
      if (duplicate) {
        return NextResponse.json({
          tier: "browser",
          status: "fixed",
          message: `${schemaType} schema already exists in Wix Custom Code`,
          details: `Existing code ID: ${duplicate.id}`,
        });
      }
    }

    // POST the custom code
    const result = await wixPostCustomCode(siteId, displayName, scriptTag);

    if (result.ok) {
      return NextResponse.json({
        tier: "browser",
        status: "fixed",
        message: `${schemaType} schema injected via Wix Custom Code API`,
        details: `Code ID: ${result.data?.customCode?.id || "unknown"}`,
      });
    }

    // Wix Custom Code API not available with current token (typically returns 404).
    // Escalate to human with the generated JSON-LD ready to copy-paste.
    const dashboardUrl = `https://manage.wix.com/dashboard/${siteId}/settings`;
    return NextResponse.json({
      tier: "browser",
      status: "skipped",
      message: `Wix Custom Code API unavailable (${result.status}) — schema ready to inject manually`,
      details: `1. Open: ${dashboardUrl}\n2. Go to Settings → Custom Code → Add Code → Head\n3. Paste this code:\n\n${scriptTag}`,
    });
  } catch (err: any) {
    return NextResponse.json({
      tier: "browser",
      status: "failed",
      message: err.message || "Unknown error in browser-fix",
    });
  }
}
