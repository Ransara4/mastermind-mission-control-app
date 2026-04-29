import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { SkillsRegistry, SkillsDashboard, SkillType } from "@/lib/skills-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const REGISTRY_PATH = path.join(WS, "skills-registry.json");

function emptyDashboard(): SkillsDashboard {
  return {
    registry: { version: "1.0.0", lastUpdated: new Date().toISOString(), skills: [] },
    stats: {
      total: 0,
      active: 0,
      inactive: 0,
      error: 0,
      byType: {
        "credential-manager": 0,
        agent: 0,
        skill: 0,
        integration: 0,
        tool: 0,
      },
    },
  };
}

export async function GET() {
  try {
    const raw = await fs.readFile(REGISTRY_PATH, "utf-8");
    const registry: SkillsRegistry = JSON.parse(raw);

    const byType: Record<SkillType, number> = {
      "credential-manager": 0,
      agent: 0,
      skill: 0,
      integration: 0,
      tool: 0,
    };

    let active = 0;
    let inactive = 0;
    let error = 0;

    for (const skill of registry.skills) {
      if (skill.status === "active") active++;
      else if (skill.status === "inactive") inactive++;
      else if (skill.status === "error") error++;

      if (skill.type in byType) {
        byType[skill.type as SkillType]++;
      }
    }

    const dashboard: SkillsDashboard = {
      registry,
      stats: {
        total: registry.skills.length,
        active,
        inactive,
        error,
        byType,
      },
    };

    return NextResponse.json(dashboard);
  } catch {
    return NextResponse.json(emptyDashboard());
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, skill } = body;

    const raw = await fs.readFile(REGISTRY_PATH, "utf-8");
    const registry: SkillsRegistry = JSON.parse(raw);

    if (action === "add") {
      const exists = registry.skills.find((s) => s.id === skill.id);
      if (exists) {
        return NextResponse.json({ error: "Skill already exists" }, { status: 409 });
      }
      registry.skills.push(skill);
    } else if (action === "remove") {
      registry.skills = registry.skills.filter((s) => s.id !== skill.id);
    } else if (action === "update") {
      const idx = registry.skills.findIndex((s) => s.id === skill.id);
      if (idx === -1) {
        return NextResponse.json({ error: "Skill not found" }, { status: 404 });
      }
      registry.skills[idx] = { ...registry.skills[idx], ...skill };
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    registry.lastUpdated = new Date().toISOString();
    await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));

    return NextResponse.json({ success: true, registry });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
