/**
 * API Routes: Tokopedia Agent
 * GET  /api/tokopedia?action=search&q=<query>&sort=<sort>&limit=<limit>
 * GET  /api/tokopedia?action=status
 * POST /api/tokopedia  body { action: "cart", productUrl }
 * POST /api/tokopedia  body { action: "score", productUrl }
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const AGENT_CLI = path.join(WS, "agents/tokopedia/src/index.js");
const STATUS_FILE = path.join(WS, "agents/tokopedia/data/status.json");

function readStatus() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_FILE, "utf-8"));
  } catch {
    return { lastRun: null, lastCommand: null, lastQuery: null, lastResult: null, cartItems: [], status: "idle" };
  }
}

function runAgent(args: string, timeoutMs = 60000): string {
  return execSync(`node "${AGENT_CLI}" ${args}`, {
    encoding: "utf-8",
    timeout: timeoutMs,
    env: { ...process.env, HOME },
    cwd: path.join(WS, "agents/tokopedia"),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";

  try {
    if (action === "search") {
      const q = searchParams.get("q");
      if (!q) {
        return NextResponse.json({ success: false, error: "Missing query parameter 'q'" }, { status: 400 });
      }
      const sort = searchParams.get("sort") || "relevant";
      const limit = searchParams.get("limit") || "10";

      const output = runAgent(`search "${q.replace(/"/g, '\\"')}" --limit ${limit} --sort ${sort} --json`);
      const status = readStatus();

      let products = [];
      try {
        products = JSON.parse(output.trim());
      } catch {
        // Fallback: return raw output if JSON parsing fails
        return NextResponse.json({ success: true, products: [], rawOutput: output, status });
      }

      return NextResponse.json({ success: true, products, status });
    }

    // Default: return status
    const status = readStatus();
    return NextResponse.json({ success: true, status });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, productUrl, query } = body;

    if (action === "cart" && productUrl) {
      const output = runAgent(`add-to-cart "${productUrl.replace(/"/g, '\\"')}"`, 90000);
      const status = readStatus();
      return NextResponse.json({ success: true, output, status });
    }

    if (action === "buy" && query) {
      const output = runAgent(`buy "${query.replace(/"/g, '\\"')}"`, 120000);
      const status = readStatus();
      return NextResponse.json({ success: true, output, status });
    }

    if (action === "score" && productUrl) {
      const output = runAgent(`score "${productUrl.replace(/"/g, '\\"')}"`, 60000);
      const status = readStatus();
      return NextResponse.json({ success: true, output, status });
    }

    return NextResponse.json({ success: false, error: "Invalid action. Use: cart, buy, or score" }, { status: 400 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
