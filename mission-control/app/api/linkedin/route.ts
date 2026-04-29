import { NextRequest, NextResponse } from "next/server";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { join } from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const AGENT_DIR = join(WS, "agents/linkedin");
const CONTENT_FILE = join(AGENT_DIR, "content.json");
const CAROUSELS_DIR = join(AGENT_DIR, "carousels");
const TOKEN_PATH = join(WS, "linkedin-mcp/data/oauth_token.json");

// --- Types ---

export interface ContentItem {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  contentType: "text" | "image" | "carousel" | "video" | "poll" | "document";
  status: "idea" | "draft" | "scheduled" | "published" | "archived";
  hook?: string; // Opening line / hook
  cta?: string; // Call to action
  targetAudience?: string;
  notes?: string;
  scheduledFor?: string; // ISO date
  publishedAt?: string;
  linkedinPostId?: string;
  linkedinPostUrl?: string;
  analytics?: {
    impressions?: number;
    likes?: number;
    comments?: number;
    shares?: number;
    clicks?: number;
    engagementRate?: number;
    lastFetched?: string;
  };
  pillar?: string; // Which content pillar this belongs to
  carouselId?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

interface ProjectContext {
  name: string;
  url?: string;
  mission: string;
  targetAudience: string;
  pillars: { name: string; themes: string[] }[];
  voice: {
    tone: string[];
    avoid: string[];
    engagingHooks: string[];
  };
  icp: {
    revenue: string;
    employees: string;
    industries: string[];
    painPoints: string[];
    buyingSignals: string[];
  };
}

interface ContentStore {
  project?: ProjectContext;
  items: ContentItem[];
  hashtagSets: Record<string, string[]>;
  settings: {
    defaultHashtags: string[];
    postingDays: string[];
    postingTimes: string[];
    autoArchiveDays: number;
  };
}

// --- Helpers ---

function ensureDirs() {
  for (const dir of [AGENT_DIR, CAROUSELS_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function loadStore(): ContentStore {
  ensureDirs();
  if (!existsSync(CONTENT_FILE)) {
    const empty: ContentStore = {
      items: [],
      hashtagSets: {
        ai: [
          "#AI",
          "#ArtificialIntelligence",
          "#MachineLearning",
          "#DeepLearning",
          "#GenerativeAI",
        ],
        startup: [
          "#Startup",
          "#Entrepreneurship",
          "#Founder",
          "#StartupLife",
          "#Innovation",
        ],
        career: [
          "#Career",
          "#Leadership",
          "#ProfessionalDevelopment",
          "#Growth",
          "#Mentorship",
        ],
        tech: [
          "#Technology",
          "#SoftwareEngineering",
          "#Coding",
          "#Developer",
          "#TechIndustry",
        ],
      },
      settings: {
        defaultHashtags: [],
        postingDays: ["Monday", "Wednesday", "Friday"],
        postingTimes: ["09:00", "12:00"],
        autoArchiveDays: 30,
      },
    };
    writeFileSync(CONTENT_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  return JSON.parse(readFileSync(CONTENT_FILE, "utf-8"));
}

function saveStore(store: ContentStore) {
  ensureDirs();
  writeFileSync(CONTENT_FILE, JSON.stringify(store, null, 2));
}

function getAuthStatus() {
  try {
    if (existsSync(TOKEN_PATH)) {
      const token = JSON.parse(readFileSync(TOKEN_PATH, "utf-8"));
      const expiresAt = token.expires_at || 0;
      const isValid = expiresAt > Date.now() / 1000;
      return { authenticated: true, valid: isValid, expiresAt };
    }
    return { authenticated: false, valid: false };
  } catch {
    return { authenticated: false, valid: false };
  }
}

function getCarousels() {
  if (!existsSync(CAROUSELS_DIR)) return [];
  return readdirSync(CAROUSELS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      try {
        const data = JSON.parse(
          readFileSync(join(CAROUSELS_DIR, f), "utf-8")
        );
        return {
          id: f.replace(".json", ""),
          ...data,
          hasPdf: existsSync(
            join(CAROUSELS_DIR, f.replace(".json", ".pdf"))
          ),
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function generateId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

const WRITER_FILES: Record<string, string> = {
  "hook-writer": join(AGENT_DIR, "hook-writer.md"),
  "search-writer": join(AGENT_DIR, "search-writer.md"),
};

function getWriterFiles(): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, path] of Object.entries(WRITER_FILES)) {
    try {
      if (existsSync(path)) {
        result[key] = readFileSync(path, "utf-8");
      }
    } catch {
      // skip
    }
  }
  return result;
}

// --- API ---

export async function GET(_req: NextRequest) {
  try {
    const store = loadStore();
    const auth = getAuthStatus();
    const carousels = getCarousels();
    const writers = getWriterFiles();

    // Compute pipeline stats
    const byStatus = {
      idea: 0,
      draft: 0,
      scheduled: 0,
      published: 0,
      archived: 0,
    };
    for (const item of store.items) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1;
    }

    // Compute content type breakdown
    const byType: Record<string, number> = {};
    for (const item of store.items) {
      byType[item.contentType] = (byType[item.contentType] || 0) + 1;
    }

    // Upcoming scheduled posts (next 7 days)
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = store.items
      .filter(
        (i) =>
          i.status === "scheduled" &&
          i.scheduledFor &&
          new Date(i.scheduledFor) >= now &&
          new Date(i.scheduledFor) <= weekFromNow
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledFor!).getTime() -
          new Date(b.scheduledFor!).getTime()
      );

    // Recent published with analytics
    const recentPublished = store.items
      .filter((i) => i.status === "published")
      .sort(
        (a, b) =>
          new Date(b.publishedAt || b.updatedAt).getTime() -
          new Date(a.publishedAt || a.updatedAt).getTime()
      )
      .slice(0, 10);

    // Aggregate analytics
    const totalAnalytics = recentPublished.reduce(
      (acc, item) => {
        if (item.analytics) {
          acc.impressions += item.analytics.impressions || 0;
          acc.likes += item.analytics.likes || 0;
          acc.comments += item.analytics.comments || 0;
          acc.shares += item.analytics.shares || 0;
          acc.clicks += item.analytics.clicks || 0;
        }
        return acc;
      },
      { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 }
    );

    return NextResponse.json({
      auth,
      project: store.project || null,
      items: store.items.filter((i) => i.status !== "archived"),
      archived: store.items.filter((i) => i.status === "archived"),
      carousels,
      hashtagSets: store.hashtagSets,
      writers,
      settings: store.settings,
      stats: {
        pipeline: byStatus,
        contentTypes: byType,
        total: store.items.length,
        upcoming,
        recentPublished,
        analytics: totalAnalytics,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load LinkedIn data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const store = loadStore();

    switch (action) {
      // --- Content CRUD ---

      case "create": {
        const { title, body: postBody, hashtags, contentType, status, hook, cta, targetAudience, notes, scheduledFor } = body;
        const maxOrder = store.items
          .filter((i) => i.status === (status || "idea"))
          .reduce((max, i) => Math.max(max, i.order || 0), -1);

        const item: ContentItem = {
          id: generateId(),
          title: title || "Untitled Post",
          body: postBody || "",
          hashtags: hashtags || [],
          contentType: contentType || "text",
          status: status || "idea",
          hook: hook || "",
          cta: cta || "",
          targetAudience: targetAudience || "",
          notes: notes || "",
          scheduledFor,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: maxOrder + 1,
        };
        store.items.push(item);
        saveStore(store);
        return NextResponse.json({ success: true, item });
      }

      case "update": {
        const { id, ...updates } = body;
        const idx = store.items.findIndex((i) => i.id === id);
        if (idx === -1)
          return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Don't allow overwriting these via generic update
        delete updates.action;
        delete updates.createdAt;

        store.items[idx] = {
          ...store.items[idx],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        saveStore(store);
        return NextResponse.json({ success: true, item: store.items[idx] });
      }

      case "delete": {
        const { id } = body;
        store.items = store.items.filter((i) => i.id !== id);
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      // --- Pipeline Actions ---

      case "move": {
        const { id, status: newStatus, order: newOrder } = body;
        const idx = store.items.findIndex((i) => i.id === id);
        if (idx === -1)
          return NextResponse.json({ error: "Not found" }, { status: 404 });

        store.items[idx].status = newStatus;
        if (newOrder !== undefined) store.items[idx].order = newOrder;
        store.items[idx].updatedAt = new Date().toISOString();

        if (newStatus === "published" && !store.items[idx].publishedAt) {
          store.items[idx].publishedAt = new Date().toISOString();
        }

        saveStore(store);
        return NextResponse.json({ success: true, item: store.items[idx] });
      }

      case "reorder": {
        const { items: reorderItems } = body; // [{id, order}]
        for (const { id, order } of reorderItems) {
          const idx = store.items.findIndex((i) => i.id === id);
          if (idx !== -1) store.items[idx].order = order;
        }
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      case "bulk-move": {
        const { ids, status: bulkStatus } = body;
        for (const id of ids) {
          const idx = store.items.findIndex((i) => i.id === id);
          if (idx !== -1) {
            store.items[idx].status = bulkStatus;
            store.items[idx].updatedAt = new Date().toISOString();
            if (bulkStatus === "published" && !store.items[idx].publishedAt) {
              store.items[idx].publishedAt = new Date().toISOString();
            }
          }
        }
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      // --- Analytics ---

      case "update-analytics": {
        const { id, analytics } = body;
        const idx = store.items.findIndex((i) => i.id === id);
        if (idx === -1)
          return NextResponse.json({ error: "Not found" }, { status: 404 });

        store.items[idx].analytics = {
          ...store.items[idx].analytics,
          ...analytics,
          lastFetched: new Date().toISOString(),
        };
        store.items[idx].updatedAt = new Date().toISOString();
        saveStore(store);
        return NextResponse.json({ success: true, item: store.items[idx] });
      }

      // --- Hashtag Sets ---

      case "save-hashtag-set": {
        const { name, hashtags } = body;
        store.hashtagSets[name] = hashtags;
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      case "delete-hashtag-set": {
        const { name } = body;
        delete store.hashtagSets[name];
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      // --- Writer Files ---

      case "save-writer": {
        const { file, content } = body;
        const writerPath = WRITER_FILES[file];
        if (!writerPath) {
          return NextResponse.json(
            { error: `Unknown writer file: ${file}` },
            { status: 400 }
          );
        }
        writeFileSync(writerPath, content, "utf-8");
        return NextResponse.json({ success: true });
      }

      // --- Project Context ---

      case "update-project": {
        const { project } = body;
        store.project = { ...store.project, ...project };
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      // --- Settings ---

      case "update-settings": {
        const { settings } = body;
        store.settings = { ...store.settings, ...settings };
        saveStore(store);
        return NextResponse.json({ success: true });
      }

      // --- Import ---

      case "import-ideas": {
        // Bulk import ideas from text (one per line or JSON array)
        const { text, ideas } = body;
        let newIdeas: string[] = [];

        if (ideas && Array.isArray(ideas)) {
          newIdeas = ideas;
        } else if (text) {
          newIdeas = text
            .split("\n")
            .map((l: string) => l.trim())
            .filter((l: string) => l.length > 0);
        }

        const maxOrder = store.items
          .filter((i) => i.status === "idea")
          .reduce((max, i) => Math.max(max, i.order || 0), -1);

        const created: ContentItem[] = newIdeas.map((idea, i) => ({
          id: generateId(),
          title: idea.length > 80 ? idea.slice(0, 80) + "..." : idea,
          body: idea,
          hashtags: [],
          contentType: "text" as const,
          status: "idea" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          order: maxOrder + 1 + i,
        }));

        store.items.push(...created);
        saveStore(store);
        return NextResponse.json({
          success: true,
          count: created.length,
          items: created,
        });
      }

      // --- Legacy carousel support ---

      case "generate-carousel": {
        const { slidesData } = body;
        const id = `carousel-${Date.now()}`;
        const jsonPath = join(CAROUSELS_DIR, `${id}.json`);
        const dataWithMeta = {
          ...slidesData,
          id,
          createdAt: new Date().toISOString(),
          status: "generated",
        };
        writeFileSync(jsonPath, JSON.stringify(dataWithMeta, null, 2));
        return NextResponse.json({ success: true, id });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Action failed" },
      { status: 500 }
    );
  }
}
