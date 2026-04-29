import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { RankResult } from "@/lib/seo-types";
import os from "os";

const HOME = os.homedir();

const SEO_ROOT = join(HOME, "seo");
const TAVILY_KEY = process.env.TAVILY_API_KEY || "";

function domainsMatch(url: string, domain: string): boolean {
  try {
    const urlHost = new URL(url).hostname.replace(/^www\./, "");
    const cleanDomain = domain.replace(/^www\./, "");
    return urlHost === cleanDomain || urlHost.endsWith("." + cleanDomain);
  } catch {
    return false;
  }
}

async function checkKeywordRank(keyword: string, domain: string): Promise<RankResult> {
  const now = new Date().toISOString().slice(0, 10);

  if (!TAVILY_KEY) {
    return { keyword, position: 0, found: false, checkedAt: now };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query: keyword,
        max_results: 20,
        search_depth: "advanced",
      }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await res.json();
    const results = data.results || [];

    for (let i = 0; i < results.length; i++) {
      const resultUrl: string = results[i].url || "";
      if (domainsMatch(resultUrl, domain)) {
        return {
          keyword,
          position: i + 1,
          found: true,
          url: resultUrl,
          checkedAt: now,
        };
      }
    }

    return { keyword, position: 0, found: false, checkedAt: now };
  } catch {
    return { keyword, position: 0, found: false, checkedAt: now };
  }
}

interface KeywordRow {
  keyword: string;
  rank: string;
  target: string;
  difficulty: string;
  volume: string;
  lastChecked: string;
}

function parseKeywordsTable(content: string): { header: string; rows: KeywordRow[] } {
  const lines = content.split("\n");
  let header = "";
  const rows: KeywordRow[] = [];
  let inTable = false;

  for (const line of lines) {
    if (line.includes("| Keyword")) {
      header = lines.slice(0, lines.indexOf(line)).join("\n").trim();
      inTable = true;
      continue;
    }
    if (line.trim().startsWith("|---") || line.trim().startsWith("| ---")) {
      continue;
    }
    if (inTable && line.includes("|")) {
      // Strip leading/trailing pipe, then split on unescaped pipes
      const stripped = line.replace(/^\s*\|/, "").replace(/\|\s*$/, "");
      const cells = stripped.split("|").map((c) => c.trim().replace(/\\[|]/g, "|"));
      if (cells.length === 6) {
        rows.push({
          keyword: cells[0],
          rank: cells[1],
          target: cells[2],
          difficulty: cells[3],
          volume: cells[4],
          lastChecked: cells[5],
        });
      }
      // Skip rows with unexpected column count rather than crashing
    }
  }

  return { header: header || `# Keywords`, rows };
}

function serializeKeywordsTable(header: string, domain: string, rows: KeywordRow[]): string {
  const lines = [
    header || `# Keywords -- ${domain}`,
    "",
    "| Keyword | Rank | Target | Difficulty | Volume | Last Checked |",
    "|---------|------|--------|------------|--------|--------------|",
  ];

  for (const row of rows) {
    const esc = (s: string) => s.replace(/\|/g, "\\|");
    lines.push(`| ${esc(row.keyword)} | ${esc(row.rank)} | ${esc(row.target)} | ${esc(row.difficulty)} | ${esc(row.volume)} | ${esc(row.lastChecked)} |`);
  }

  return lines.join("\n") + "\n";
}

async function runRankCheck(domain: string, keywords: string[]): Promise<RankResult[]> {
  const results: RankResult[] = [];

  for (const keyword of keywords) {
    const result = await checkKeywordRank(keyword, domain);
    results.push(result);
  }

  // Update keywords.md
  const keywordsPath = join(SEO_ROOT, domain, "keywords.md");
  let existingContent = "";
  try {
    existingContent = await readFile(keywordsPath, "utf-8");
  } catch {
    // File doesn't exist yet
  }

  const { header, rows } = parseKeywordsTable(existingContent);

  // Update existing rows and add new ones
  for (const result of results) {
    const existing = rows.find((r) => r.keyword.toLowerCase() === result.keyword.toLowerCase());
    if (existing) {
      existing.rank = result.found ? String(result.position) : existing.rank;
      existing.lastChecked = result.checkedAt;
    } else {
      rows.push({
        keyword: result.keyword,
        rank: result.found ? String(result.position) : "-",
        target: "1",
        difficulty: "-",
        volume: "-",
        lastChecked: result.checkedAt,
      });
    }
  }

  await mkdir(join(SEO_ROOT, domain), { recursive: true });
  await writeFile(keywordsPath, serializeKeywordsTable(header, domain, rows));

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, keywords } = body;

    if (!domain || !keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json({ error: "Missing domain or keywords array" }, { status: 400 });
    }

    const results = await runRankCheck(domain, keywords);
    return NextResponse.json({ results });
  } catch (err: any) {
    console.error("Rank check error:", err);
    return NextResponse.json({ error: err.message || "Rank check failed" }, { status: 500 });
  }
}
