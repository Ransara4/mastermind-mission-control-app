import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const DISABLED_PREFIX = ".disabled-";

const SKILL_DIRS = [
  path.join(WS, "skills"),
  path.join(HOME, ".claude/skills"),
];

async function findSkillDir(
  slug: string
): Promise<{ dir: string; currentName: string; isDisabled: boolean } | null> {
  for (const baseDir of SKILL_DIRS) {
    // Check enabled path
    const enabledPath = path.join(baseDir, slug);
    try {
      const stat = await fs.stat(enabledPath);
      if (stat.isDirectory()) {
        return { dir: baseDir, currentName: slug, isDisabled: false };
      }
    } catch {
      // not found
    }

    // Check disabled path
    const disabledName = `${DISABLED_PREFIX}${slug}`;
    const disabledPath = path.join(baseDir, disabledName);
    try {
      const stat = await fs.stat(disabledPath);
      if (stat.isDirectory()) {
        return { dir: baseDir, currentName: disabledName, isDisabled: true };
      }
    } catch {
      // not found
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { slug, enabled } = body as { slug: string; enabled: boolean };

    if (!slug || typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: slug (string), enabled (boolean)" },
        { status: 400 }
      );
    }

    const found = await findSkillDir(slug);
    if (!found) {
      return NextResponse.json(
        { error: `Skill not found: ${slug}` },
        { status: 404 }
      );
    }

    const { dir, currentName, isDisabled } = found;
    const currentPath = path.join(dir, currentName);

    if (enabled && isDisabled) {
      // Rename from .disabled-slug to slug
      const newPath = path.join(dir, slug);
      await fs.rename(currentPath, newPath);
      return NextResponse.json({ slug, enabled: true, path: newPath });
    } else if (!enabled && !isDisabled) {
      // Rename from slug to .disabled-slug
      const newName = `${DISABLED_PREFIX}${slug}`;
      const newPath = path.join(dir, newName);
      await fs.rename(currentPath, newPath);
      return NextResponse.json({ slug, enabled: false, path: newPath });
    } else {
      // Already in the desired state
      return NextResponse.json({
        slug,
        enabled,
        message: "Already in desired state",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to toggle skill", detail: String(err) },
      { status: 500 }
    );
  }
}
