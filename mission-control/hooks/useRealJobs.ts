/**
 * Real jobs/cron data from OpenClaw
 * Fetches structured JSON from /api/cron/list which reads
 * jobs.json + system crontab
 */

import { useState, useEffect, useMemo } from "react";
import { useMCRefreshInterval } from "@/hooks/useMCRefreshInterval";

export interface Job {
  _id: string;
  name: string;
  agent: string;
  agentEmoji: string;
  description: string;
  schedule: string;
  scheduleHuman: string;
  timezone: string;
  source: "openclaw" | "crontab";
  nextRun: number;
  lastRun?: number;
  lastRunAt?: number;
  status: "scheduled" | "running" | "completed" | "failed" | "idle" | "ok" | "error" | "skipped";
  frequency: "daily" | "every-5m" | "weekly" | "monthly" | "once" | "interval";
  enabled: boolean;
  executionCount?: number;
  failureCount?: number;
  consecutiveErrors?: number;
  lastError?: string | null;
  target?: string;
  createdAt: number;
  updatedAt: number;
}

function getFrequency(schedule: string): Job["frequency"] {
  if (schedule.includes("every")) return "interval";

  // Parse cron expressions: "cron M H DOM MON DOW"
  const cronMatch = schedule.match(/^cron\s+(.+)$/);
  if (cronMatch) {
    const parts = cronMatch[1].trim().split(/\s+/);
    if (parts.length >= 5) {
      const [min, hour, _dom, _mon, dow] = parts;
      // */N minute or */N hour = high-frequency interval
      if (min.startsWith("*/") || hour.startsWith("*/")) return "interval";
      // Hourly: hour=* with fixed minute
      if (hour === "*" && /^\d+$/.test(min)) return "interval";
      // Multiple minutes per hour (e.g. "5,20,35,50 * * * *") = high-frequency
      if (min.includes(",") && hour === "*") return "interval";
      // Multiple hours in a day: "0,7,9,12,14,17,19,22" or "3,15"
      if (/^\d+$/.test(min) && hour.includes(",")) return "daily";
      // Weekly: specific day-of-week
      if (dow !== "*" && dow !== "?") return "weekly";
      // Monthly: specific day-of-month
      if (_dom !== "*") return "monthly";
    }
  }

  return "daily";
}

function mapStatus(lastStatus: string | null, enabled: boolean): Job["status"] {
  if (!enabled) return "idle";
  if (!lastStatus) return "scheduled";
  const s = lastStatus.toLowerCase();
  if (s === "ok") return "ok";
  if (s === "error") return "failed";
  if (s === "running") return "running";
  if (s === "skipped") return "skipped";
  return "scheduled";
}

/**
 * Hook: Get all scheduled jobs from OpenClaw cron system + system crontab
 */
export function useRealJobs(): { jobs: Job[] | undefined; refresh: () => Promise<void> } {
  const refreshMs = useMCRefreshInterval();
  const [jobs, setJobs] = useState<Job[] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = async () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchJobs() {
      try {
        const response = await fetch(`/api/cron/list?t=${Date.now()}`, {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch cron jobs: ${response.statusText}`);
        }

        const data = await response.json();

        const parsed: Job[] = (data || []).map((job: any) => ({
          _id: job.id,
          name: job.name,
          agent: job.agent,
          agentEmoji: job.agentEmoji,
          description: job.description || job.scheduleHuman || "",
          schedule: job.schedule,
          scheduleHuman: job.scheduleHuman,
          timezone: job.timezone || "Asia/Singapore",
          source: job.source,
          nextRun: job.nextRun || Date.now() + 86400000,
          lastRun: job.lastRun || undefined,
          lastRunAt: job.lastRun || undefined,
          status: mapStatus(job.lastStatus, job.enabled),
          frequency: getFrequency(job.schedule),
          enabled: job.enabled,
          consecutiveErrors: job.consecutiveErrors || 0,
          lastError: job.lastError,
          target: job.target,
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        }));

        if (isMounted) {
          setJobs(parsed);
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[useRealJobs] Error fetching cron jobs:", error);
        if (isMounted) {
          setJobs([]);
          setIsLoading(false);
        }
      }
    }

    fetchJobs();

    // Refresh at the user-configured interval
    const interval = setInterval(fetchJobs, refreshMs);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [refreshTrigger, refreshMs]);

  return { jobs: isLoading ? undefined : jobs, refresh };
}

/**
 * Hook: Get jobs for a specific agent
 */
export function useRealAgentJobs(agentName: string): Job[] {
  const { jobs } = useRealJobs();
  return useMemo(() => {
    if (!jobs) return [];
    return jobs.filter((job) => job.agent === agentName);
  }, [jobs, agentName]);
}

/**
 * Hook: Get next scheduled job (across all agents)
 */
export function useNextScheduledJob(): Job | null {
  const { jobs } = useRealJobs();
  return useMemo(() => {
    if (!jobs) return null;
    const scheduled = jobs.filter(
      (j) => j.enabled && (j.status === "scheduled" || j.status === "idle" || j.status === "ok")
    );
    if (scheduled.length === 0) return null;
    return scheduled.sort((a, b) => a.nextRun - b.nextRun)[0];
  }, [jobs]);
}

/**
 * Hook: Get job statistics
 */
export function useRealJobStats() {
  const { jobs } = useRealJobs();
  return useMemo(() => {
    if (!jobs) {
      return { total: 0, enabled: 0, scheduled: 0, running: 0, completed: 0, failed: 0 };
    }

    return {
      total: jobs.length,
      enabled: jobs.filter((j) => j.enabled).length,
      scheduled: jobs.filter((j) => j.status === "scheduled" || j.status === "idle").length,
      running: jobs.filter((j) => j.status === "running").length,
      completed: jobs.filter((j) => j.status === "completed" || j.status === "ok").length,
      failed: jobs.filter((j) => j.status === "failed" || j.status === "error").length,
    };
  }, [jobs]);
}
