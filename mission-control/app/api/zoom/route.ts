import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const HOME = os.homedir();

const AGENT_DIR = path.join(WS, "agents/zoom");

function readJSON(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const status = readJSON(path.join(AGENT_DIR, "status.json")) || {
      agentId: "zoom",
      status: "unknown",
      lastRun: null,
      lastResult: null,
      lastMessage: "Unable to read status",
      errorCount: 0,
      enabled: false,
    };

    const config = readJSON(path.join(AGENT_DIR, "config", "config.json")) || {
      recordingsDir: "~/Documents/Zoom",
      renamingPattern: "{date} - {meeting}",
      watchExtensions: [".mp4", ".m4a"],
      processedLogMax: 500,
      enabled: true,
    };

    const processed = readJSON(
      path.join(AGENT_DIR, "data", "processed.json")
    ) || { files: [] };
    const queue = readJSON(
      path.join(AGENT_DIR, "data", "ready-queue.json")
    ) || { pending: [] };

    // Check if watcher is running (fswatch process for the recordings dir)
    let watcherRunning = false;
    try {
      const { execSync } = require("child_process");
      const ps = execSync("ps aux", { encoding: "utf-8" });
      watcherRunning = ps.includes("fswatch") && ps.includes("Zoom");
    } catch {
      // ignore
    }

    // Check if recordings directory exists
    const resolvedDir = config.recordingsDir.replace(
      /^~/,
      process.env.HOME || ""
    );
    const recordingsDirExists = fs.existsSync(resolvedDir);

    // Calculate stats from processed files
    const files = processed.files || [];
    const totalProcessed = files.length;
    const pendingCount = (queue.pending || []).length;

    // Get recordings dir size if it exists
    let storageMB = 0;
    if (recordingsDirExists) {
      try {
        const { execSync } = require("child_process");
        const duOutput = execSync(`du -sm "${resolvedDir}" 2>/dev/null`, {
          encoding: "utf-8",
        });
        storageMB = parseInt(duOutput.split("\t")[0], 10) || 0;
      } catch {
        // ignore
      }
    }

    return NextResponse.json({
      status,
      config: {
        ...config,
        recordingsDirResolved: resolvedDir,
        recordingsDirExists,
      },
      processed: files,
      queue: queue.pending || [],
      watcherRunning,
      stats: {
        totalProcessed,
        pendingInQueue: pendingCount,
        storageMB,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
