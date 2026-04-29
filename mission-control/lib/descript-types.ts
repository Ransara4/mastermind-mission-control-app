export interface DescriptImport {
  path: string;
  meeting: string;
  date: string;
  importedAt: string;
  status: "complete" | "failed";
  duration?: number; // seconds of media
  wordCount?: number;
}

export interface DescriptQueueItem {
  path: string;
  meeting: string;
  date: string;
  status: "pending" | "importing";
}

export interface DescriptStatus {
  agentId: string;
  status: "idle" | "running" | "error" | "disabled";
  lastRun: string | null;
  lastResult: string | null;
  lastMessage: string;
  errorCount: number;
  enabled: boolean;
}

export interface DescriptConfig {
  descriptApp: string;
  autoOpenOnQueue: boolean;
  zoomQueuePath: string;
  enabled: boolean;
}

export interface DescriptDashboard {
  status: DescriptStatus;
  config: DescriptConfig;
  stats: {
    totalImports: number;
    totalHoursTranscribed: number;
    queueDepth: number;
    successRate: number;
    lastImportAt: string | null;
    importsThisWeek: number;
    importsThisMonth: number;
  };
  queue: DescriptQueueItem[];
  recentImports: DescriptImport[];
  integrations: {
    descriptApp: boolean;
    zoomAgent: boolean;
    autoImport: boolean;
  };
  dailyImports: { date: string; count: number }[];
}
