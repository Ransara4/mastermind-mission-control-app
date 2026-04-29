import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CLIENTS_PATH = path.join(WS, "agents/postpilot/data/clients.json");

interface Client {
  id: string;
  name: string;
  website?: string;
  tier?: "Starter" | "Growth" | "Agency";
  status?: "active" | "paused" | "inactive";
  platform?: string;
  monthlyFee?: number;
  publishWindowStart?: string;
  publishWindowEnd?: string;
  timezone?: string;
  postsPerDay?: number;
  gscPropertyId?: string;

  // Content Strategy
  icp?: string;
  goals?: string;
  targetAudience?: string;
  tone?: string;
  contentPillars?: string[];
  contentRules?: string[];
  keywordFocus?: string[];
  competitorExclusions?: string[];
  ctaPrimary?: string;
  ctaSecondary?: string;
  minWordCount?: number;
  maxWordCount?: number;

  // CMS credentials
  cms?: {
    platform?: string;
    apiUrl?: string;
    username?: string;
    applicationPassword?: string;
    siteId?: string;
    apiKey?: string;
  };

  // Runtime stats
  postsToday?: number;
  lastPost?: string | null;
  contentScoreAvg?: number;
  createdAt?: string;
}

async function readClients(): Promise<Client[]> {
  try {
    const raw = await fs.readFile(CLIENTS_PATH, "utf-8");
    return JSON.parse(raw) as Client[];
  } catch {
    return [];
  }
}

async function writeClients(clients: Client[]): Promise<void> {
  await fs.mkdir(path.dirname(CLIENTS_PATH), { recursive: true });
  await fs.writeFile(CLIENTS_PATH, JSON.stringify(clients, null, 2));
}

export async function GET() {
  const clients = await readClients();
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "add") {
      const {
        name, website, tier, platform, monthlyFee,
        publishWindowStart, publishWindowEnd, timezone, postsPerDay,
        gscPropertyId, icp, goals, targetAudience, tone,
        contentPillars, contentRules, keywordFocus, competitorExclusions,
        ctaPrimary, ctaSecondary, minWordCount, maxWordCount,
      } = body;

      if (!name) {
        return NextResponse.json({ error: "Name is required" }, { status: 400 });
      }

      const clients = await readClients();
      const newClient: Client = {
        id: crypto.randomUUID(),
        name,
        website: website || undefined,
        tier: tier || "Starter",
        platform: platform || "wordpress",
        monthlyFee: monthlyFee ?? 0,
        publishWindowStart: publishWindowStart || "06:00",
        publishWindowEnd: publishWindowEnd || "09:00",
        timezone: timezone || "America/New_York",
        postsPerDay: postsPerDay ?? 1,
        gscPropertyId: gscPropertyId || undefined,
        icp: icp || undefined,
        goals: goals || undefined,
        targetAudience: targetAudience || undefined,
        tone: tone || undefined,
        contentPillars: contentPillars?.length ? contentPillars : undefined,
        contentRules: contentRules?.length ? contentRules : undefined,
        keywordFocus: keywordFocus?.length ? keywordFocus : undefined,
        competitorExclusions: competitorExclusions?.length ? competitorExclusions : undefined,
        ctaPrimary: ctaPrimary || undefined,
        ctaSecondary: ctaSecondary || undefined,
        minWordCount: minWordCount ?? 800,
        maxWordCount: maxWordCount ?? 1200,
        status: "active",
        postsToday: 0,
        contentScoreAvg: 0,
        createdAt: new Date().toISOString(),
      };
      clients.push(newClient);
      await writeClients(clients);
      return NextResponse.json({ success: true, client: newClient });
    }

    if (action === "pause") {
      const { clientId } = body;
      if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
      const clients = await readClients();
      await writeClients(clients.map((c) => c.id === clientId ? { ...c, status: "paused" as const } : c));
      return NextResponse.json({ success: true });
    }

    if (action === "resume") {
      const { clientId } = body;
      if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
      const clients = await readClients();
      await writeClients(clients.map((c) => c.id === clientId ? { ...c, status: "active" as const } : c));
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { clientId } = body;
      if (!clientId) return NextResponse.json({ error: "clientId is required" }, { status: 400 });
      const clients = await readClients();
      await writeClients(clients.filter((c) => c.id !== clientId));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
