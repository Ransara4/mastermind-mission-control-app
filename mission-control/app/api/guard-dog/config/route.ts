import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const CONFIG_DIR = path.join(WS, "agents/guard-dog/config");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  try {
    if (type === "trusted") {
      const raw = await fs.readFile(path.join(CONFIG_DIR, "trusted-providers.json"), "utf-8");
      const data = JSON.parse(raw);
      return NextResponse.json({
        trustedProviders: data.trustedProviders || [],
        trustedNamespaces: data.trustedNamespaces || [],
        trustedScopes: data.trustedScopes || {},
      });
    }

    const raw = await fs.readFile(path.join(CONFIG_DIR, "config.json"), "utf-8");
    return NextResponse.json(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Failed to read config" }, { status: 500 });
  }
}
