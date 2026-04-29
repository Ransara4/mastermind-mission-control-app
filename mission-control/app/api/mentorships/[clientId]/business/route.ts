import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const MENTORSHIPS_BASE = path.join(WS, "projects/mentorships");
const DB_PATH = path.join(MENTORSHIPS_BASE, "mentorships-db.json");

async function getClientFolder(clientId: string): Promise<string | null> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    const db = JSON.parse(raw);
    const client = db.clients?.find((c: { id: string }) => c.id === clientId);
    if (!client) return null;
    return client.name.toUpperCase();
  } catch {
    return null;
  }
}

const DEFAULT_TEMPLATE = `# Business Overview
Brief description of the business, industry, and what they do.

# Products & Services
What they sell or offer, pricing tiers, key offerings.

# Target Audience
Who their customers are, demographics, psychographics, pain points.

# Business Model & Revenue
How the business makes money. Revenue streams, approximate revenue or stage.

# Current Challenges
What problems they're facing right now. Operational, marketing, mindset, team.

# Goals & Vision
Short-term goals (3–6 months), long-term vision, what success looks like for them.

# Marketing & Sales
Current channels, what's working, what isn't, lead generation strategy.

# Team & Operations
Solo or team? Key hires, gaps, operational bottlenecks.

# Key Tools & Platforms
Software, platforms, automations they use or want to use.

# Notes & Observations
Anything else worth knowing — patterns noticed, things to follow up on.
`;

// GET /api/mentorships/[clientId]/business
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const folder = await getClientFolder(clientId);
  if (!folder) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const filePath = path.join(MENTORSHIPS_BASE, folder, "business.md");

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return NextResponse.json({ content });
  } catch {
    // File doesn't exist yet — return the default template
    return NextResponse.json({ content: DEFAULT_TEMPLATE });
  }
}

// PUT /api/mentorships/[clientId]/business
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params;

  const folder = await getClientFolder(clientId);
  if (!folder) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  let body: { content: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { content } = body;
  if (content === undefined) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const clientDir = path.join(MENTORSHIPS_BASE, folder);
  const filePath = path.join(clientDir, "business.md");

  await fs.mkdir(clientDir, { recursive: true });
  await fs.writeFile(filePath, content, "utf-8");

  return NextResponse.json({ ok: true });
}
