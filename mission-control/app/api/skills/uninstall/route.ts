import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const DISABLED_PREFIX = ".disabled-";
const REGISTRY_PATH = path.join(WS, "skills-registry.json");

const SKILL_DIRS = [
  path.join(WS, "skills"),
  path.join(HOME, ".claude/skills"),
];

async function findSkillDir(
  slug: string
): Promise<{ dir: string; fullPath: string } | null> {
  for (const baseDir of SKILL_DIRS) {
    // Check enabled path
    const enabledPath = path.join(baseDir, slug);
    try {
      const stat = await fs.stat(enabledPath);
      if (stat.isDirectory()) {
        return { dir: baseDir, fullPath: enabledPath };
      }
    } catch {
      // not found
    }

    // Check disabled path
    const disabledPath = path.join(baseDir, `${DISABLED_PREFIX}${slug}`);
    try {
      const stat = await fs.stat(disabledPath);
      if (stat.isDirectory()) {
        return { dir: baseDir, fullPath: disabledPath };
      }
    } catch {
      // not found
    }
  }
  return null;
}

async function removeFromRegistry(skillId: string): Promise<void> {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, "utf-8");
    const registry = JSON.parse(raw);
    if (registry.skills && Array.isArray(registry.skills)) {
      registry.skills = registry.skills.filter(
        (s: { id: string }) => s.id !== skillId
      );
      registry.lastUpdated = new Date().toISOString();
      await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
    }
  } catch {
    // Registry file may not exist or be malformed -- not fatal
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug } = body as { slug: string };

    if (!slug || typeof slug !== "string") {
      return NextResponse.json(
        { error: "Missing required field: slug (string)" },
        { status: 400 }
      );
    }

    const found = await findSkillDir(slug);
    if (!found) {
      // Still remove from registry even if directory is gone
      await removeFromRegistry(slug);
      return NextResponse.json({
        slug,
        removed: true,
        message: "Skill directory not found but removed from registry",
      });
    }

    // Remove the skill directory
    await fs.rm(found.fullPath, { recursive: true, force: true });

    // Remove from registry
    await removeFromRegistry(slug);

    return NextResponse.json({
      slug,
      removed: true,
      path: found.fullPath,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to uninstall skill", detail: String(err) },
      { status: 500 }
    );
  }
}
