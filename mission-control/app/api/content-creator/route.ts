import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import crypto from "crypto";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DATA_PATH = path.join(WS, "data/content-calendar.json");

const ENV_PATH = path.join(WS, ".env");

interface PlatformContent {
  instagram?: { copy: string; hashtags: string[]; mediaType: string };
  linkedin?: { copy: string; hashtags: string[] };
  youtube?: { title: string; description: string; tags: string[] };
  tiktok?: { copy: string; hashtags: string[]; sounds?: string[] };
}

interface ContentRecord {
  id: string;
  topic: string;
  platforms: PlatformContent;
  tone: string;
  contentType: string;
  status: "draft" | "scheduled" | "posted" | "analyzed";
  scheduledFor?: string;
  postedAt?: string;
  createdAt: string;
}

async function readData(): Promise<ContentRecord[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeData(data: ContentRecord[]): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

function getApiKey(): string {
  try {
    const raw = fsSync.readFileSync(ENV_PATH, "utf-8");
    for (const line of raw.split("\n")) {
      if (line.startsWith("ANTHROPIC_API_KEY=")) {
        return line.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {}
  return "";
}

// ── GET ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    let data = await readData();
    const url = req.nextUrl;
    const platform = url.searchParams.get("platform");
    const status = url.searchParams.get("status");
    const month = url.searchParams.get("month");

    if (platform) {
      data = data.filter(
        (r) => r.platforms && platform in r.platforms
      );
    }
    if (status) {
      data = data.filter((r) => r.status === status);
    }
    if (month) {
      data = data.filter(
        (r) => r.scheduledFor && r.scheduledFor.startsWith(month)
      );
    }

    return NextResponse.json({ items: data, total: data.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "generate") {
      return handleGenerate(body);
    }
    if (action === "update") {
      return handleUpdate(body);
    }
    // Default: create
    return handleCreate(body);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function handleCreate(body: Partial<ContentRecord>) {
  const data = await readData();
  const record: ContentRecord = {
    id: body.id || crypto.randomUUID(),
    topic: body.topic || "",
    platforms: body.platforms || {},
    tone: body.tone || "professional",
    contentType: body.contentType || "post",
    status: body.status || "draft",
    scheduledFor: body.scheduledFor,
    postedAt: body.postedAt,
    createdAt: body.createdAt || new Date().toISOString(),
  };
  data.push(record);
  await writeData(data);
  return NextResponse.json({ ok: true, record });
}

async function handleUpdate(body: { id: string; [key: string]: unknown }) {
  const data = await readData();
  const idx = data.findIndex((r) => r.id === body.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const { action: _a, ...updates } = body;
  data[idx] = { ...data[idx], ...updates } as ContentRecord;
  await writeData(data);
  return NextResponse.json({ ok: true, record: data[idx] });
}

async function handleGenerate(body: {
  topic: string;
  platforms: string[];
  tone: string;
  contentType: string;
}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not found in .env" },
      { status: 500 }
    );
  }

  const results: Record<string, unknown> = {};

  for (const platform of body.platforms) {
    const prompt = buildPrompt(platform, body.contentType, body.topic, body.tone);

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      results[platform] = { error: `API error ${resp.status}: ${errText}` };
      continue;
    }

    const json = await resp.json();
    const text =
      json.content?.[0]?.type === "text" ? json.content[0].text : "";

    try {
      // Extract JSON from response (handle possible markdown wrapping)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        results[platform] = JSON.parse(jsonMatch[0]);
      } else {
        results[platform] = { error: "Could not parse response", raw: text };
      }
    } catch {
      results[platform] = { error: "JSON parse failed", raw: text };
    }
  }

  return NextResponse.json({ ok: true, generated: results });
}

function buildPrompt(
  platform: string,
  contentType: string,
  topic: string,
  tone: string
): string {
  const limits: Record<string, string> = {
    instagram: "2200 chars",
    linkedin: "3000 chars",
    youtube: "5000 chars for description",
    tiktok: "2200 chars",
  };

  const outputFormat =
    platform === "youtube"
      ? 'Return ONLY valid JSON with keys: title (string), description (string), tags (string array).'
      : 'Return ONLY valid JSON with keys: copy (string), hashtags (string array).';

  return `Generate a ${platform} ${contentType} about "${topic}" in a ${tone} voice. Include relevant hashtags. Keep within platform character limits (${limits[platform] || "2200 chars"}). ${outputFormat} No markdown, no explanation, just the JSON object.`;
}

// ── DELETE ────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    let data = await readData();
    data = data.filter((r) => r.id !== id);
    await writeData(data);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
