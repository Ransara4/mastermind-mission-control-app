import { NextRequest, NextResponse } from "next/server";
import { spawnSync } from "child_process";
import os from "os";

const HOME = os.homedir();

const CLAUDE_BIN = "/opt/homebrew/bin/claude";

const CLAUDE_ENV = () => {
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;
  env.PATH = `/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${process.env.PATH || ""}`;
  env.HOME = HOME;
  return env;
};

interface SuggestRequest {
  domain: string;
  type: "title" | "description";
  currentValue: string;
  pageUrl: string;
  keywords?: string[];
}

interface SuggestResponse {
  suggestions: string[];
  type: "title" | "description";
  input: string;
  error?: string;
}

function buildPrompt(req: SuggestRequest): string {
  const charCount = req.currentValue.length;

  if (req.type === "title") {
    const keywordsLine = req.keywords?.length
      ? ` Keywords: ${req.keywords.join(", ")}.`
      : "";
    return (
      `Generate 3 SEO-optimized page title options. Rules: 50-60 chars, ` +
      `include primary keyword near start, compelling for clicks, no ALL CAPS. ` +
      `Current title: '${req.currentValue}' (${charCount} chars, needs to be 50-60). ` +
      `Page: ${req.pageUrl}. Site: ${req.domain}.${keywordsLine} ` +
      `Return only 3 options, one per line, no numbering or bullet points.`
    );
  }

  return (
    `Generate 3 meta description options. Rules: 150-160 chars, ` +
    `include primary keyword, end with a CTA. ` +
    `Current: '${req.currentValue}' (${charCount} chars). ` +
    `Page: ${req.pageUrl}. Site: ${req.domain}. ` +
    `Return only 3 options, one per line, no numbering or bullet points.`
  );
}

function parseSuggestions(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, 3);
}

export async function POST(request: NextRequest) {
  try {
    const body: SuggestRequest = await request.json();

    if (!body.domain || typeof body.domain !== "string") {
      return NextResponse.json(
        { suggestions: [], type: body.type, input: body.currentValue, error: "Missing domain" },
        { status: 400 },
      );
    }

    if (body.type !== "title" && body.type !== "description") {
      return NextResponse.json(
        { suggestions: [], type: body.type, input: body.currentValue, error: "Type must be 'title' or 'description'" },
        { status: 400 },
      );
    }

    if (!body.currentValue || typeof body.currentValue !== "string") {
      return NextResponse.json(
        { suggestions: [], type: body.type, input: "", error: "Missing currentValue" },
        { status: 400 },
      );
    }

    if (!body.pageUrl || typeof body.pageUrl !== "string") {
      return NextResponse.json(
        { suggestions: [], type: body.type, input: body.currentValue, error: "Missing pageUrl" },
        { status: 400 },
      );
    }

    const prompt = buildPrompt(body);

    const proc = spawnSync(
      CLAUDE_BIN,
      ["-p", "--model", "claude-haiku-4-5-20251001"],
      {
        input: prompt,
        encoding: "utf-8",
        timeout: 60000,
        env: CLAUDE_ENV(),
      }
    );

    if (proc.error || proc.status !== 0) {
      const response: SuggestResponse = {
        suggestions: [],
        type: body.type,
        input: body.currentValue,
        error: "Suggestion generation failed",
      };
      return NextResponse.json(response, { status: 500 });
    }

    const suggestions = parseSuggestions(proc.stdout.trim());

    const response: SuggestResponse = {
      suggestions,
      type: body.type,
      input: body.currentValue,
    };

    return NextResponse.json(response);
  } catch (err: any) {
    console.error("SEO suggest error:", err);
    const response: SuggestResponse = {
      suggestions: [],
      type: "title",
      input: "",
      error: err.message || "Suggestion generation failed",
    };
    return NextResponse.json(response, { status: 500 });
  }
}
