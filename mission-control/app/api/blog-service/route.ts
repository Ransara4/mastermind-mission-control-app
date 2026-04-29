import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DATA_DIR = path.join(WS, "agents/postpilot/data");

interface Client {
  id: string;
  name: string;
  tier?: "Starter" | "Growth" | "Agency";
  status?: "active" | "paused" | "inactive";
  platform?: string;
  monthlyFee?: number;
  postsPerWeek?: number;
  lastPost?: string | null;
  nextRun?: string | null;
  createdAt?: string;
}

interface PostLogEntry {
  id: string;
  clientId?: string;
  clientName?: string;
  title?: string;
  platform?: string;
  status?: "published" | "draft" | "failed";
  publishedAt?: string;
  url?: string;
  seoScore?: number;
}

interface StatusJson {
  status?: "idle" | "running" | "error";
  activeClients?: number;
  postsToday?: number;
  totalPostsPublished?: number;
  lastRun?: string | null;
  updatedAt?: string | null;
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function isThisWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return date >= weekStart;
}

function isLastWeek(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - now.getDay());
  thisWeekStart.setHours(0, 0, 0, 0);
  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  return date >= lastWeekStart && date < thisWeekStart;
}

function isThisMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function computeNextRunIn(): number {
  const now = new Date();
  const next5am = new Date(now);
  next5am.setUTCHours(5, 0, 0, 0);
  if (next5am <= now) {
    next5am.setUTCDate(next5am.getUTCDate() + 1);
  }
  return Math.round((next5am.getTime() - now.getTime()) / 60000);
}

function computeWeeklyChart(posts: PostLogEntry[]): { day: string; count: number }[] {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const result: { day: string; count: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = posts.filter((p) => {
      if (!p.publishedAt) return false;
      const pd = new Date(p.publishedAt);
      return pd >= d && pd < next;
    }).length;
    result.push({ day: days[d.getDay()], count });
  }
  return result;
}

function avgSeoScore(posts: PostLogEntry[]): number {
  const scored = posts.filter((p) => typeof p.seoScore === "number");
  if (scored.length === 0) return 0;
  return Math.round(scored.reduce((sum, p) => sum + (p.seoScore ?? 0), 0) / scored.length);
}

export async function GET() {
  const [clients, postLog, agentStatus] = await Promise.all([
    readJson<Client[]>(path.join(DATA_DIR, "clients.json"), []),
    readJson<PostLogEntry[]>(path.join(DATA_DIR, "post-log.json"), []),
    readJson<StatusJson>(
      path.join(WS, "agents/postpilot/status.json"),
      {}
    ),
  ]);

  const publishedPosts = postLog.filter((p) => p.status === "published" || !p.status);
  const postsToday = publishedPosts.filter((p) => p.publishedAt && isToday(p.publishedAt)).length;
  const postsThisWeek = publishedPosts.filter((p) => p.publishedAt && isThisWeek(p.publishedAt)).length;
  const postsThisMonth = publishedPosts.filter((p) => p.publishedAt && isThisMonth(p.publishedAt)).length;
  const totalPosts = publishedPosts.length;

  const activeClients = clients.filter((c) => !c.status || c.status === "active").length;
  const mrr = clients
    .filter((c) => !c.status || c.status === "active")
    .reduce((sum, c) => sum + (c.monthlyFee ?? 0), 0);

  // Content quality metrics
  const thisWeekPosts = publishedPosts.filter((p) => p.publishedAt && isThisWeek(p.publishedAt));
  const lastWeekPosts = publishedPosts.filter((p) => p.publishedAt && isLastWeek(p.publishedAt));
  const thisWeekAvgScore = avgSeoScore(thisWeekPosts);
  const lastWeekAvgScore = avgSeoScore(lastWeekPosts);
  const postsAbove70ThisWeek = thisWeekPosts.filter((p) => (p.seoScore ?? 0) >= 70).length;
  const scoreImproving = thisWeekAvgScore > 0 && lastWeekAvgScore > 0 && thisWeekAvgScore > lastWeekAvgScore;
  const overallAvgScore = avgSeoScore(publishedPosts);

  // Revenue breakdown
  const activeClientsList = clients.filter((c) => !c.status || c.status === "active");
  const revenueBreakdown = {
    starter: activeClientsList.filter((c) => c.tier === "Starter").length,
    growth: activeClientsList.filter((c) => c.tier === "Growth").length,
    agency: activeClientsList.filter((c) => c.tier === "Agency").length,
  };

  // Enrich clients with post counts + contentScoreAvg
  const enrichedClients = clients.map((client) => {
    const clientPosts = publishedPosts.filter(
      (p) => p.clientId === client.id || p.clientName === client.name
    );
    const clientPostsToday = clientPosts.filter(
      (p) => p.publishedAt && isToday(p.publishedAt)
    ).length;
    const sortedPosts = [...clientPosts].sort(
      (a, b) => new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
    );
    const lastPost = sortedPosts.length > 0 ? (sortedPosts[0].publishedAt ?? null) : null;
    const contentScoreAvg = avgSeoScore(clientPosts);
    return { ...client, postsToday: clientPostsToday, lastPost, contentScoreAvg };
  });

  const recentPosts = [...postLog]
    .sort(
      (a, b) =>
        new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
    )
    .slice(0, 10);

  const nextScheduledRuns = clients
    .filter((c) => c.nextRun && (!c.status || c.status === "active"))
    .map((c) => ({ clientId: c.id, clientName: c.name, nextRun: c.nextRun }))
    .sort((a, b) => new Date(a.nextRun!).getTime() - new Date(b.nextRun!).getTime())
    .slice(0, 5);

  return NextResponse.json({
    status: agentStatus.status ?? "idle",
    activeClients,
    postsToday,
    postsThisWeek,
    postsThisMonth,
    totalPosts,
    mrr,
    clients: enrichedClients,
    recentPosts,
    nextScheduledRuns,
    lastRun: agentStatus.lastRun ?? null,
    // New fields
    nextRunIn: computeNextRunIn(),
    weeklyPostsChart: computeWeeklyChart(publishedPosts),
    contentQuality: {
      overallAvgScore,
      thisWeekAvgScore,
      lastWeekAvgScore,
      postsAbove70ThisWeek,
      scoreImproving,
    },
    revenueBreakdown,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "run-now") {
      return NextResponse.json({ success: true, message: "Run triggered (no-op in UI)" });
    }

    if (action === "pause-client") {
      const { clientId } = body;
      const clients = await readJson<Client[]>(path.join(DATA_DIR, "clients.json"), []);
      const updated = clients.map((c) =>
        c.id === clientId ? { ...c, status: "paused" as const } : c
      );
      await fs.writeFile(path.join(DATA_DIR, "clients.json"), JSON.stringify(updated, null, 2));
      return NextResponse.json({ success: true });
    }

    if (action === "resume-client") {
      const { clientId } = body;
      const clients = await readJson<Client[]>(path.join(DATA_DIR, "clients.json"), []);
      const updated = clients.map((c) =>
        c.id === clientId ? { ...c, status: "active" as const } : c
      );
      await fs.writeFile(path.join(DATA_DIR, "clients.json"), JSON.stringify(updated, null, 2));
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
