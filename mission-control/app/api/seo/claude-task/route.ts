import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const HOME = os.homedir();

const DB_PATH = path.join(process.cwd(), "lib", "db.json");
const SEO_ROOT = path.join(HOME, "seo");

interface Issue {
  severity: string;
  message: string;
}

interface RequestBody {
  domain: string;
  command: string;
  issues?: Issue[];
  auditScore?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { domain, command, issues, auditScore } = body;

    if (!domain || !command) {
      return NextResponse.json(
        { error: "Missing required fields: domain and command" },
        { status: 400 }
      );
    }

    if (!domain || !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$/.test(domain.toLowerCase())) {
      return NextResponse.json({ error: "Invalid domain format" }, { status: 400 });
    }

    // Determine hosting from websites.db, fall back to sites.json
    let hosting = "";
    const dbSites = getWebsitesForSeo();
    const dbEntry = dbSites.find((s: any) => s.domain === domain);
    if (dbEntry) {
      hosting = dbEntry.hosting || "";
    } else {
      try {
        const sitesRaw = await fs.readFile(path.join(SEO_ROOT, "sites.json"), "utf-8");
        const sitesJson = JSON.parse(sitesRaw);
        const siteEntry = (sitesJson.sites || []).find((s: any) => s.domain === domain);
        hosting = siteEntry?.hosting || "";
      } catch {}
    }

    const hostingInstruction =
      hosting === "wix"
        ? "Use the Wix API (wixPatch to /site-properties/v4/properties) for meta/title updates. For content/copy fixes, use the Wix dashboard editor."
        : "For content/copy fixes, edit the source files directly. For meta tags, update the template/CMS as appropriate for the hosting platform.";

    // Read existing DB
    const content = await fs.readFile(DB_PATH, "utf-8");
    const db = JSON.parse(content);

    // Bump existing card orders in claude-code-todo
    db.cards = db.cards.map((c: any) =>
      c.column === "claude-code-todo" ? { ...c, order: c.order + 1 } : c
    );

    // Build a short title from the command (truncate at 60 chars)
    const commandSummary =
      command.length > 60 ? command.slice(0, 57) + "..." : command;

    // Build rich description
    const descriptionParts: string[] = [
      `## Site: ${domain}`,
      "",
      `## Command`,
      command,
      "",
      `## Context`,
      `- Audit Score: ${auditScore !== undefined ? auditScore : "N/A"}`,
    ];

    if (issues && issues.length > 0) {
      descriptionParts.push("", "## Issues to Fix");
      issues.forEach((issue, i) => {
        descriptionParts.push(
          `${i + 1}. [${issue.severity}] ${issue.message}`
        );
      });
    }

    descriptionParts.push(
      "",
      "## Instructions",
      `You are Claude Code fixing SEO issues for ${domain}. Work through each issue below. Use these local APIs — they actually apply fixes to the live site:`,
      "",
      "### API: Fix meta description or site display name (site-level, Wix only)",
      "```",
      `curl -s -X POST http://localhost:3000/api/seo/fix \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -d '{"domain":"${domain}","directAction":{"type":"updateDescription","value":"__ai_generate__"}}'`,
      "```",
      "Set value to `\"__ai_generate__\"` to have the AI write it, or provide the exact text (150-160 chars, no em dashes).",
      "",
      "### API: Fix schema / H1 / structured data (Wix Custom Code injection)",
      "```",
      `curl -s -X POST http://localhost:3000/api/seo/browser-fix \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -d '{"domain":"${domain}","issue":{"severity":"critical","message":"ISSUE_MESSAGE_HERE"}}'`,
      "```",
      "Replace ISSUE_MESSAGE_HERE with the exact issue message string.",
      "",
      "### API: Run full issue-based fix (tries all applicable fixes for an issue)",
      "```",
      `curl -s -X POST http://localhost:3000/api/seo/fix \\`,
      `  -H 'Content-Type: application/json' \\`,
      `  -d '{"domain":"${domain}","issues":[{"severity":"warning","message":"ISSUE_MESSAGE_HERE"}]}'`,
      "```",
      "",
      "### What these APIs can fix automatically:",
      "- Meta description missing/short/long → updateDescription (AI-generates and pushes to Wix)",
      "- Schema markup (Organization, LocalBusiness, FAQPage, BreadcrumbList) → browser-fix",
      "- No H1 / Missing H1 → browser-fix (detects candidate element and injects via Custom Code)",
      "",
      "### What requires manual action (skip these, leave a note):",
      "- Page-level titles (Wix Pages API not writable via REST for title tags)",
      "- Image alt text (requires Wix Media Manager or Editor)",
      "- CSP/HSTS headers (Wix doesn't support custom HTTP headers)",
      "- OG images (requires uploading to Wix Media)",
      "",
      "### For each issue: try the API first, check the response JSON for status=fixed/skipped/failed, then move on.",
      `${hostingInstruction}`,
      `Check ~/seo/${domain}/ for profile and audit history.`
    );

    const cardId = `card_${Date.now()}`;
    const now = Date.now();

    const newCard = {
      _id: cardId,
      title: `SEO: ${commandSummary} for ${domain}`,
      description: descriptionParts.join("\n"),
      column: "claude-code-todo",
      priority: "High",
      labels: ["seo", domain],
      order: 0,
      project: "Masterminds",
      createdAt: now,
      updatedAt: now,
    };

    db.cards.push(newCard);
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");

    // Immediately trigger the task executor — no need to wait in the queue
    let executorStarted = false;
    try {
      const execRes = await fetch(`http://localhost:3000/api/tasks/${cardId}/execute`, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
      });
      executorStarted = execRes.ok;
    } catch {
      // Executor trigger failed — card is still in queue for pickup
    }

    return NextResponse.json({ success: true, card: newCard, executorStarted });
  } catch (error: any) {
    console.error("Error creating SEO Claude task:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create task" },
      { status: 500 }
    );
  }
}
