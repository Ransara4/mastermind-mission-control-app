import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const POST_LOG_PATH = path.join(WS, "agents/postpilot/data/post-log.json");

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

async function readPostLog(): Promise<PostLogEntry[]> {
  try {
    const raw = await fs.readFile(POST_LOG_PATH, "utf-8");
    return JSON.parse(raw) as PostLogEntry[];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  let posts = await readPostLog();

  if (clientId) {
    posts = posts.filter((p) => p.clientId === clientId);
  }

  if (status) {
    posts = posts.filter((p) => p.status === status);
  }

  // Sort by publishedAt descending
  posts.sort(
    (a, b) =>
      new Date(b.publishedAt ?? 0).getTime() - new Date(a.publishedAt ?? 0).getTime()
  );

  // Apply limit
  posts = posts.slice(0, limit);

  return NextResponse.json(posts);
}
