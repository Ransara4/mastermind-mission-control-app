import { readFile, mkdir } from "fs/promises";
import { join } from "path";
import os from "os";
import type { AutopilotResult, PageScan } from "@/lib/seo-types";

const SEO_ROOT = join(os.homedir(), "seo");

// ── Profile parsing ───────────────────────────────────────────────

interface ProfileData {
  title: string;
  description: string;
  type: string;
  goals: string;
  audience: string;
  contact: string;
}

function parseProfile(content: string, domain: string): ProfileData {
  const lines = content.split("\n");

  let title = "";
  let description = "";
  let type = "";
  let goals = "";
  let audience = "";
  let contact = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Extract heading as title
    const headingMatch = trimmed.match(/^#+\s+(.+)$/);
    if (headingMatch && !title) {
      title = headingMatch[1].trim();
      continue;
    }

    // Extract bold key-value pairs: **key**: value or - **key**: value
    const kvMatch = trimmed.match(/^\s*-?\s*\*\*([^*]+)\*\*[:\s]+(.+)$/);
    if (kvMatch) {
      const key = kvMatch[1].toLowerCase().trim();
      const value = kvMatch[2].trim().replace(/^\*|\*$/g, "");

      if ((key.includes("description") || key.includes("about")) && !description) {
        description = value;
      } else if (key.includes("type") || key.includes("industry")) {
        type = value;
      } else if (key.includes("goal") || key.includes("objective")) {
        goals = value;
      } else if (key.includes("audience") || key.includes("target")) {
        audience = value;
      } else if (key.includes("contact") || key.includes("email") || key.includes("phone")) {
        contact = value;
      }
      continue;
    }

    // First non-heading, non-bullet plain line as fallback description
    if (!description && !trimmed.startsWith("#") && !trimmed.startsWith("-") && !trimmed.startsWith("*") && trimmed.length > 20) {
      description = trimmed;
    }
  }

  // Fallback title from domain
  if (!title) {
    title = domain.split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Trim description to ~160 chars at word boundary
  if (description.length > 160) {
    description = description.slice(0, 160).replace(/\s+\S*$/, "");
  }

  return { title, description, type, goals, audience, contact };
}

// ── GSC query extraction ─────────────────────────────────────────

async function loadTopQueries(domain: string): Promise<string[]> {
  // Try gsc-cache.json first (as spec says), then gsc/top-queries.json
  const candidates = [
    join(SEO_ROOT, domain, "gsc-cache.json"),
    join(SEO_ROOT, domain, "gsc", "top-queries.json"),
  ];

  for (const filePath of candidates) {
    try {
      const raw = await readFile(filePath, "utf-8");
      const data = JSON.parse(raw);

      // Handle both { rows: [...] } and bare array formats
      const rows: Array<{ query: string; clicks?: number; impressions?: number }> =
        Array.isArray(data)
          ? data
          : data?.rows || data?.queries || [];

      const sorted = [...rows]
        .sort((a, b) => (b.clicks ?? b.impressions ?? 0) - (a.clicks ?? a.impressions ?? 0))
        .slice(0, 5)
        .map((r) => r.query)
        .filter(Boolean);

      if (sorted.length > 0) return sorted;
    } catch {
      // Try next candidate
    }
  }

  return [];
}

// ── Page list from autopilot-latest.json ─────────────────────────

async function loadPages(domain: string): Promise<PageScan[]> {
  try {
    const raw = await readFile(join(SEO_ROOT, domain, "autopilot-latest.json"), "utf-8");
    const data: AutopilotResult = JSON.parse(raw);
    const pages = data?.phases?.crawl?.worstPages || [];
    // Include pages with score > 0 (skip error pages)
    return pages.filter((p) => p.score > 0);
  } catch {
    return [];
  }
}

// ── Main generator ────────────────────────────────────────────────

export async function generateLlmsTxt(domain: string): Promise<string> {
  const siteDir = join(SEO_ROOT, domain);

  // Load all sources in parallel
  const [profileRaw, topQueries, pages] = await Promise.all([
    readFile(join(siteDir, "profile.md"), "utf-8").catch(() => ""),
    loadTopQueries(domain),
    loadPages(domain),
  ]);

  const profile = parseProfile(profileRaw, domain);
  const siteName = profile.title || domain;

  const lines: string[] = [];

  // Title
  lines.push(`# ${siteName}`);
  lines.push("");

  // Description blockquote
  const desc = profile.description || `${siteName} — ${domain}`;
  lines.push(`> ${desc}`);
  lines.push("");

  // Top GSC queries paragraph
  if (topQueries.length > 0) {
    lines.push(`Users find this site by searching for: ${topQueries.join(", ")}.`);
    lines.push("");
  }

  // Key Pages section
  if (pages.length > 0) {
    lines.push("## Key Pages");
    lines.push("");
    // Sort by score descending so best pages appear first, cap at 50
    const sorted = [...pages].sort((a, b) => b.score - a.score).slice(0, 50);
    for (const page of sorted) {
      const pageTitle = page.title || new URL(page.url).pathname || domain;
      const pageDesc = page.metaDesc
        ? page.metaDesc
        : `Learn more about ${pageTitle}`;
      lines.push(`- [${pageTitle}](${page.url}): ${pageDesc}`);
    }
    lines.push("");
  }

  // About section — from profile fields
  const aboutLines: string[] = [];
  if (profile.type) aboutLines.push(`- **Type:** ${profile.type}`);
  if (profile.audience) aboutLines.push(`- **Target audience:** ${profile.audience}`);
  if (profile.goals) aboutLines.push(`- **Goals:** ${profile.goals}`);

  if (aboutLines.length > 0) {
    lines.push("## About");
    lines.push("");
    lines.push(...aboutLines);
    lines.push("");
  }

  // Contact section
  if (profile.contact) {
    lines.push("## Contact");
    lines.push("");
    lines.push(`- ${profile.contact}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ── Save helper (used by routes) ─────────────────────────────────

export async function saveLlmsTxt(domain: string, content: string): Promise<void> {
  const siteDir = join(SEO_ROOT, domain);
  await mkdir(siteDir, { recursive: true });
  const { writeFile } = await import("fs/promises");
  await writeFile(join(siteDir, "llms.txt"), content, "utf-8");
}
