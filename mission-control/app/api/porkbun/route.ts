import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { readFile, writeFile } from "fs/promises";
import os from "os";
import path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const exec = promisify(execFile);
const AGENT = `${WS}/agents/porkbun/src/index.js`;
const STATUS_PATH = `${WS}/agents/porkbun/status.json`;
const REGISTRY_PATH = `${WS}/ops/agent-registry.json`;

async function runAgent(args: string[]): Promise<unknown> {
  const { stdout } = await exec("node", [AGENT, ...args], { timeout: 30000 });
  try {
    return JSON.parse(stdout);
  } catch {
    return { raw: stdout };
  }
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "status";

  try {
    switch (action) {
      case "status": {
        const raw = await readFile(STATUS_PATH, "utf-8");
        return NextResponse.json(JSON.parse(raw));
      }

      case "list": {
        const data = await runAgent(["list", "--json"]);
        return NextResponse.json(data);
      }

      case "dns": {
        const domain = req.nextUrl.searchParams.get("domain");
        if (!domain) {
          return NextResponse.json(
            { error: "Missing domain parameter" },
            { status: 400 }
          );
        }
        const data = await runAgent(["dns-list", domain]);
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, enabled } = body;

    if (action === "toggle") {
      const raw = await readFile(REGISTRY_PATH, "utf-8");
      const registry = JSON.parse(raw);
      const agent = registry.agents.find(
        (a: { agentId: string }) => a.agentId === "porkbun"
      );
      if (agent) {
        agent.enabled = enabled;
        await writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2));
      }
      return NextResponse.json({ ok: true, enabled });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
