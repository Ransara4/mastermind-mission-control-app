import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { DescriptDashboard, DescriptStatus, DescriptConfig, DescriptImport, DescriptQueueItem } from "@/lib/descript-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const DESCRIPT_ROOT = path.join(WS, "agents/descript");
const STATUS_PATH = path.join(DESCRIPT_ROOT, "status.json");
const CONFIG_PATH = path.join(DESCRIPT_ROOT, "config/config.json");
const HISTORY_PATH = path.join(DESCRIPT_ROOT, "data/import-history.json");
const ZOOM_QUEUE_PATH = path.join(WS, "agents/zoom/data/ready-queue.json");

function emptyDashboard(): DescriptDashboard {
  return {
    status: {
      agentId: "descript",
      status: "idle",
      lastRun: null,
      lastResult: null,
      lastMessage: "No data available",
      errorCount: 0,
      enabled: true,
    },
    config: {
      descriptApp: "/Applications/Descript.app",
      autoOpenOnQueue: true,
      zoomQueuePath: "~/.openclaw/workspace/agents/zoom/data/ready-queue.json",
      enabled: true,
    },
    stats: {
      totalImports: 0,
      totalHoursTranscribed: 0,
      queueDepth: 0,
      successRate: 100,
      lastImportAt: null,
      importsThisWeek: 0,
      importsThisMonth: 0,
    },
    queue: [],
    recentImports: [],
    integrations: {
      descriptApp: false,
      zoomAgent: false,
      autoImport: true,
    },
    dailyImports: [],
  };
}

export async function GET() {
  const dashboard = emptyDashboard();

  // Read status
  try {
    const raw = await fs.readFile(STATUS_PATH, "utf-8");
    dashboard.status = JSON.parse(raw) as DescriptStatus;
  } catch {
    // defaults
  }

  // Read config
  try {
    const raw = await fs.readFile(CONFIG_PATH, "utf-8");
    dashboard.config = JSON.parse(raw) as DescriptConfig;
  } catch {
    // defaults
  }

  // Read import history
  let imports: DescriptImport[] = [];
  try {
    const raw = await fs.readFile(HISTORY_PATH, "utf-8");
    const history = JSON.parse(raw);
    imports = (history.imports || []).map((imp: Record<string, unknown>) => ({
      ...imp,
      status: imp.status || "complete",
    }));
  } catch {
    // empty
  }

  // Read zoom queue
  let queue: DescriptQueueItem[] = [];
  try {
    const raw = await fs.readFile(ZOOM_QUEUE_PATH, "utf-8");
    const zoomQueue = JSON.parse(raw);
    queue = (zoomQueue.pending || []).map((item: Record<string, unknown>) => ({
      ...item,
      status: "pending",
    }));
  } catch {
    // no queue
  }

  // Check integrations
  let descriptAppInstalled = false;
  try {
    await fs.access("/Applications/Descript.app");
    descriptAppInstalled = true;
  } catch {
    // not installed
  }

  let zoomAgentConnected = false;
  try {
    await fs.access(ZOOM_QUEUE_PATH);
    zoomAgentConnected = true;
  } catch {
    // not connected
  }

  // Compute stats
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const successfulImports = imports.filter((i) => i.status !== "failed");
  const importsThisWeek = imports.filter(
    (i) => i.importedAt && new Date(i.importedAt) >= weekAgo
  ).length;
  const importsThisMonth = imports.filter(
    (i) => i.importedAt && new Date(i.importedAt) >= monthAgo
  ).length;

  const totalHours = imports.reduce(
    (sum, i) => sum + (i.duration || 0),
    0
  ) / 3600;

  const lastImport = imports.length > 0
    ? imports[imports.length - 1]
    : null;

  // Daily imports trend (last 30 days)
  const dailyMap: Record<string, number> = {};
  for (const imp of imports) {
    if (imp.importedAt) {
      const date = imp.importedAt.split("T")[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }
  }
  const dailyImports = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, count]) => ({ date, count }));

  dashboard.stats = {
    totalImports: imports.length,
    totalHoursTranscribed: Math.round(totalHours * 10) / 10,
    queueDepth: queue.length,
    successRate:
      imports.length > 0
        ? Math.round((successfulImports.length / imports.length) * 100)
        : 100,
    lastImportAt: lastImport?.importedAt || null,
    importsThisWeek,
    importsThisMonth,
  };

  dashboard.queue = queue;
  dashboard.recentImports = [...imports].reverse().slice(0, 25);
  dashboard.integrations = {
    descriptApp: descriptAppInstalled,
    zoomAgent: zoomAgentConnected,
    autoImport: dashboard.config.autoOpenOnQueue,
  };
  dashboard.dailyImports = dailyImports;

  return NextResponse.json(dashboard);
}
