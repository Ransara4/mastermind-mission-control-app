import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

function getEnvVar(key: string): string {
  if (process.env[key]) return process.env[key]!;
  try {
    const envPath = path.join(WS, ".env");
    const envContent = fs.readFileSync(envPath, "utf-8");
    const match = envContent.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match) {
      process.env[key] = match[1].trim();
      return match[1].trim();
    }
  } catch { /* ignore */ }
  return "";
}

export async function POST(request: Request) {
  try {
    const { message, plainText } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const botToken = getEnvVar("TELEGRAM_BOT_TOKEN");
    const chatId = getEnvVar("TELEGRAM_CHAT_ID") || '';

    if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN not configured" }, { status: 500 });
    }

    const body: Record<string, unknown> = {
      chat_id: chatId,
      text: message,
      disable_web_page_preview: true,
    };
    if (!plainText) {
      body.parse_mode = "Markdown";
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!data.ok) {
      return NextResponse.json({ error: data.description || "Telegram API error" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to send Telegram message";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
