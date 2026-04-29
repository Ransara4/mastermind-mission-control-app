import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const ENV_PATH = path.join(WS, ".env");

const ALLOWED_KEYS = new Set([
  "EVOLVE_STRATEGY",
  "A2A_HUB_URL",
  "EVOLVE_PENDING_SLEEP_MS",
  "MEMORY_GRAPH_PROVIDER",
  "EVOLVER_AUTO_PUBLISH",
  "EVOLVER_DEFAULT_VISIBILITY",
  "OLLAMA_URL",
  "OLLAMA_EMBED_MODEL",
]);

export async function POST(request: NextRequest) {
  let body: { key: string; value: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { key, value } = body;

  if (!key || value === undefined) {
    return NextResponse.json(
      { error: "Missing key or value" },
      { status: 400 }
    );
  }

  if (!ALLOWED_KEYS.has(key)) {
    return NextResponse.json(
      { error: `Key "${key}" is not a whitelisted setting` },
      { status: 403 }
    );
  }

  try {
    let envContent = "";
    try {
      envContent = await fs.readFile(ENV_PATH, "utf-8");
    } catch {}

    const regex = new RegExp(`^${key}=.*$`, "m");
    const newLine = `${key}=${value}`;

    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, newLine);
    } else {
      envContent = envContent.trimEnd() + "\n" + newLine + "\n";
    }

    const tmpPath = ENV_PATH + ".tmp";
    await fs.writeFile(tmpPath, envContent, "utf-8");
    await fs.rename(tmpPath, ENV_PATH);

    return NextResponse.json({ ok: true, key, value });
  } catch (err) {
    console.error("Failed to update .env:", err);
    return NextResponse.json(
      { error: "Failed to write settings" },
      { status: 500 }
    );
  }
}
