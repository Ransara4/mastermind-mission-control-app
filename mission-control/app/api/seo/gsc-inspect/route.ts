import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { execFile } from "child_process";
import type { GscInspectionResult, GscIndexingState } from "@/lib/seo-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || join(os.homedir(), "golden-claw");

const GSC_TOOLS = join(WS, "agents/seo-monitor/src/gsc-tools.js");

function runGscTool(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      "node",
      [GSC_TOOLS, ...args],
      {
        cwd: join(WS, "agents/seo-monitor"),
        timeout: 30000,
      },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr || error.message));
        else resolve({ stdout, stderr });
      }
    );
  });
}

export async function POST(request: NextRequest) {
  const inspectedAt = new Date().toISOString();

  let body: { url?: string; siteUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url, siteUrl } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  // Basic domain/URL validation — must look like a URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Must be http or https");
    }
  } catch {
    return NextResponse.json({ error: "url must be a valid http/https URL" }, { status: 400 });
  }

  if (!siteUrl || typeof siteUrl !== "string") {
    return NextResponse.json({ error: "siteUrl is required" }, { status: 400 });
  }

  const siteArg = `--site=${siteUrl}`;

  try {
    const { stdout } = await runGscTool(["inspect-url-json", parsedUrl.toString(), siteArg]);

    let raw: any;
    try {
      raw = JSON.parse(stdout.trim());
    } catch {
      return NextResponse.json(
        { url, indexingState: "INDEXING_STATE_UNSPECIFIED" as GscIndexingState, error: "Failed to parse GSC response", inspectedAt },
        { status: 200 }
      );
    }

    const inspectionResult = raw?.inspectionResult || {};
    const indexStatus = inspectionResult?.indexStatusResult || {};
    const richResults = inspectionResult?.richResultsResult || {};

    const result: GscInspectionResult = {
      url,
      indexingState: (indexStatus.indexingState as GscIndexingState) || "INDEXING_STATE_UNSPECIFIED",
      googleCanonical: indexStatus.googleCanonical || undefined,
      userDeclaredCanonical: indexStatus.userDeclaredCanonical || undefined,
      robotsTxtState: indexStatus.robotsTxtState || undefined,
      lastCrawlTime: indexStatus.lastCrawlTime || undefined,
      richResultsStatus: richResults.verdict || undefined,
      verdict: indexStatus.verdict || undefined,
      inspectedAt,
      rawResponse: raw,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    // Graceful fallback — don't throw, return a safe result
    return NextResponse.json(
      {
        url,
        indexingState: "INDEXING_STATE_UNSPECIFIED" as GscIndexingState,
        error: "GSC inspection unavailable",
        inspectedAt,
      } satisfies GscInspectionResult & { error: string },
      { status: 200 }
    );
  }
}
