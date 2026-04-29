import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const ICP_DIR = path.join(WS, "projects/rio/icps");

// Section grouping for shopify-store-owners.md
const SECTION_GROUPS: Record<string, { label: string; sections: string[] }> = {
  planAndFilters: {
    label: "Plan & Filters",
    sections: [
      "Store Profile (StoreLeads Filters)",
      "Data Collection Plan (StoreLeads)",
      "Disqualification Filters",
    ],
  },
  coreIcp: {
    label: "Core ICP",
    sections: [
      "Tight Definition",
      "Why This Segment Fits Rio",
      "Company Profile",
      "Revenue Range",
      "Core Pain Points",
      "Tech Stack (Typical)",
      "Buying Signals",
      "Outreach Angles",
      "Willingness to Pay",
    ],
  },
  whatsappMarkets: {
    label: "WhatsApp Markets",
    sections: ["Geography — WhatsApp-Dominant Markets ONLY"],
  },
};

interface ParsedSection {
  title: string;
  content: string; // full block including the ## header line
}

function parseSections(raw: string): { header: string; sections: ParsedSection[] } {
  const lines = raw.split("\n");
  const headerLines: string[] = [];
  const sections: ParsedSection[] = [];
  let current: { title: string; lines: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current) sections.push({ title: current.title, content: current.lines.join("\n") });
      current = { title: line.slice(3).trim(), lines: [line] };
    } else if (current) {
      current.lines.push(line);
    } else {
      headerLines.push(line);
    }
  }
  if (current) sections.push({ title: current.title, content: current.lines.join("\n") });

  return { header: headerLines.join("\n"), sections };
}

function groupSections(sections: ParsedSection[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [groupKey, groupDef] of Object.entries(SECTION_GROUPS)) {
    const matched = sections
      .filter((s) => groupDef.sections.includes(s.title))
      .map((s) => s.content);
    result[groupKey] = matched.join("\n\n");
  }
  return result;
}

function reconstructFile(
  header: string,
  originalSections: ParsedSection[],
  updates: Record<string, string>
): string {
  // Build a map of title → updated content from the updates
  const updatedByTitle: Record<string, string> = {};
  for (const [groupKey, groupDef] of Object.entries(SECTION_GROUPS)) {
    if (!updates[groupKey]) continue;
    // Parse the updated group content back into individual sections
    const { sections: updatedSections } = parseSections(updates[groupKey]);
    for (const s of updatedSections) {
      updatedByTitle[s.title] = s.content;
    }
    // If the update is a single blob without ## headers (user edited freeform),
    // assign the whole blob to the first section of the group
    if (updatedSections.length === 0 && updates[groupKey].trim()) {
      const firstSectionTitle = groupDef.sections[0];
      updatedByTitle[firstSectionTitle] = `## ${firstSectionTitle}\n\n${updates[groupKey].trim()}`;
    }
  }

  const reconstructed = originalSections.map((s) =>
    updatedByTitle[s.title] !== undefined ? updatedByTitle[s.title] : s.content
  );

  const parts = [header.trimEnd(), ...reconstructed].filter(Boolean);
  return parts.join("\n\n") + "\n";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "shopify-store-owners";
  const filePath = path.join(ICP_DIR, `${file}.md`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const { header, sections } = parseSections(raw);
  const groups = groupSections(sections);

  return NextResponse.json({ file, header, groups, raw });
}

export async function PUT(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const file = searchParams.get("file") || "shopify-store-owners";
  const filePath = path.join(ICP_DIR, `${file}.md`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const body = await req.json() as { updates: Record<string, string> };
  const raw = fs.readFileSync(filePath, "utf8");
  const { header, sections } = parseSections(raw);
  const reconstructed = reconstructFile(header, sections, body.updates);

  fs.writeFileSync(filePath, reconstructed, "utf8");
  return NextResponse.json({ ok: true });
}
