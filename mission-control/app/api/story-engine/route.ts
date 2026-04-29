import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const exec = promisify(execFile);

const AGENT_DIR = path.join(WS, "agents/story-engine");
const DATA_DIR = path.join(AGENT_DIR, "data");

export async function GET() {
  try {
    // Read history and status directly for speed
    const historyPath = path.join(DATA_DIR, "history.json");
    const statusPath = path.join(DATA_DIR, "status.json");
    const configPath = path.join(AGENT_DIR, "config/config.json");

    const history = fs.existsSync(historyPath)
      ? JSON.parse(fs.readFileSync(historyPath, "utf-8"))
      : [];
    const status = fs.existsSync(statusPath)
      ? JSON.parse(fs.readFileSync(statusPath, "utf-8"))
      : { status: "idle", totalStories: 0 };
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf-8"))
      : {};

    // Compute stats
    const themes: Record<string, number> = {};
    const challenges: Record<string, number> = {};
    const children = new Set<string>();
    let totalTokens = 0;

    for (const e of history) {
      if (e.theme) themes[e.theme] = (themes[e.theme] || 0) + 1;
      if (e.challenge)
        challenges[e.challenge] = (challenges[e.challenge] || 0) + 1;
      children.add(e.childName);
      totalTokens += (e.inputTokens || 0) + (e.outputTokens || 0);
    }

    return NextResponse.json({
      status: status.status || "idle",
      lastRun: status.lastRun || null,
      totalStories: history.length,
      recentStories: history.slice(0, 10),
      config: {
        model: config.defaultModel || "claude-haiku-4-5-20251001",
        themes: config.themes || [],
        challenges: config.challenges || [],
        lengths: config.storyLengthWords
          ? Object.keys(config.storyLengthWords)
          : ["short", "medium", "long"],
      },
      stats: {
        uniqueChildren: children.size,
        themes,
        challenges,
        totalTokens,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load story engine data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { childName, age, interests, challenge, theme, length, character } =
      body;

    if (!childName || !age) {
      return NextResponse.json(
        { error: "childName and age are required" },
        { status: 400 }
      );
    }

    const args = [
      path.join(AGENT_DIR, "src/index.js"),
      "generate",
      "--name",
      childName,
      "--age",
      String(age),
      "--json",
    ];

    if (interests) {
      args.push("--interests", Array.isArray(interests) ? interests.join(",") : interests);
    }
    if (challenge) args.push("--challenge", challenge);
    if (theme) args.push("--theme", theme);
    if (length) args.push("--length", length);
    if (character) args.push("--character", character);

    const { stdout } = await exec("node", args, {
      timeout: 60000,
      env: { ...process.env, PATH: process.env.PATH },
    });

    const story = JSON.parse(stdout);
    return NextResponse.json(story);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Story generation failed" },
      { status: 500 }
    );
  }
}
