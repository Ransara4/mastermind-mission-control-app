import { NextRequest, NextResponse } from "next/server";
import { readFile, appendFile } from "fs/promises";
import { join } from "path";
import { generateMetaDescription } from "@/lib/seo-ai";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const CDP_URL = "http://localhost:9223";

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

interface DashboardFixResult {
  tier: "playwright";
  status: "fixed" | "failed" | "skipped";
  message: string;
  details?: string;
}

// ── Record fix outcome in rules file ──

async function recordOutcome(
  domain: string,
  fixType: string,
  status: "fixed" | "failed" | "skipped",
  details: string
): Promise<void> {
  try {
    const rulesPath = join(SEO_ROOT, "WIX-FIX-RULES.md");
    const date = new Date().toISOString().slice(0, 10);
    const entry = `\n**T3-outcome (${date}):** [${status.toUpperCase()}] ${fixType} on ${domain}\n- ${details}\n`;
    await appendFile(rulesPath, entry, "utf-8");
  } catch {}
}

// ── Check if Chrome CDP is available ──

async function isCDPAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${CDP_URL}/json/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Playwright CDP fix ──

async function playwrightFix(
  siteId: string,
  domain: string,
  issueMsg: string,
  value?: string
): Promise<DashboardFixResult> {
  // Dynamically import playwright (only available in Node.js context)
  let chromium: any;
  try {
    const pw = await import("playwright");
    chromium = pw.chromium;
  } catch {
    return {
      tier: "playwright",
      status: "skipped",
      message: "Playwright not available in this environment",
    };
  }

  const msg = issueMsg.toLowerCase();
  let browser: any = null;

  try {
    browser = await chromium.connectOverCDP(CDP_URL);
    const contexts = browser.contexts();
    const context = contexts[0] || (await browser.newContext());
    const pages = context.pages();
    const page = pages[0] || (await context.newPage());

    // ── Per-page description fix ──
    if (msg.includes("meta description") || msg.includes("description")) {
      const seoUrl = `https://manage.wix.com/dashboard/${siteId}/marketing-tools/seo/pages`;
      await page.goto(seoUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      // Generate description if not provided
      let descValue = value || "";
      if (!descValue || descValue === "__ai_generate__") {
        descValue = (await generateMetaDescription(domain, "", domain)) || "";
      }
      if (!descValue) {
        return {
          tier: "playwright",
          status: "skipped",
          message: "Could not generate description — Claude unavailable",
        };
      }

      // Look for description input on the SEO pages panel
      const descSelectors = [
        'input[placeholder*="description" i]',
        'textarea[placeholder*="description" i]',
        '[data-testid*="description"]',
        '[aria-label*="description" i]',
      ];

      let inputFound = false;
      for (const sel of descSelectors) {
        try {
          const el = await page.waitForSelector(sel, { timeout: 5000 });
          if (el) {
            await el.triple_click?.() ?? await el.click({ clickCount: 3 });
            await el.fill(descValue);
            inputFound = true;
            break;
          }
        } catch {}
      }

      if (!inputFound) {
        const result: DashboardFixResult = {
          tier: "playwright",
          status: "skipped",
          message: `Could not find description input on Wix SEO panel. Manual fix needed.`,
          details: `Navigate to: ${seoUrl}\nGenerated description (${descValue.length} chars): "${descValue}"`,
        };
        await recordOutcome(domain, "page-description", "skipped", `Selector not found on ${seoUrl}`);
        return result;
      }

      // Save
      const saveSelectors = [
        'button[data-testid="save-button"]',
        'button:has-text("Save")',
        'button:has-text("Apply")',
        '[aria-label="Save"]',
      ];

      let saved = false;
      for (const sel of saveSelectors) {
        try {
          const btn = await page.waitForSelector(sel, { timeout: 3000 });
          if (btn) {
            await btn.click();
            await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
            saved = true;
            break;
          }
        } catch {}
      }

      if (saved) {
        await recordOutcome(domain, "page-description", "fixed", `Set to "${descValue.slice(0, 80)}..."`);
        return {
          tier: "playwright",
          status: "fixed",
          message: `Meta description set via Wix Dashboard (${descValue.length} chars)`,
          details: `"${descValue}"`,
        };
      }

      await recordOutcome(domain, "page-description", "skipped", "Input filled but save button not found");
      return {
        tier: "playwright",
        status: "skipped",
        message: "Filled description but could not find save button — check Wix Dashboard manually",
        details: `Generated: "${descValue}"`,
      };
    }

    // ── Per-page title fix ──
    if (msg.includes("title") && !msg.includes("og:")) {
      const seoUrl = `https://manage.wix.com/dashboard/${siteId}/marketing-tools/seo/pages`;
      await page.goto(seoUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000);

      const result: DashboardFixResult = {
        tier: "playwright",
        status: "skipped",
        message: "Page title fix via Playwright requires specifying which page — escalating to Claude Code",
        details: `Dashboard: ${seoUrl}`,
      };
      await recordOutcome(domain, "page-title", "skipped", "Page-specific title needs explicit page URL");
      return result;
    }

    return {
      tier: "playwright",
      status: "skipped",
      message: "Playwright tier cannot handle this issue type",
    };
  } catch (err: any) {
    const errMsg = err.message || "Unknown Playwright error";
    await recordOutcome(domain, "playwright-fix", "failed", errMsg);

    if (errMsg.includes("connect") || errMsg.includes("ECONNREFUSED")) {
      return {
        tier: "playwright",
        status: "skipped",
        message: "Chrome not running on port 9223 — start Chrome with remote debugging to enable Playwright fixes",
        details: `Start Chrome: open -a "Google Chrome" --args --remote-debugging-port=9223`,
      };
    }

    return {
      tier: "playwright",
      status: "failed",
      message: `Playwright error: ${errMsg}`,
    };
  } finally {
    // Don't close the browser — we're attached to an existing session
    if (browser) {
      try {
        await browser.close();
      } catch {}
    }
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<DashboardFixResult>> {
  try {
    const body = await request.json();
    const { domain, issue, value, siteId: overrideSiteId } = body;

    if (!domain || !issue) {
      return NextResponse.json({
        tier: "playwright",
        status: "failed",
        message: "Missing domain or issue in request body",
      });
    }

    if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
      return NextResponse.json({ tier: "playwright", status: "failed", message: "Invalid domain format" }, { status: 400 });
    }

    const siteId = overrideSiteId || await getSiteId(domain);
    if (!siteId) {
      return NextResponse.json({
        tier: "playwright",
        status: "skipped",
        message: `No Wix site ID found for ${domain}`,
      });
    }

    // Check CDP availability first
    const cdpAvailable = await isCDPAvailable();
    if (!cdpAvailable) {
      return NextResponse.json({
        tier: "playwright",
        status: "skipped",
        message: "Chrome not running on port 9223 — Playwright tier unavailable",
        details: 'Start Chrome with: open -a "Google Chrome" --args --remote-debugging-port=9223',
      });
    }

    const result = await playwrightFix(siteId, domain, issue.message || "", value);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({
      tier: "playwright",
      status: "failed",
      message: err.message || "Unknown error in wix-dashboard-fix",
    });
  }
}
