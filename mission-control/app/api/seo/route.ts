import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat, writeFile, mkdir } from "fs/promises";
import path, { join } from "path";
import os from "os";
import { getWebsitesForSeo } from "@/lib/websites-db";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const SEO_SKILL = path.join(WS, "skills/seo");

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function readText(path: string): Promise<string> {
  try {
    return await readFile(path, "utf-8");
  } catch {
    return "";
  }
}

async function readJson(path: string): Promise<any> {
  try {
    const text = await readFile(path, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function listDir(path: string): Promise<string[]> {
  try {
    return await readdir(path);
  } catch {
    return [];
  }
}

interface KeywordEntry {
  keyword: string;
  rank: string;
  target: string;
  difficulty: string;
  volume: string;
  lastChecked: string;
}

function parseKeywords(content: string): KeywordEntry[] {
  const keywords: KeywordEntry[] = [];
  const lines = content.split("\n");
  let inTable = false;
  for (const line of lines) {
    const cells = line
      .split("|")
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells[0] === "Keyword") {
      inTable = true;
      continue;
    }
    if (cells[0]?.startsWith("---")) continue;
    if (inTable && cells.length >= 6) {
      keywords.push({
        keyword: cells[0],
        rank: cells[1],
        target: cells[2],
        difficulty: cells[3],
        volume: cells[4],
        lastChecked: cells[5],
      });
    }
  }
  return keywords;
}

function parseProfile(content: string): Record<string, string> {
  const profile: Record<string, string> = {};
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^- \*\*(.+?)\*\*:\s*(.*)$/);
    if (match) {
      profile[match[1].toLowerCase()] = match[2].trim();
    }
  }
  const titleLine = lines.find((l) => l.startsWith("# "));
  if (titleLine) profile.title = titleLine.replace(/^#\s+/, "");
  return profile;
}

// GET /api/seo — returns sites list
// GET /api/seo?site=domain — returns full data for one site
export async function GET(request: NextRequest) {
  const siteParam = request.nextUrl.searchParams.get("site");

  // Load sites registry from websites.db, fall back to sites.json
  let sites: any[] = getWebsitesForSeo();
  if (sites.length === 0) {
    const sitesJson = await readText(join(SEO_ROOT, "sites.json"));
    try {
      sites = JSON.parse(sitesJson).sites || [];
    } catch {
      sites = [];
    }
  }

  // If no site selected, return just the sites list + skill info
  if (!siteParam) {
    const skillFiles = await listDir(SEO_SKILL);
    const references = skillFiles
      .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
      .map((f) => f.replace(".md", ""));

    return NextResponse.json({
      sites,
      selectedSite: null,
      skillVersion: "1.0.3",
      references,
    });
  }

  // Load data for selected site — auto-scaffold directory if missing
  const siteDir = join(SEO_ROOT, siteParam);
  const exists = await fileExists(siteDir);
  if (!exists) {
    // Check site is in sites.json before scaffolding
    const siteInRegistry = sites.find((s: any) => s.domain === siteParam);
    if (!siteInRegistry) {
      return NextResponse.json({ error: "Site not found in registry" }, { status: 404 });
    }
    // Scaffold minimal directory structure
    for (const sub of ["audits", "content", "outreach", "gsc"]) {
      await mkdir(join(siteDir, sub), { recursive: true });
    }
    await writeFile(
      join(siteDir, "profile.md"),
      `# ${siteParam}\n\n- **Domain**: ${siteParam}\n- **Added**: ${new Date().toISOString().slice(0, 10)}\n`
    );
    await writeFile(
      join(siteDir, "keywords.md"),
      `# Keywords — ${siteParam}\n\n| Keyword | Rank | Target | Difficulty | Volume | Last Checked |\n|---------|------|--------|------------|--------|--------------|\n`
    );
  }

  const profileContent = await readText(join(siteDir, "profile.md"));
  const keywordsContent = await readText(join(siteDir, "keywords.md"));
  const profile = parseProfile(profileContent);
  const keywords = parseKeywords(keywordsContent);

  // Audits — try audit-history.json first, fall back to parsing markdown files
  const auditHistoryJson = await readJson(join(siteDir, "audit-history.json"));
  let audits: {
    name: string;
    date: string;
    title?: string;
    score?: number;
    grade?: string;
    critical?: number;
    warnings?: number;
    passes?: number;
    pages?: number;
  }[] = [];

  if (Array.isArray(auditHistoryJson) && auditHistoryJson.length > 0) {
    audits = auditHistoryJson.map((entry: any) => ({
      name: entry.name || `audit-${entry.date}`,
      date: entry.date,
      score: entry.score ?? undefined,
      grade: entry.grade ?? undefined,
      critical: entry.critical ?? undefined,
      warnings: entry.warnings ?? undefined,
      passes: entry.passes ?? undefined,
      pages: entry.pages ?? undefined,
    }));
  } else {
    const auditFiles = await listDir(join(siteDir, "audits"));
    for (const a of auditFiles.filter((f) => f.endsWith(".md"))) {
      const content = await readText(join(siteDir, "audits", a));
      const lines = content.split("\n");
      const firstLine = lines.find((l) => l.startsWith("#")) || a;
      const s = await stat(join(siteDir, "audits", a));

      // Parse score and grade from **Score**: NN/100 (X)
      let score: number | undefined;
      let grade: string | undefined;
      const scoreLine = lines.find((l) => /\*\*Score\*\*/.test(l));
      if (scoreLine) {
        const scoreMatch = scoreLine.match(/(\d+)\/100/);
        const gradeMatch = scoreLine.match(/\(([A-F])\)/);
        if (scoreMatch) score = parseInt(scoreMatch[1], 10);
        if (gradeMatch) grade = gradeMatch[1];
      }

      // Count issue types
      let critical = 0;
      let warnings = 0;
      let passes = 0;
      for (const line of lines) {
        if (line.startsWith("- CRITICAL:")) critical++;
        else if (line.startsWith("- WARNING:")) warnings++;
        else if (line.startsWith("- PASS:")) passes++;
      }

      audits.push({
        name: a,
        title: firstLine.replace(/^#+\s*/, ""),
        date: s.mtime.toISOString(),
        score,
        grade,
        critical,
        warnings,
        passes,
      });
    }
  }

  // Content drafts
  const contentFiles = await listDir(join(siteDir, "content"));
  const contentDrafts = [];
  for (const c of contentFiles.filter((f) => f.endsWith(".md"))) {
    const content = await readText(join(siteDir, "content", c));
    const firstLine = content.split("\n").find((l) => l.startsWith("#")) || c;
    const s = await stat(join(siteDir, "content", c));
    contentDrafts.push({
      name: c,
      title: firstLine.replace(/^#+\s*/, ""),
      date: s.mtime.toISOString(),
      size: content.length,
    });
  }

  // Outreach
  const outreachFiles = await listDir(join(siteDir, "outreach"));
  const outreach = outreachFiles.filter((f) => f.endsWith(".md") || f.endsWith(".csv"));

  // Skill references
  const skillFiles = await listDir(SEO_SKILL);
  const references = skillFiles
    .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
    .map((f) => f.replace(".md", ""));

  const siteEntry = sites.find((s: any) => s.domain === siteParam);

  // Load autopilot result, fix queue, and crawl result
  const autopilotResult = await readJson(join(siteDir, "autopilot-latest.json"));
  const fixQueue = await readJson(join(siteDir, "fix-queue.json"));
  const crawlResult = await readJson(join(siteDir, "crawl-latest.json"));

  // Derive last audit score and run time from autopilot result
  const lastAuditScore = autopilotResult?.summary?.score ?? null;
  const lastRunAt = autopilotResult?.runAt ?? null;

  return NextResponse.json({
    sites,
    selectedSite: {
      domain: siteParam,
      name: siteEntry?.name || profile.title || siteParam,
      status: siteEntry?.status || "active",
      hosting: siteEntry?.hosting || "",
      agent: siteEntry?.agent || "",
      profile,
      keywords,
      audits: audits.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      contentDrafts: contentDrafts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      ),
      outreachFiles: outreach,
      autopilotResult: autopilotResult || null,
      fixQueue: fixQueue || [],
      crawlResult: crawlResult || null,
      stats: {
        trackedKeywords: keywords.length,
        totalAudits: audits.length,
        contentDrafts: contentDrafts.length,
        outreachItems: outreach.length,
        lastAuditScore,
        lastRunAt,
      },
    },
    skillVersion: "1.0.3",
    references,
  });
}

// POST /api/seo — update fix queue item status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, domain, id, status: newStatus } = body;

    if (action !== "update-fix-item" || !domain || !id || !newStatus) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!["fixed", "dismissed"].includes(newStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const fixQueuePath = join(SEO_ROOT, domain, "fix-queue.json");
    const raw = await readText(fixQueuePath);
    if (!raw) {
      return NextResponse.json({ error: "No fix queue found" }, { status: 404 });
    }

    const items = JSON.parse(raw);
    const item = items.find((i: any) => i.id === id);
    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    item.status = newStatus;
    await writeFile(fixQueuePath, JSON.stringify(items, null, 2));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("SEO POST error:", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
