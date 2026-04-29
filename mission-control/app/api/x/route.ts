import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/x");

async function readJson(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topicFilter = searchParams.get("topic");

  try {
    const [config, feedCache, postQueue] = await Promise.all([
      readJson(path.join(AGENT_DIR, "config/config.json")),
      readJson(path.join(AGENT_DIR, "data/feed-cache.json")),
      readJson(path.join(AGENT_DIR, "data/post-queue.json")),
    ]);

    // Build topics with item counts from feed cache
    const topics = (config?.topics || []).map(
      (t: { id: string; name: string; description: string; keywords: string[]; accounts: string[]; priority: string; enabled: boolean }) => ({
        ...t,
        itemCount: (feedCache?.items || []).filter(
          (item: { topicId: string }) => item.topicId === t.id
        ).length,
      })
    );

    // Filter feed items by topic if requested
    let feedItems = feedCache?.items || [];
    if (topicFilter) {
      feedItems = feedItems.filter(
        (item: { topicId: string }) => item.topicId === topicFilter
      );
    }

    // Build topic breakdown
    const topicBreakdown = topics.map(
      (t: { id: string; name: string; itemCount: number }) => ({
        topicId: t.id,
        topicName: t.name,
        count: t.itemCount,
      })
    );

    const dashboard = {
      auth: config?.auth || { connected: false },
      feed: {
        lastUpdated: feedCache?.lastUpdated || null,
        items: feedItems,
        topicBreakdown,
      },
      queue: {
        drafts: postQueue?.drafts || [],
        scheduled: postQueue?.queue || [],
        posted: postQueue?.posted || [],
      },
      analytics: {
        overview: {
          totalPosts: (postQueue?.posted || []).length,
          totalImpressions: 0,
          totalEngagements: 0,
          engagementRate: 0,
          followersGained: 0,
        },
        recentPerformance: [],
        topPosts: [],
      },
      topics,
      postingRules: config?.postingRules || {},
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("X API error:", error);
    return NextResponse.json(
      { error: "Failed to load X dashboard data" },
      { status: 500 }
    );
  }
}

// Save a new draft or update post queue
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    const queuePath = path.join(AGENT_DIR, "data/post-queue.json");
    const queue = (await readJson(queuePath)) || {
      queue: [],
      posted: [],
      drafts: [],
    };

    if (action === "save-draft") {
      const draft = {
        id: `draft-${Date.now()}`,
        content: body.content,
        type: body.type || "tweet",
        threadParts: body.threadParts,
        status: "draft",
        ruleViolations: validatePost(body.content, body.rules),
        createdAt: new Date().toISOString(),
      };
      queue.drafts.push(draft);
      await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
      return NextResponse.json({ success: true, draft });
    }

    if (action === "schedule") {
      const scheduled = {
        id: `sched-${Date.now()}`,
        content: body.content,
        type: body.type || "tweet",
        threadParts: body.threadParts,
        scheduledFor: body.scheduledFor,
        status: "scheduled",
        ruleViolations: validatePost(body.content, body.rules),
        createdAt: new Date().toISOString(),
      };
      queue.queue.push(scheduled);
      await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
      return NextResponse.json({ success: true, scheduled });
    }

    if (action === "delete-draft") {
      queue.drafts = queue.drafts.filter(
        (d: { id: string }) => d.id !== body.draftId
      );
      await fs.writeFile(queuePath, JSON.stringify(queue, null, 2));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("X POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

function validatePost(
  content: string,
  rules?: { maxHashtags?: number }
): string[] {
  const violations: string[] = [];

  if (!content || content.trim().length === 0) {
    violations.push("Post content is empty");
  }

  if (content && content.length > 280) {
    violations.push(`Post exceeds 280 characters (${content.length})`);
  }

  // Check hashtag count
  const hashtags = (content || "").match(/#\w+/g) || [];
  const maxHashtags = rules?.maxHashtags || 2;
  if (hashtags.length > maxHashtags) {
    violations.push(`Too many hashtags (${hashtags.length}/${maxHashtags})`);
  }

  // Check for engagement bait phrases
  const baitPhrases = [
    "like if you agree",
    "retweet if",
    "follow for more",
    "drop a",
    "comment below",
  ];
  const lower = (content || "").toLowerCase();
  for (const phrase of baitPhrases) {
    if (lower.includes(phrase)) {
      violations.push(`Engagement bait detected: "${phrase}"`);
    }
  }

  return violations;
}
