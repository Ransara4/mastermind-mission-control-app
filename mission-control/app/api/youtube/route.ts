import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

// ── Config ──────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(WS, "data/youtube-channels.json");

interface TrackedChannel {
  handle: string;
  label?: string;
}

function getApiKey(): string {
  if (process.env.TRANSCRIPT_API_KEY) return process.env.TRANSCRIPT_API_KEY;
  try {
    const envPath = path.join(WS, ".env");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(/^TRANSCRIPT_API_KEY=(.+)$/m);
    if (match) {
      process.env.TRANSCRIPT_API_KEY = match[1].trim();
      return match[1].trim();
    }
  } catch {}
  return "";
}

function loadChannels(): TrackedChannel[] {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveChannels(channels: TrackedChannel[]) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(channels, null, 2));
}

// ── TranscriptAPI helpers ───────────────────────────────────────────
const BASE = "https://transcriptapi.com/api/v2/youtube";

async function fetchChannel(handle: string, apiKey: string) {
  // channel/latest is FREE — returns up to 15 recent videos with view counts
  const res = await fetch(`${BASE}/channel/latest?channel=${encodeURIComponent(handle)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`channel/latest ${handle}: ${res.status} — ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function searchVideos(query: string, limit: number, apiKey: string) {
  const res = await fetch(
    `${BASE}/search?q=${encodeURIComponent(query)}&type=video&limit=${limit}`,
    { headers: { Authorization: `Bearer ${apiKey}` } }
  );
  if (!res.ok) throw new Error(`search: ${res.status}`);
  return res.json();
}

// ── GET handler ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const apiKey = getApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: "TRANSCRIPT_API_KEY not set in ~/.openclaw/workspace/.env" },
        { status: 401 }
      );
    }

    const action = request.nextUrl.searchParams.get("action") || "dashboard";

    if (action === "dashboard") {
      const channels = loadChannels();
      if (channels.length === 0) {
        return NextResponse.json({
          channels: [],
          message: "No channels tracked yet. Add a channel to get started.",
        });
      }

      // Fetch latest videos for all tracked channels (FREE endpoint)
      const results = await Promise.allSettled(
        channels.map(async (ch) => {
          const data = await fetchChannel(ch.handle, apiKey);
          return { handle: ch.handle, label: ch.label || ch.handle, ...data };
        })
      );

      const channelData = results.map((r, i) => {
        if (r.status === "fulfilled") return r.value;
        return {
          handle: channels[i].handle,
          label: channels[i].label || channels[i].handle,
          error: (r.reason as Error).message,
          videos: [],
        };
      });

      // Compute aggregate stats
      let totalVideos = 0;
      let totalViews = 0;
      let recentVideos: any[] = [];

      for (const ch of channelData) {
        const videos = ch.videos || ch.results || [];
        totalVideos += videos.length;
        for (const v of videos) {
          const views = parseInt(v.viewCount || v.view_count || "0", 10);
          totalViews += views;
          recentVideos.push({
            ...v,
            views,
            channelHandle: ch.handle,
            channelLabel: ch.label,
          });
        }
      }

      // Sort by publish date descending
      recentVideos.sort((a, b) => {
        const da = new Date(a.published || a.publishedAt || 0).getTime();
        const db = new Date(b.published || b.publishedAt || 0).getTime();
        return db - da;
      });

      return NextResponse.json({
        channels: channelData,
        stats: {
          trackedChannels: channels.length,
          totalRecentVideos: totalVideos,
          totalRecentViews: totalViews,
          avgViewsPerVideo: totalVideos > 0 ? Math.round(totalViews / totalVideos) : 0,
        },
        recentVideos: recentVideos.slice(0, 30),
      });
    }

    if (action === "search") {
      const q = request.nextUrl.searchParams.get("q");
      if (!q) {
        return NextResponse.json({ error: "Missing ?q= parameter" }, { status: 400 });
      }
      const limit = parseInt(request.nextUrl.searchParams.get("limit") || "10", 10);
      const data = await searchVideos(q, limit, apiKey);
      return NextResponse.json(data);
    }

    if (action === "channels") {
      return NextResponse.json(loadChannels());
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("YouTube API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ── POST handler (add/remove channels) ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, handle, label } = body;

    if (action === "add") {
      if (!handle) {
        return NextResponse.json({ error: "Missing handle" }, { status: 400 });
      }
      const channels = loadChannels();
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      if (channels.some((c) => c.handle === normalized)) {
        return NextResponse.json({ error: "Channel already tracked" }, { status: 409 });
      }

      // Verify channel exists using resolve (FREE)
      const apiKey = getApiKey();
      if (apiKey) {
        const res = await fetch(
          `${BASE}/channel/resolve?input=${encodeURIComponent(normalized)}`,
          { headers: { Authorization: `Bearer ${apiKey}` } }
        );
        if (!res.ok) {
          return NextResponse.json(
            { error: `Could not resolve channel ${normalized}` },
            { status: 404 }
          );
        }
      }

      channels.push({ handle: normalized, label: label || normalized });
      saveChannels(channels);
      return NextResponse.json({ ok: true, channels });
    }

    if (action === "remove") {
      if (!handle) {
        return NextResponse.json({ error: "Missing handle" }, { status: 400 });
      }
      let channels = loadChannels();
      const normalized = handle.startsWith("@") ? handle : `@${handle}`;
      channels = channels.filter((c) => c.handle !== normalized);
      saveChannels(channels);
      return NextResponse.json({ ok: true, channels });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (err) {
    console.error("YouTube POST error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
