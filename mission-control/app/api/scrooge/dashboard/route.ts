import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import type { MetricsFile, ScroogeDashboard } from "@/lib/scrooge-types";
import os from "os";

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");

const SCROOGE_DATA = path.join(WS, "agents/scrooge/data");
const METRICS_PATH = path.join(SCROOGE_DATA, "metrics.json");
const RESEARCH_PATH = path.join(SCROOGE_DATA, "research.json");

interface ResearchFile {
  lastUpdate: string | null;
  findings: unknown[];
  implementations: Array<{
    name: string;
    confidence: string;
    mentions: number;
    implementation: string;
    sources: string[];
    installed?: boolean;
    safe: boolean;
  }>;
}

function emptyDashboard(): ScroogeDashboard {
  return {
    stats: {
      totalSpendUSD: 0,
      todaySpendUSD: 0,
      totalRequests: 0,
      totalTokensUsed: 0,
      totalTokensSaved: 0,
      totalCostSaved: 0,
      savingsPercent: 0,
      dataStartDate: "",
    },
    costTrend: [],
    modelBreakdown: [],
    strategies: [],
    research: { lastUpdate: null, suggestions: [] },
    dataSources: {
      metricsJson: { available: false, recordCount: 0, lastUpdated: "" },
    },
    lastUpdated: new Date().toISOString(),
  };
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function isWithinRange(dateStr: string, timeRange: string): boolean {
  if (timeRange === "all") return true;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  switch (timeRange) {
    case "today":
      return dateStr === getToday();
    case "7d":
      return diffDays <= 7;
    case "30d":
      return diffDays <= 30;
    default:
      return true;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "all";
  const modelFilter = searchParams.get("model") || "all";

  let metrics: MetricsFile;
  let fileStats: { mtimeMs: number } | null = null;

  try {
    const raw = await fs.readFile(METRICS_PATH, "utf-8");
    metrics = JSON.parse(raw);
    const stat = await fs.stat(METRICS_PATH);
    fileStats = { mtimeMs: stat.mtimeMs };
  } catch {
    return NextResponse.json(emptyDashboard());
  }

  // Filter daily data by time range
  const filteredDaily: Record<string, (typeof metrics.daily)[string]> = {};
  for (const [date, data] of Object.entries(metrics.daily)) {
    if (isWithinRange(date, timeRange)) {
      filteredDaily[date] = data;
    }
  }

  // Compute filtered stats from daily data
  let totalSpend = 0;
  let totalRequests = 0;
  let totalTokensUsed = 0;
  let totalTokensSaved = 0;
  let totalCostSaved = 0;

  for (const data of Object.values(filteredDaily)) {
    totalSpend += data.costUSD;
    totalRequests += data.requests;
    totalTokensUsed += data.tokensUsed;
    totalTokensSaved += data.tokensSaved;
    totalCostSaved += data.costSavedUSD;
  }

  const todayKey = getToday();
  const todayData = metrics.daily[todayKey];
  const todaySpend = todayData ? todayData.costUSD : 0;

  const savingsPercent =
    totalTokensUsed + totalTokensSaved > 0
      ? (totalTokensSaved / (totalTokensUsed + totalTokensSaved)) * 100
      : 0;

  // Cost trend — sorted dates
  const costTrend = Object.entries(filteredDaily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      costUSD: data.costUSD,
      requests: data.requests,
    }));

  // Model breakdown — optionally filtered
  const modelEntries = Object.entries(metrics.byModel)
    .filter(([model]) => modelFilter === "all" || model === modelFilter);

  const modelTotalCost = modelEntries.reduce((sum, [, d]) => sum + d.costUSD, 0);

  const modelBreakdown = modelEntries.map(([model, data]) => ({
    model,
    requests: data.requests,
    tokensUsed: data.tokensUsed,
    costUSD: data.costUSD,
    percentOfTotal: modelTotalCost > 0 ? (data.costUSD / modelTotalCost) * 100 : 0,
  })).sort((a, b) => b.costUSD - a.costUSD);

  // Strategies
  const strategies = Object.entries(metrics.byStrategy)
    .map(([name, data]) => ({
      name,
      uses: data.uses,
      tokensSaved: data.tokensSaved,
      costSavedUSD: data.costSavedUSD,
    }))
    .sort((a, b) => b.tokensSaved - a.tokensSaved);

  // Load research suggestions
  let research: ScroogeDashboard["research"] = { lastUpdate: null, suggestions: [] };
  try {
    const researchRaw = await fs.readFile(RESEARCH_PATH, "utf-8");
    const researchData: ResearchFile = JSON.parse(researchRaw);
    research = {
      lastUpdate: researchData.lastUpdate,
      suggestions: (researchData.implementations || []).map((impl) => ({
        name: impl.name,
        confidence: impl.confidence || "low",
        mentions: impl.mentions || 0,
        implementation: impl.implementation,
        sources: impl.sources || [],
        installed: !!impl.installed,
      })),
    };
  } catch {
    // No research data yet
  }

  const dashboard: ScroogeDashboard = {
    stats: {
      totalSpendUSD: totalSpend,
      todaySpendUSD: todaySpend,
      totalRequests,
      totalTokensUsed,
      totalTokensSaved,
      totalCostSaved,
      savingsPercent,
      dataStartDate: metrics.startDate,
    },
    costTrend,
    modelBreakdown,
    strategies,
    research,
    dataSources: {
      metricsJson: {
        available: true,
        recordCount: metrics.total.requests,
        lastUpdated: fileStats
          ? new Date(fileStats.mtimeMs).toISOString()
          : "",
      },
    },
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(dashboard);
}
