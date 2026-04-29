// Scrooge Dashboard Types

// Raw metrics.json shape
export interface MetricsFile {
  startDate: string;
  total: {
    requests: number;
    tokensUsed: number;
    tokensSaved: number;
    costUSD: number;
    costSavedUSD: number;
  };
  byModel: Record<string, {
    requests: number;
    tokensUsed: number;
    tokensSaved: number;
    costUSD: number;
    costSavedUSD: number;
  }>;
  byStrategy: Record<string, {
    uses: number;
    tokensSaved: number;
    costSavedUSD: number;
  }>;
  daily: Record<string, {
    requests: number;
    tokensUsed: number;
    tokensSaved: number;
    costUSD: number;
    costSavedUSD: number;
  }>;
  weekly: Record<string, {
    requests: number;
    tokensUsed: number;
    tokensSaved: number;
    costUSD: number;
    costSavedUSD: number;
  }>;
  monthly: Record<string, {
    requests: number;
    tokensUsed: number;
    tokensSaved: number;
    costUSD: number;
    costSavedUSD: number;
  }>;
}

// Dashboard API response
export interface ScroogeDashboard {
  stats: {
    totalSpendUSD: number;
    todaySpendUSD: number;
    totalRequests: number;
    totalTokensUsed: number;
    totalTokensSaved: number;
    totalCostSaved: number;
    savingsPercent: number;
    dataStartDate: string;
  };
  costTrend: Array<{
    date: string;
    costUSD: number;
    requests: number;
  }>;
  modelBreakdown: Array<{
    model: string;
    requests: number;
    tokensUsed: number;
    costUSD: number;
    percentOfTotal: number;
  }>;
  strategies: Array<{
    name: string;
    uses: number;
    tokensSaved: number;
    costSavedUSD: number;
  }>;
  research: {
    lastUpdate: string | null;
    suggestions: Array<{
      name: string;
      confidence: string;
      mentions: number;
      implementation: string;
      sources: string[];
      installed: boolean;
    }>;
  };
  dataSources: {
    metricsJson: {
      available: boolean;
      recordCount: number;
      lastUpdated: string;
    };
  };
  lastUpdated: string;
}

export type TimeRange = "today" | "7d" | "30d" | "all";
