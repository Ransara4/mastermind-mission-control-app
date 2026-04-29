import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const AGENT_DIR = path.join(WS, "agents/remotion");
const STATUS_FILE = path.join(AGENT_DIR, "status.json");
const JOBS_FILE = path.join(AGENT_DIR, "jobs.json");

function readJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const status = readJSON(STATUS_FILE) || {
      status: "unknown",
      totalRenders: 0,
      lastRender: null,
      lastError: null,
    };

    const jobs = readJSON(JOBS_FILE) || [];

    // Get output directory stats
    const outputDir = path.join(AGENT_DIR, "output");
    let outputFiles: string[] = [];
    let totalSizeMB = 0;
    try {
      outputFiles = fs.readdirSync(outputDir).filter((f: string) => f.endsWith(".mp4"));
      for (const f of outputFiles) {
        const stat = fs.statSync(path.join(outputDir, f));
        totalSizeMB += stat.size / (1024 * 1024);
      }
    } catch {
      // output dir may not exist yet
    }

    // Check if remotion is installed
    const remotionInstalled = fs.existsSync(
      path.join(AGENT_DIR, "node_modules/remotion")
    );

    return NextResponse.json({
      status,
      jobs: jobs.slice(-20).reverse(),
      stats: {
        totalJobs: jobs.length,
        completedJobs: jobs.filter((j: any) => j.status === "ready" || j.status === "completed").length,
        failedJobs: jobs.filter((j: any) => j.status === "error").length,
        outputFiles: outputFiles.length,
        totalSizeMB: Math.round(totalSizeMB * 10) / 10,
      },
      templates: status.templates || [],
      remotionInstalled,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load Remotion data" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { template, props } = await req.json();
    if (!template) {
      return NextResponse.json({ error: "template is required" }, { status: 400 });
    }

    const agentScript = path.join(AGENT_DIR, "src/index.js");
    const propsArg = props ? JSON.stringify(props) : "{}";

    execSync(
      `node ${agentScript} render ${template} --props ${JSON.stringify(propsArg)}`,
      { env: { ...process.env } }
    );

    // Return updated jobs list
    const jobs = readJSON(JOBS_FILE) || [];
    const latest = [...jobs].reverse()[0] || null;
    return NextResponse.json({ ok: true, job: latest });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Render failed" },
      { status: 500 }
    );
  }
}
