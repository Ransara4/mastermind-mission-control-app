import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { generateMetaDescription } from "@/lib/seo-ai";
import { generateLlmsTxt, saveLlmsTxt } from "@/lib/seo-llms";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");

interface SiteEntry {
  domain: string;
  name: string;
  hosting: string;
  wixSiteId: string;
  wixApiKey: string;
  wixAccountId: string;
  gscPropertyUrl: string;
  clientId: string;
}

async function loadSiteEntry(domain: string): Promise<SiteEntry | null> {
  // Try websites.db first
  const dbSites = getWebsitesForSeo();
  const dbEntry = dbSites.find((s: any) => s.domain === domain);
  if (dbEntry) return dbEntry as unknown as SiteEntry;
  // Fall back to sites.json
  try {
    const raw = await readFile(join(SEO_ROOT, "sites.json"), "utf-8");
    const sites: SiteEntry[] = JSON.parse(raw).sites || [];
    return sites.find((s) => s.domain === domain) || null;
  } catch {
    return null;
  }
}

function siteCredentials(entry: SiteEntry) {
  return {
    // Use per-site credentials if provided, otherwise fall back to .env (Joe's own sites)
    apiToken: entry.wixApiKey || process.env.WIX_API_TOKEN || "",
    accountId: entry.wixAccountId || process.env.WIX_ACCOUNT_ID || "",
  };
}

interface FixResult {
  issue: string;
  status: "fixed" | "manual" | "failed";
  message: string;
  details?: string;
  editorUrl?: string;
  steps?: string[];
}

// ── Retry helper for transient failures ──

async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  const retryDelays = [1000, 2000];
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isLastAttempt = attempt === maxAttempts;
      const isRetryable =
        !err.status ||
        err.status >= 500 ||
        err.code === "ECONNRESET" ||
        err.code === "ETIMEDOUT" ||
        err.code === "FETCH_ERROR" ||
        err.message?.includes("fetch failed");

      if (isLastAttempt || !isRetryable) {
        throw err;
      }

      await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt - 1]));
    }
  }
  throw new Error("withRetry: unreachable");
}

// ── Input validation helpers ──

function validateDescriptionInput(value: unknown): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof value !== "string") {
    return { valid: false, error: "Description must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length < 10) {
    return { valid: false, error: `Description too short (${trimmed.length} chars, minimum 10)` };
  }
  if (trimmed.length > 300) {
    return { valid: false, error: `Description too long (${trimmed.length} chars, maximum 300)` };
  }
  return { valid: true, value: trimmed };
}

function validateDisplayNameInput(value: unknown): { valid: true; value: string } | { valid: false; error: string } {
  if (typeof value !== "string") {
    return { valid: false, error: "Display name must be a string" };
  }
  const trimmed = value.trim();
  if (trimmed.length < 1) {
    return { valid: false, error: "Display name cannot be empty" };
  }
  if (trimmed.length > 100) {
    return { valid: false, error: `Display name too long (${trimmed.length} chars, maximum 100)` };
  }
  return { valid: true, value: trimmed };
}

// ── Wix REST API helpers ──

interface WixCreds { apiToken: string; accountId: string; }

async function wixGet(siteId: string, endpoint: string, creds: WixCreds) {
  const res = await fetch(`https://www.wixapis.com${endpoint}`, {
    headers: {
      Authorization: creds.apiToken.startsWith("Bearer ") ? creds.apiToken : `Bearer ${creds.apiToken}`,
      "wix-account-id": creds.accountId,
      "wix-site-id": siteId,
    },
    signal: AbortSignal.timeout(15000),
  });
  return res.json();
}

async function wixPatch(siteId: string, endpoint: string, fields: string[], properties: Record<string, any>, creds: WixCreds) {
  const res = await fetch(`https://www.wixapis.com${endpoint}`, {
    method: "PATCH",
    headers: {
      Authorization: creds.apiToken.startsWith("Bearer ") ? creds.apiToken : `Bearer ${creds.apiToken}`,
      "wix-account-id": creds.accountId,
      "wix-site-id": siteId,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fields: { paths: fields }, properties }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

// ── Fetch page HTML for analysis ──

async function fetchPageHtml(domain: string): Promise<string | null> {
  try {
    const url = domain.startsWith("http") ? domain : `https://${domain}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenClawSEO/1.0)" },
      signal: AbortSignal.timeout(15000),
    });
    return await res.text();
  } catch {
    return null;
  }
}

// ── Analyze page for specific issues ──

function findImagesWithoutAlt(html: string): { src: string; context: string }[] {
  const results: { src: string; context: string }[] = [];
  // Match <img> tags without alt or with empty alt
  const imgRegex = /<img\s[^>]*?>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const tag = match[0];
    const altMatch = tag.match(/alt\s*=\s*["']([^"']*)["']/i);
    if (!altMatch || altMatch[1].trim() === "") {
      const srcMatch = tag.match(/src\s*=\s*["']([^"']*)["']/i);
      const src = srcMatch ? srcMatch[1] : "unknown";
      // Get short context - filename from URL
      const filename = src.split("/").pop()?.split("?")[0] || src.slice(0, 60);
      results.push({ src: src.slice(0, 200), context: filename });
    }
  }
  return results;
}

function findH1Issues(html: string): { count: number; texts: string[] } {
  const h1Regex = /<h1[^>]*>([\s\S]*?)<\/h1>/gi;
  const texts: string[] = [];
  let match;
  while ((match = h1Regex.exec(html)) !== null) {
    const text = match[1].replace(/<[^>]*>/g, "").trim();
    if (text) texts.push(text.slice(0, 100));
  }
  return { count: texts.length, texts };
}

function findOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const ogRegex = /<meta\s+(?:property|name)\s*=\s*["'](og:[^"']+)["']\s+content\s*=\s*["']([^"']*)["']/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    tags[match[1]] = match[2];
  }
  // Also check reverse order (content before property)
  const ogRegex2 = /<meta\s+content\s*=\s*["']([^"']*)["']\s+(?:property|name)\s*=\s*["'](og:[^"']+)["']/gi;
  while ((match = ogRegex2.exec(html)) !== null) {
    tags[match[2]] = match[1];
  }
  return tags;
}

function getEditorUrl(siteId: string) {
  return `https://manage.wix.com/editor/${siteId}`;
}

// @ts-ignore: kept for future SEO fix actions
function getSeoUrl(siteId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/marketing-tools/seo`;
}

function getPageSeoUrl(siteId: string) {
  return `https://manage.wix.com/dashboard/${siteId}/marketing-tools/seo/pages`;
}

// ── Fix individual issues ──

async function fixIssue(
  issue: { severity: string; message: string },
  domain: string,
  siteId: string,
  html: string | null,
  siteProps: any,
  creds: WixCreds
): Promise<FixResult> {
  const msg = issue.message.toLowerCase();
  const editorUrl = getEditorUrl(siteId);
  const pageSeoUrl = getPageSeoUrl(siteId);

  // ── Missing/bad meta description → AI-GENERATE + AUTO-PUSH ──
  if (msg.includes("meta description") && (msg.includes("missing") || msg.includes("short") || msg.includes("long"))) {
    const currentDesc = siteProps?.properties?.description || "";
    const pageTitle = siteProps?.properties?.siteDisplayName || siteProps?.properties?.businessName || domain;

    const generated = await generateMetaDescription(domain, currentDesc, pageTitle);

    if (generated) {
      // Push directly to Wix API
      const pushResult = await updateSiteDescription(siteId, generated, creds);
      if (pushResult.status === "fixed") {
        return {
          issue: issue.message,
          status: "fixed",
          message: `Meta description auto-generated and pushed (${generated.length} chars)`,
          details: `"${generated}"${currentDesc ? `\n\nReplaced: "${currentDesc}"` : ""}`,
        };
      }
      // Push failed — return the generated text with manual steps
      return {
        issue: issue.message,
        status: "manual",
        message: `Generated description ready but API push failed. Copy and apply manually.`,
        details: `Generated (${generated.length} chars): "${generated}"`,
        editorUrl: pageSeoUrl,
        steps: [
          `Copy this description: "${generated}"`,
          "Open Wix Dashboard > Marketing & SEO > SEO Tools > Pages",
          "Paste into the site description field and save",
        ],
      };
    }

    // Claude unavailable — fall back to manual with current context
    return {
      issue: issue.message,
      status: "manual",
      message: currentDesc
        ? `Description is ${currentDesc.length} chars — should be 150-160. Edit and push via API.`
        : "No meta description set. Write one (150-160 chars) with your primary keyword and a CTA.",
      details: currentDesc ? `Current: "${currentDesc}"` : undefined,
      editorUrl: pageSeoUrl,
      steps: [
        "Write 150-160 chars including primary keyword and a call-to-action",
        "No em dashes. Active voice. Sound human, not like a press release.",
        "Open Wix Dashboard > Marketing & SEO > SEO Tools > Pages and paste it in",
      ],
    };
  }

  // ── Missing/bad title → Check if we can fix via siteDisplayName ──
  if (msg.includes("title") && (msg.includes("missing") || msg.includes("short") || msg.includes("long")) && !msg.includes("og:") && !msg.includes("open graph")) {
    const currentName = siteProps?.properties?.siteDisplayName || "";
    return {
      issue: issue.message,
      status: "manual",
      message: `Current site display name: "${currentName}". Page titles are set per-page in Wix SEO panel.`,
      details: `Site name: "${currentName}"`,
      editorUrl: pageSeoUrl,
      steps: [
        "Open Wix Dashboard > Marketing & SEO > SEO Tools > Pages",
        "Click on the page to edit its SEO title",
        "Aim for 50-60 characters with your primary keyword near the beginning",
        "Save and publish",
      ],
    };
  }

  // ── Images missing alt text → SMART DETECTION ──
  if (msg.includes("images") && msg.includes("alt")) {
    if (html) {
      const imagesWithoutAlt = findImagesWithoutAlt(html);
      if (imagesWithoutAlt.length > 0) {
        const imageList = imagesWithoutAlt.slice(0, 8).map((img, i) =>
          `${i + 1}. ${img.context}`
        );
        return {
          issue: issue.message,
          status: "manual",
          message: `Found ${imagesWithoutAlt.length} images without alt text. These need to be fixed in the Wix Editor.`,
          details: `Images missing alt text:\n${imageList.join("\n")}${imagesWithoutAlt.length > 8 ? `\n... and ${imagesWithoutAlt.length - 8} more` : ""}`,
          editorUrl,
          steps: [
            `Open the Wix Editor for ${domain}`,
            ...imagesWithoutAlt.slice(0, 5).map((img) =>
              `Find image "${img.context}" → click Settings gear → add descriptive alt text`
            ),
            imagesWithoutAlt.length > 5 ? `Fix remaining ${imagesWithoutAlt.length - 5} images the same way` : "",
            "Save and publish",
          ].filter(Boolean),
        };
      }
    }
    return {
      issue: issue.message,
      status: "manual",
      message: "Add alt text to images in the Wix Editor.",
      editorUrl,
      steps: [
        "Open the page in Wix Editor",
        "Click each image → Settings gear → add descriptive alt text",
        "Save and publish",
      ],
    };
  }

  // ── Open Graph tags → SMART DETECTION ──
  if (msg.includes("open graph") || (msg.includes("og:") && msg.includes("missing")) || (msg.includes("incomplete") && msg.includes("open graph"))) {
    if (html) {
      const ogTags = findOgTags(html);
      const missing: string[] = [];
      if (!ogTags["og:title"]) missing.push("og:title");
      if (!ogTags["og:description"]) missing.push("og:description");
      if (!ogTags["og:image"]) missing.push("og:image");
      if (!ogTags["og:url"]) missing.push("og:url");
      if (!ogTags["og:type"]) missing.push("og:type");

      const found = Object.entries(ogTags).map(([k, v]) => `${k}: "${v.slice(0, 60)}"`);

      return {
        issue: issue.message,
        status: "manual",
        message: `Missing OG tags: ${missing.join(", ")}. Wix generates these from page SEO settings.`,
        details: found.length > 0 ? `Found: ${found.join(", ")}` : "No OG tags found on page",
        editorUrl: pageSeoUrl,
        steps: [
          "Open Wix Dashboard > Marketing & SEO > SEO Tools > Pages",
          "Click on the page → Social Share tab",
          ...missing.map((tag) => {
            if (tag === "og:title") return "Set the Social Share title";
            if (tag === "og:description") return "Set the Social Share description";
            if (tag === "og:image") return "Upload a Social Share image (1200x630px)";
            return `Set ${tag}`;
          }),
          "Save and publish",
        ],
      };
    }
    return {
      issue: issue.message,
      status: "manual",
      message: "Set Open Graph tags in the Wix page SEO Social Share tab.",
      editorUrl: pageSeoUrl,
      steps: [
        "Open page SEO settings → Social Share tab",
        "Set title, description, and image (1200x630px)",
        "Save and publish",
      ],
    };
  }

  // ── Missing og:image ──
  if (msg.includes("og:image") && msg.includes("missing")) {
    return {
      issue: issue.message,
      status: "manual",
      message: "Upload a social share image for the page.",
      editorUrl: pageSeoUrl,
      steps: [
        "Open page SEO settings → Social Share tab",
        "Upload a 1200x630px image",
        "Save and publish",
      ],
    };
  }

  // ── H1 issues → SMART DETECTION ──
  if (msg.includes("h1") && (msg.includes("no h1") || msg.includes("multiple") || msg.includes("missing"))) {
    if (html) {
      const h1Info = findH1Issues(html);
      if (h1Info.count === 0) {
        return {
          issue: issue.message,
          status: "manual",
          message: "No H1 tag found on the page. Add one in the Wix Editor.",
          details: "The page has no H1 heading — search engines use H1 to understand the page topic.",
          editorUrl,
          steps: [
            "Open the page in Wix Editor",
            "Select your main heading text element",
            "Click the style dropdown → choose 'Heading 1'",
            "Make sure it contains your primary keyword",
            "Save and publish",
          ],
        };
      } else if (h1Info.count > 1) {
        return {
          issue: issue.message,
          status: "manual",
          message: `Found ${h1Info.count} H1 tags — should be exactly 1.`,
          details: `H1 tags found:\n${h1Info.texts.map((t, i) => `${i + 1}. "${t}"`).join("\n")}`,
          editorUrl,
          steps: [
            "Open the page in Wix Editor",
            `Keep "${h1Info.texts[0]}" as H1 (or choose the best one)`,
            ...h1Info.texts.slice(1).map((t) => `Change "${t}" from H1 to H2`),
            "Save and publish",
          ],
        };
      }
    }
    return {
      issue: issue.message,
      status: "manual",
      message: "Fix H1 heading in the Wix Editor.",
      editorUrl,
      steps: [
        "Open page in Wix Editor",
        "Ensure exactly one H1 with your primary keyword",
        "Save and publish",
      ],
    };
  }

  // ── Missing canonical URL ──
  if (msg.includes("canonical") && (msg.includes("no canonical") || msg.includes("missing"))) {
    const isWixSite = !!siteId;
    if (isWixSite) {
      return {
        issue: issue.message,
        status: "fixed",
        message: "Wix automatically sets canonical URLs. This is likely a false positive from SSR rendering. The live site should have canonicals.",
      };
    }
    return {
      issue: issue.message,
      status: "manual",
      message: "The page is missing a canonical URL tag. Add one to prevent duplicate content issues.",
      steps: [
        `Add <link rel="canonical" href="https://${domain}/"> to the <head> section`,
        "Ensure each page points to its own canonical URL",
        "Deploy and verify with a curl or browser check",
      ],
    };
  }

  // ── Missing viewport ──
  if (msg.includes("viewport") && msg.includes("missing")) {
    const isWixSite = !!siteId;
    if (isWixSite) {
      return {
        issue: issue.message,
        status: "fixed",
        message: "Wix automatically includes the viewport meta tag. This is a false positive from how the page was fetched.",
      };
    }
    return {
      issue: issue.message,
      status: "manual",
      message: "The page is missing a viewport meta tag, which is critical for mobile responsiveness.",
      steps: [
        'Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the <head> section',
        "Deploy and verify the page renders correctly on mobile",
      ],
    };
  }

  // ── Structured data / JSON-LD ──
  if (msg.includes("structured data") || msg.includes("json-ld")) {
    return {
      issue: issue.message,
      status: "manual",
      message: "Add structured data via Wix custom code injection.",
      editorUrl: `https://manage.wix.com/dashboard/${siteId}/settings`,
      steps: [
        "Open Wix Dashboard > Settings > Custom Code",
        "Click 'Add Code' > Head section",
        "Paste your JSON-LD structured data",
        "Choose which pages to apply it to",
        "Save and publish",
      ],
    };
  }

  // ── HTTPS ──
  if (msg.includes("https") && msg.includes("not using")) {
    return {
      issue: issue.message,
      status: "manual",
      message: "Enable SSL in Wix settings.",
      editorUrl: `https://manage.wix.com/dashboard/${siteId}/settings`,
      steps: [
        "Open Wix Dashboard > Settings > Site Address",
        "Enable SSL Certificate (free with Wix)",
        "Wait a few minutes for propagation",
      ],
    };
  }

  // ── llms.txt not generated ──
  if (msg.includes("llms.txt") || msg.includes("llms")) {
    try {
      const content = await generateLlmsTxt(domain);
      await saveLlmsTxt(domain, content);
      return {
        issue: issue.message,
        status: "fixed",
        message: "llms.txt generated and saved",
        details: `Served at /api/seo/llms-txt/${domain}. For Wix: add a URL redirect from /llms.txt → https://mc.openclaw.io/api/seo/llms-txt/${domain} once MC has a public URL.`,
      };
    } catch (err: any) {
      return {
        issue: issue.message,
        status: "failed",
        message: `Could not generate llms.txt: ${err.message}`,
      };
    }
  }

  // ── NLWeb not configured ──
  if (msg.includes("nlweb")) {
    return {
      issue: issue.message,
      status: "manual",
      message: "Add NLWeb discovery tag via Wix Custom Code",
      details: `Paste this into Wix Dashboard → Settings → Custom Code → Head:\n\n(function(){var l=document.createElement('link');l.rel='nlweb';l.href='https://mc.openclaw.io/api/seo/nlweb/${domain}';document.head.appendChild(l);})();`,
      steps: [
        "Open Wix Dashboard → Settings → Custom Code",
        "Click Add Code → Head section → All pages",
        `Paste: (function(){var l=document.createElement('link');l.rel='nlweb';l.href='https://mc.openclaw.io/api/seo/nlweb/${domain}';document.head.appendChild(l);})();`,
        "Save",
      ],
    };
  }

  // ── noindex ──
  if (msg.includes("noindex")) {
    return {
      issue: issue.message,
      status: "manual",
      message: "CRITICAL: Page is set to noindex! Remove this immediately.",
      editorUrl: pageSeoUrl,
      steps: [
        "Open page SEO settings",
        'Uncheck "Hide this page from search results"',
        "Save and publish immediately",
      ],
    };
  }

  // ── Fallback ──
  return {
    issue: issue.message,
    status: "manual",
    message: "This requires manual attention in the Wix Editor.",
    editorUrl,
    steps: [`Address: ${issue.message}`, "Save and publish when done"],
  };
}

// ── API to update site description directly ──
async function updateSiteDescription(siteId: string, newDescription: string, creds: WixCreds): Promise<FixResult> {
  try {
    const result = await withRetry(() =>
      wixPatch(siteId, "/site-properties/v4/properties", ["description"], {
        description: newDescription,
      }, creds)
    );
    if (result.ok) {
      return {
        issue: "Meta description update",
        status: "fixed",
        message: `Site description updated to: "${newDescription}" (${newDescription.length} chars)`,
        details: `New version: ${result.data?.version}`,
      };
    }
    return {
      issue: "Meta description update",
      status: "failed",
      message: `API error: ${JSON.stringify(result.data)}`,
    };
  } catch (err: any) {
    return {
      issue: "Meta description update",
      status: "failed",
      message: `Failed: ${err.message}`,
    };
  }
}

async function fixPageTitle(siteId: string, url: string, newTitle: string, creds: WixCreds): Promise<FixResult> {
  try {
    // Try GET pages list
    let pages: any[] = [];
    for (const endpoint of ["/pages/v1/pages", "/site-read/v1/pages"]) {
      try {
        const data = await wixGet(siteId, endpoint, creds);
        pages = data.pages || [];
        if (pages.length > 0) break;
      } catch {
        continue;
      }
    }

    if (pages.length === 0) {
      return {
        issue: "Page title fix",
        status: "failed",
        message: "Could not retrieve pages list from Wix API",
      };
    }

    // Find the matching page by URL path
    let targetUrl: string;
    try {
      targetUrl = new URL(url).pathname.replace(/\/$/, "") || "/";
    } catch {
      targetUrl = url.replace(/\/$/, "") || "/";
    }

    const page = pages.find((p: any) => {
      const pageUrl = (p.url || p.pagePath || "").replace(/\/$/, "") || "/";
      return pageUrl === targetUrl || pageUrl === url;
    });

    if (!page) {
      return {
        issue: "Page title fix",
        status: "failed",
        message: `Could not find page matching URL "${url}" among ${pages.length} pages`,
        details: `Available pages: ${pages.slice(0, 10).map((p: any) => p.url || p.pagePath || p.name).join(", ")}`,
      };
    }

    // PATCH the page SEO title
    const pageId = page.id;
    const patchRes = await fetch(
      `https://www.wixapis.com/pages/v1/pages/${pageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: creds.apiToken.startsWith("Bearer ") ? creds.apiToken : `Bearer ${creds.apiToken}`,
          "wix-account-id": creds.accountId,
          "wix-site-id": siteId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          page: {
            id: pageId,
            seoData: {
              tags: [
                {
                  type: "title",
                  children: newTitle,
                  custom: false,
                  disabled: false,
                },
              ],
            },
          },
        }),
        signal: AbortSignal.timeout(15000),
      }
    );

    const patchText = await patchRes.text();
    let patchData: any;
    try {
      patchData = JSON.parse(patchText);
    } catch {
      patchData = patchText;
    }

    if (patchRes.ok) {
      return {
        issue: "Page title fix",
        status: "fixed",
        message: `Page title updated to "${newTitle}" for ${url}`,
        details: `Page ID: ${pageId}`,
      };
    }

    return {
      issue: "Page title fix",
      status: "failed",
      message: `Wix API returned ${patchRes.status}: ${JSON.stringify(patchData)}`,
    };
  } catch (err: any) {
    return {
      issue: "Page title fix",
      status: "failed",
      message: `Failed: ${err.message}`,
    };
  }
}

async function updateSiteDisplayName(siteId: string, newName: string, creds: WixCreds): Promise<FixResult> {
  try {
    const result = await withRetry(() =>
      wixPatch(siteId, "/site-properties/v4/properties", ["siteDisplayName"], {
        siteDisplayName: newName,
      }, creds)
    );
    if (result.ok) {
      return {
        issue: "Site display name update",
        status: "fixed",
        message: `Site display name updated to: "${newName}"`,
        details: `New version: ${result.data?.version}`,
      };
    }
    return {
      issue: "Site display name update",
      status: "failed",
      message: `API error: ${JSON.stringify(result.data)}`,
    };
  } catch (err: any) {
    return {
      issue: "Site display name update",
      status: "failed",
      message: `Failed: ${err.message}`,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, issues, directAction } = body;

    if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Direct API actions (update description, update name)
    if (directAction) {
      const siteEntry = await loadSiteEntry(domain);
      const siteId = siteEntry?.wixSiteId || "";
      if (!siteId) {
        return NextResponse.json({ error: "Wix site ID not found. Add this site's credentials in the SEO dashboard." }, { status: 400 });
      }
      const creds = siteCredentials(siteEntry!);

      if (directAction.type === "updateDescription") {
        let descValue: string = directAction.value;

        // Sentinel: let Claude generate the description
        if (descValue === "__ai_generate__" || !descValue) {
          const siteProps = await wixGet(siteId, "/site-properties/v4/properties", creds).catch(() => null);
          const currentDesc = siteProps?.properties?.description || "";
          const pageTitle = siteProps?.properties?.siteDisplayName || siteProps?.properties?.businessName || domain;
          const generated = await generateMetaDescription(domain, currentDesc, pageTitle);
          if (!generated) {
            return NextResponse.json({ error: "Could not generate meta description — Claude unavailable" }, { status: 500 });
          }
          descValue = generated;
        }

        const validation = validateDescriptionInput(descValue);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        const result = await updateSiteDescription(siteId, validation.value, creds);
        return NextResponse.json({ success: true, results: [result] });
      }

      if (directAction.type === "updateSiteDisplayName") {
        const validation = validateDisplayNameInput(directAction.value);
        if (!validation.valid) {
          return NextResponse.json({ error: validation.error }, { status: 400 });
        }
        const result = await updateSiteDisplayName(siteId, validation.value, creds);
        return NextResponse.json({ success: true, results: [result] });
      }

      if (directAction.type === "fixPageTitle") {
        if (!directAction.url || !directAction.newTitle) {
          return NextResponse.json({ error: "fixPageTitle requires url and newTitle" }, { status: 400 });
        }
        const result = await fixPageTitle(siteId, directAction.url, directAction.newTitle, creds);
        return NextResponse.json({ success: true, results: [result] });
      }

      return NextResponse.json({ error: "Unknown direct action" }, { status: 400 });
    }

    // Issue-based fixes
    if (!issues || !Array.isArray(issues)) {
      return NextResponse.json({ error: "Missing issues" }, { status: 400 });
    }

    // Determine hosting
    const siteEntry = await loadSiteEntry(domain);
    const hosting = siteEntry?.hosting || "";

    if (hosting !== "wix") {
      return NextResponse.json({
        success: true,
        results: issues.map((issue: any) => ({
          issue: issue.message,
          status: "manual" as const,
          message: `No automated fix for ${hosting || "unknown"} hosting.`,
          steps: [issue.message],
        })),
      });
    }

    const siteId = siteEntry?.wixSiteId || "";
    if (!siteId) {
      return NextResponse.json({
        error: "Wix site ID not found. Open the SEO dashboard, select this site, and add its Wix credentials.",
      }, { status: 400 });
    }
    const creds = siteCredentials(siteEntry!);

    // Fetch page HTML and site properties in parallel for smart analysis
    const [html, siteProps] = await Promise.all([
      fetchPageHtml(domain),
      wixGet(siteId, "/site-properties/v4/properties", creds).catch(() => null),
    ]);

    const results: FixResult[] = [];
    for (const issue of issues) {
      const result = await fixIssue(issue, domain, siteId, html, siteProps, creds);
      results.push(result);
    }

    // Fire-and-forget IndexNow submission for successfully fixed URLs
    const fixedUrls = results
      .filter((r) => r.status === "fixed")
      .map(() => `https://${domain}/`); // homepage as fallback; ideally use page URL

    if (fixedUrls.length > 0) {
      fetch(`http://localhost:3000/api/seo/indexnow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, urls: [...new Set(fixedUrls)] }),
      }).catch(() => {}); // fire and forget

      // Fire-and-forget sitemap submission to Google + Bing
      fetch("http://localhost:3000/api/seo/submit-sitemap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, domain, hosting: "wix", results });
  } catch (err: any) {
    console.error("SEO fix error:", err);
    return NextResponse.json({ success: false, error: err.message || "Fix failed" }, { status: 500 });
  }
}
