// Guard Dog Dashboard Types

export interface GuardDogDashboard {
  securityScore: number;
  scoreTrend: number; // +/- change from last period
  scoreBreakdown: {
    vulnerabilities: number; // 0-30 points
    scanRecency: number; // 0-20 points
    threatIntel: number; // 0-20 points
    protectionActive: number; // 0-30 points
  };
  stats: {
    totalScans: number;
    dangerCount: number;
    suspiciousCount: number;
    safeCount: number;
    cleanRate: number;
    avgDuration: number;
    lastScanAt: string;
    monitoredPackages: number;
    nextScheduledScan: string | null;
  };
  protectionStatus: {
    preInstallHook: boolean;
    cronNightly: boolean;
    cronThreatIntel: boolean;
    lastNightlyScan: string | null;
    lastThreatIntelScan: string | null;
  };
  recentScans: ScanEntry[];
  dailyTrend: { date: string; bark: number; whine: number; silent: number }[];
  signalBreakdown: { signal: string; count: number }[];
  trustedProviders: {
    providers: string[];
    namespaces: string[];
    scopes: Record<string, string[]>;
  };
  threatIntel: ThreatIntelEntry[];
  installLog: InstallLogEntry[];
  cronJobs: CronJobStatus[];
  topVulnerablePackages: VulnerablePackage[];
  remediationProgress: {
    total: number;
    resolved: number;
    inProgress: number;
    pending: number;
  };
}

export interface ScanEntry {
  packageName: string;
  ecosystem: string;
  action: "BARK" | "WHINE" | "SILENT";
  threat: string;
  confidence: number;
  reasons: string[];
  cveCount: number;
  patternScore: number;
  duration: number;
  timestamp: string;
}

export interface ThreatIntelEntry {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  description: string;
  affectedPackages: string[];
  source: string;
  publishedAt: string;
  url?: string;
}

export interface InstallLogEntry {
  timestamp: string;
  package: string;
  ecosystem: string;
  result: "safe" | "suspicious" | "blocked";
  action: "BARK" | "WHINE" | "SILENT";
  reasons: string[];
  version?: string;
  project?: string;
}

export interface CronJobStatus {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  lastRun: string | null;
  lastStatus: string | null;
  nextRun: string | null;
}

export interface VulnerablePackage {
  packageName: string;
  ecosystem: string;
  severity: "critical" | "high" | "medium" | "low";
  cveCount: number;
  patternScore: number;
  lastScanned: string;
  fixAvailable: boolean;
  currentVersion?: string;
  fixVersion?: string;
}

export interface VulnerabilityDetail {
  id: string;
  packageName: string;
  ecosystem: string;
  cveId: string | null;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  cvssScore: number | null;
  affectedVersions: string;
  fixedVersion: string | null;
  status: "open" | "reviewed" | "snoozed" | "patched";
  discoveredAt: string;
  remediationSteps: string[];
  references: string[];
}

export interface ProjectScanInfo {
  id: string;
  name: string;
  path: string;
  lastScan: string | null;
  vulnerabilities: { critical: number; high: number; medium: number; low: number };
  totalDeps: number;
  outdatedDeps: number;
  riskScore: number; // 0-100
  healthStatus: "healthy" | "warning" | "critical" | "unknown";
  dependencies: ProjectDependency[];
}

export interface ProjectDependency {
  name: string;
  currentVersion: string;
  latestVersion: string | null;
  isOutdated: boolean;
  hasVulnerability: boolean;
  severity: "critical" | "high" | "medium" | "low" | null;
}

export interface ScanReport {
  id: string;
  date: string;
  type: "nightly" | "manual" | "threat-intel" | "weekly" | "monthly";
  packagesScanned: number;
  threats: number;
  suspicious: number;
  clean: number;
  duration: number;
  severityDistribution: { critical: number; high: number; medium: number; low: number };
}

export interface GuardDogSettings {
  scanSchedule: {
    nightlyScan: { enabled: boolean; time: string; timezone: string };
    threatIntel: { enabled: boolean; time: string; timezone: string };
    weeklySummary: { enabled: boolean; day: string; time: string; timezone: string };
    monthlyConsolidation: { enabled: boolean; day: number; time: string; timezone: string };
  };
  thresholds: {
    maliciousVotes: number;
    suspiciousVotes: number;
    minDownloads: number;
    minStars: number;
    maxAge: number;
  };
  alerts: {
    telegram: { enabled: boolean; chatId: string };
    email: { enabled: boolean; address: string };
  };
  remediationPolicies: {
    autoRemediateLow: boolean;
    autoRemediateMedium: boolean;
    requireApprovalHigh: boolean;
    requireApprovalCritical: boolean;
  };
  exclusions: string[];
  trustedProviders: string[];
  trustedNamespaces: string[];
  trustedScopes: Record<string, string[]>;
}

export interface ScanRequest {
  packageName: string;
  ecosystem: string;
}

export interface ScanResponse {
  success: boolean;
  result: ScanEntry | null;
  error?: string;
}
