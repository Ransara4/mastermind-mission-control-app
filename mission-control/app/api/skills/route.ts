import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const WORKSPACE_SKILLS_DIR = path.join(WS, "skills");
const CLAUDE_SKILLS_DIR = path.join(HOME, ".claude/skills");
const CLAWHUB_LOCK = path.join(HOME, ".clawhub/lock.json");
const SKILLS_AUTH_DIR = path.join(WS, "skills/.auth");

const DISABLED_PREFIX = ".disabled-";

interface SkillMeta {
  owner?: string;
  ownerId?: string;
  slug?: string;
  displayName?: string;
  description?: string;
  version?: string;
  latest?: {
    version?: string;
    publishedAt?: number;
    commit?: string;
  };
  history?: unknown[];
  auth?: AuthField[];
}

interface AuthField {
  key: string;
  label: string;
  type: "text" | "password" | "url";
  required?: boolean;
  placeholder?: string;
}

interface SkillEntry {
  name: string;
  slug: string;
  description: string;
  source: "workspace" | "claude" | "clawhub";
  version: string | null;
  installedAt: string | null;
  enabled: boolean;
  hasMeta: boolean;
  hasSkillMd: boolean;
  skillMdContent: string | null;
  authFields: AuthField[];
  authConfigured: boolean;
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isAuthConfigured(slug: string): Promise<boolean> {
  const authFile = path.join(SKILLS_AUTH_DIR, `${slug}.json`);
  return fileExists(authFile);
}

async function scanSkillsDir(
  dir: string,
  source: "workspace" | "claude"
): Promise<SkillEntry[]> {
  const skills: SkillEntry[] = [];

  if (!(await dirExists(dir))) return skills;

  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return skills;
  }

  for (const entry of entries) {
    // Skip hidden dirs that aren't disabled skills, and skip .auth
    if (entry === ".auth") continue;
    if (entry.startsWith(".") && !entry.startsWith(DISABLED_PREFIX)) continue;

    const entryPath = path.join(dir, entry);
    if (!(await dirExists(entryPath))) continue;

    const isDisabled = entry.startsWith(DISABLED_PREFIX);
    const actualSlug = isDisabled ? entry.slice(DISABLED_PREFIX.length) : entry;

    const metaPath = path.join(entryPath, "_meta.json");
    const skillMdPath = path.join(entryPath, "SKILL.md");
    const hasMeta = await fileExists(metaPath);
    const hasSkillMd = await fileExists(skillMdPath);

    let meta: SkillMeta = {};
    if (hasMeta) {
      try {
        const raw = await fs.readFile(metaPath, "utf-8");
        meta = JSON.parse(raw);
      } catch {
        // ignore parse errors
      }
    }

    let skillMdContent: string | null = null;
    if (hasSkillMd) {
      try {
        skillMdContent = await fs.readFile(skillMdPath, "utf-8");
      } catch {
        // ignore read errors
      }
    }

    let installedAt: string | null = null;
    try {
      const stat = await fs.stat(entryPath);
      installedAt = stat.birthtime.toISOString();
    } catch {
      // ignore
    }

    const slug = meta.slug || actualSlug;
    const authFields = meta.auth || [];
    const authConfigured = authFields.length > 0 ? await isAuthConfigured(slug) : true;

    skills.push({
      name: meta.displayName || actualSlug,
      slug,
      description: meta.description || "",
      source,
      version: meta.latest?.version || meta.version || null,
      installedAt,
      enabled: !isDisabled,
      hasMeta,
      hasSkillMd,
      skillMdContent,
      authFields,
      authConfigured,
    });
  }

  return skills;
}

async function getClawHubSkills(): Promise<SkillEntry[]> {
  const skills: SkillEntry[] = [];

  if (!(await fileExists(CLAWHUB_LOCK))) return skills;

  try {
    const raw = await fs.readFile(CLAWHUB_LOCK, "utf-8");
    const lock = JSON.parse(raw);

    if (lock.skills && typeof lock.skills === "object") {
      for (const [slug, info] of Object.entries(lock.skills)) {
        const skillInfo = info as { version?: string; installedAt?: number };
        skills.push({
          name: slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" "),
          slug,
          description: "",
          source: "clawhub",
          version: skillInfo.version || null,
          installedAt: skillInfo.installedAt
            ? new Date(skillInfo.installedAt).toISOString()
            : null,
          enabled: true,
          hasMeta: false,
          hasSkillMd: false,
          skillMdContent: null,
          authFields: [],
          authConfigured: true,
        });
      }
    }
  } catch {
    // ignore
  }

  return skills;
}

export async function GET() {
  try {
    const [workspaceSkills, claudeSkills, clawhubSkills] = await Promise.all([
      scanSkillsDir(WORKSPACE_SKILLS_DIR, "workspace"),
      scanSkillsDir(CLAUDE_SKILLS_DIR, "claude"),
      getClawHubSkills(),
    ]);

    const seen = new Set<string>();
    const allSkills: SkillEntry[] = [];

    for (const skill of workspaceSkills) {
      seen.add(skill.slug);
      allSkills.push(skill);
    }

    for (const skill of claudeSkills) {
      if (!seen.has(skill.slug)) {
        seen.add(skill.slug);
        allSkills.push(skill);
      }
    }

    for (const skill of clawhubSkills) {
      if (!seen.has(skill.slug)) {
        allSkills.push(skill);
      }
    }

    allSkills.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      total: allSkills.length,
      workspace: workspaceSkills.length,
      claude: claudeSkills.length,
      clawhub: clawhubSkills.length,
      skills: allSkills,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to scan skills", detail: String(err) },
      { status: 500 }
    );
  }
}
