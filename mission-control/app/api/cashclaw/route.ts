import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const CASHCLAW_CONFIG = join(HOME, ".cashclaw/config.json");
const CASHCLAW_EARNINGS = join(HOME, ".cashclaw/earnings.jsonl");
const CASHCLAW_MISSIONS = join(WS, "cashclaw/missions");

async function readJson(path: string): Promise<any> {
  try {
    const text = await readFile(path, "utf-8");
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function readJsonl(path: string): Promise<any[]> {
  try {
    const text = await readFile(path, "utf-8");
    return text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function readDir(path: string): Promise<string[]> {
  try {
    const { readdir } = await import("fs/promises");
    return await readdir(path);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const config = await readJson(CASHCLAW_CONFIG);
    const earnings = await readJsonl(CASHCLAW_EARNINGS);

    // Load mission templates
    const missionFiles = await readDir(CASHCLAW_MISSIONS);
    const missions = [];
    for (const f of missionFiles) {
      if (f.endsWith(".json")) {
        const m = await readJson(join(CASHCLAW_MISSIONS, f));
        if (m) missions.push(m);
      }
    }

    // Calculate earnings summary
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const todayEarnings = earnings
      .filter((e) => e.ts >= todayStart)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const weekEarnings = earnings
      .filter((e) => e.ts >= weekStart)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const monthEarnings = earnings
      .filter((e) => e.ts >= monthStart)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalEarnings = earnings.reduce((sum, e) => sum + (e.amount || 0), 0);

    // Blog-as-a-Service — strip stripe_link from tiers before returning
    const rawBlogService = config?.services?.blog_as_a_service || null;
    const blogService = rawBlogService
      ? {
          ...rawBlogService,
          tiers: Array.isArray(rawBlogService.tiers)
            ? rawBlogService.tiers.map(({ stripe_link, ...tier }: any) => tier)
            : rawBlogService.tiers,
        }
      : null;

    // Strip sensitive data
    const safeConfig = config ? { ...config, stripe: { connected: config.stripe?.connected, mode: config.stripe?.mode } } : null;

    return NextResponse.json({
      config: safeConfig,
      earnings: {
        today: todayEarnings,
        week: weekEarnings,
        month: monthEarnings,
        total: totalEarnings,
        count: earnings.length,
      },
      missions,
      blogService,
      services: config?.services
        ? Object.entries(config.services).map(([key, val]: [string, any]) => ({
            id: key,
            name: val.description,
            enabled: val.enabled,
            pricing: val.pricing,
          }))
        : [],
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load CashClaw data" },
      { status: 500 }
    );
  }
}
