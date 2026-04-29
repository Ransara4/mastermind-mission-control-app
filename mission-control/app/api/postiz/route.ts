import { NextResponse } from "next/server";
import { execSync } from "child_process";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const COMPOSE_DIR = `${WS}/skills/postiz`;

function cleanEnv() {
  const env = { ...process.env };
  // Remove Claude Code vars that break child processes
  for (const key of Object.keys(env)) {
    if (key.startsWith("CLAUDE") || key.startsWith("ANTHROPIC")) {
      delete env[key];
    }
  }
  env.PATH = "/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin";
  return env;
}

function runCmd(cmd: string): string {
  try {
    return execSync(cmd, {
      env: cleanEnv() as NodeJS.ProcessEnv,
      timeout: 30000,
      encoding: "utf-8",
    }).trim();
  } catch (e: unknown) {
    const err = e as { stderr?: string; message?: string };
    return err.stderr || err.message || "command failed";
  }
}

export async function GET() {
  try {
    const ps = runCmd('docker ps --filter "name=postiz" --format "{{.Names}}|{{.Status}}"');
    const lines = ps.split("\n").filter(Boolean);

    const containers: Record<string, string> = {};
    for (const line of lines) {
      const [name, status] = line.split("|");
      if (name && status) containers[name] = status;
    }

    const appRunning = !!containers["postiz-app"];
    const dbRunning = !!containers["postiz-db"];
    const redisRunning = !!containers["postiz-redis"];
    const allRunning = appRunning && dbRunning && redisRunning;

    return NextResponse.json({
      running: allRunning,
      containers: {
        app: { running: appRunning, status: containers["postiz-app"] || "stopped" },
        db: { running: dbRunning, status: containers["postiz-db"] || "stopped" },
        redis: { running: redisRunning, status: containers["postiz-redis"] || "stopped" },
      },
      url: "http://localhost:4200",
    });
  } catch {
    return NextResponse.json({ running: false, error: "Failed to check status" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "start") {
      const result = runCmd(`cd ${COMPOSE_DIR} && docker compose up -d 2>&1`);
      return NextResponse.json({ success: true, message: "Postiz starting...", output: result });
    }

    if (action === "stop") {
      const result = runCmd(`cd ${COMPOSE_DIR} && docker compose down 2>&1`);
      return NextResponse.json({ success: true, message: "Postiz stopped", output: result });
    }

    return NextResponse.json({ error: "Invalid action. Use 'start' or 'stop'." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Failed to execute action" }, { status: 500 });
  }
}
