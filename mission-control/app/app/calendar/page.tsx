"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRealJobs } from "@/hooks/useRealJobs";
import {
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  FileText,
  Activity,
  RefreshCw
} from "lucide-react";
const statusIcons: Record<string, React.ReactElement> = {
  scheduled: <Clock size={20} className="text-cm-purple" />,
  running: <Activity size={20} className="text-cm-purple" />,
  completed: <CheckCircle size={20} className="text-dark-success" />,
  failed: <AlertCircle size={20} className="text-dark-danger" />,
  error: <AlertCircle size={20} className="text-dark-danger" />,
  idle: <Clock size={20} className="text-dark-muted" />,
  ok: <CheckCircle size={20} className="text-dark-success" />,
  skipped: <Clock size={20} className="text-dark-warn" />,
};

const statusColors: Record<string, string> = {
  scheduled: "bg-dark-panel border-dark-border text-dark-text",
  running: "bg-dark-panel border-dark-border text-dark-text",
  completed: "bg-dark-panel border-dark-border text-dark-text",
  failed: "bg-dark-panel border-dark-border text-dark-text",
  error: "bg-dark-panel border-dark-border text-dark-text",
  idle: "bg-dark-panel border-dark-border text-dark-text",
  ok: "bg-dark-panel border-dark-border text-dark-text",
  skipped: "bg-dark-panel border-dark-border text-dark-text",
};

const statusBadgeColors: Record<string, string> = {
  scheduled: "bg-cm-purple/15 text-cm-purple",
  running: "bg-cm-purple/15 text-cm-purple",
  completed: "bg-dark-success/20 text-dark-success",
  failed: "bg-dark-danger/20 text-dark-danger",
  error: "bg-dark-danger/20 text-dark-danger",
  idle: "bg-dark-panel2 text-dark-muted",
  ok: "bg-cm-purple/15 text-cm-purple",
  skipped: "bg-dark-warn/20 text-dark-warn",
};

// Format time remaining
function formatTimeRemaining(ms: number): string {
  if (ms < 0) return "Overdue";

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Parse cron expression to get actual run time
function parseCronTime(schedule: string): { hour: number; minute: number; type: 'fixed' | 'interval' } | null {
  // Handle "every Xm" or "every Xh" patterns
  if (schedule.includes("every")) {
    return { hour: 0, minute: 0, type: 'interval' };
  }

  // Handle cron expressions: "cron M H * * *"
  const cronMatch = schedule.match(/cron\s+(\d+)\s+(\d+)/);
  if (cronMatch) {
    const minute = parseInt(cronMatch[1]);
    const hour = parseInt(cronMatch[2]);
    return { hour, minute, type: 'fixed' };
  }

  return null;
}

// Format time as 12-hour AM/PM
// @ts-ignore - Helper function for potential future use
function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${period}`;
}

// Get time sort value for sorting jobs by time
function getTimeSortValue(schedule: string): number {
  const parsed = parseCronTime(schedule);
  if (!parsed || parsed.type === 'interval') return 99999; // Put intervals at the end
  return parsed.hour * 60 + parsed.minute; // Minutes since midnight
}

export default function CalendarPage() {
  const { jobs, refresh } = useRealJobs();
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Update time every second for countdown
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Enrich jobs with next run time
  const enrichedJobs = useMemo(() => {
    if (!jobs) return [];

    return jobs.map((job: any) => {
      const nextRun = job.nextRun || Date.now() + 3600000;
      const timeUntilNext = nextRun - currentTime;

      return {
        ...job,
        nextRunAt: nextRun,
        timeUntilNext,
        timeUntilNextFormatted: formatTimeRemaining(timeUntilNext),
      };
    });
  }, [jobs, currentTime]);

  // Get logs for selected job (mock - no actual logs yet)
  const selectedJobLogs = useMemo(() => {
    if (!selectedJob) return [];
    return [];
  }, [selectedJob]);

  // Get daily jobs sorted by actual run time
  // @ts-ignore - Helper variable for potential future use
  const dailyJobs = useMemo(() => {
    if (!jobs) return [];

    // Filter for daily jobs (not intervals)
    const daily = enrichedJobs.filter((job: any) => {
      const parsed = parseCronTime(job.schedule);
      return parsed && parsed.type === 'fixed';
    });

    // Sort by actual time (hour:minute)
    return daily.sort((a: any, b: any) => {
      return getTimeSortValue(a.schedule) - getTimeSortValue(b.schedule);
    });
  }, [enrichedJobs, jobs]);

  // Get interval jobs (every Xm, every Xh)
  // @ts-ignore - Helper variable for potential future use
  const intervalJobs = useMemo(() => {
    if (!jobs) return [];

    return enrichedJobs.filter((job: any) => {
      const parsed = parseCronTime(job.schedule);
      return !parsed || parsed.type === 'interval';
    });
  }, [enrichedJobs, jobs]);

  // Get next 7 days for calendar
  const next7Days = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentTime + i * 86400000);
      days.push({
        date,
        dateKey: date.toISOString().split('T')[0],
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNum: date.getDate(),
      });
    }
    return days;
  }, [currentTime]);

  // Group jobs by day for calendar view
  // Recurring jobs (daily, interval) appear on all 7 days, not just their next run
  // High-frequency jobs (interval) are consolidated into summary rows per agent
  const jobsByDay = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    const dayKeys = next7Days.map(d => d.dateKey);

    // Separate high-frequency (interval) from normal jobs
    const intervalJobs: any[] = [];
    const normalJobs: any[] = [];

    enrichedJobs.forEach((job: any) => {
      if (!job.enabled) return;
      if (job.frequency === 'interval' || job.frequency === 'every-5m') {
        intervalJobs.push(job);
      } else {
        normalJobs.push(job);
      }
    });

    // Consolidate interval jobs by agent into summary entries
    const agentGroups: Record<string, any[]> = {};
    intervalJobs.forEach((job: any) => {
      const key = job.agent || 'System';
      if (!agentGroups[key]) agentGroups[key] = [];
      agentGroups[key].push(job);
    });

    const summaryEntries = Object.entries(agentGroups).map(([agentName, jobs]) => ({
      _id: `summary-${agentName}`,
      name: jobs.length === 1
        ? `${jobs[0].name} — ${jobs[0].scheduleHuman || jobs[0].schedule}`
        : `${agentName} — ${jobs.length} recurring jobs`,
      agent: agentName,
      agentEmoji: jobs[0].agentEmoji,
      status: 'scheduled',
      enabled: true,
      frequency: 'interval',
      isSummary: true,
      summaryJobs: jobs,
      nextRunAt: Math.min(...jobs.map((j: any) => j.nextRunAt || Infinity)),
      scheduleHuman: jobs.length === 1
        ? (jobs[0].scheduleHuman || jobs[0].schedule)
        : jobs.map((j: any) => j.scheduleHuman || j.schedule).join(', '),
    }));

    // Place normal jobs on appropriate days
    normalJobs.forEach((job: any) => {
      const freq = job.frequency;
      if (freq === 'daily') {
        dayKeys.forEach((dateKey) => {
          if (!grouped[dateKey]) grouped[dateKey] = [];
          grouped[dateKey].push(job);
        });
      } else if (freq === 'weekly') {
        const nextRunDay = new Date(job.nextRunAt).getDay();
        next7Days.forEach((day) => {
          if (day.date.getDay() === nextRunDay) {
            if (!grouped[day.dateKey]) grouped[day.dateKey] = [];
            grouped[day.dateKey].push(job);
          }
        });
      } else {
        const date = new Date(job.nextRunAt);
        const dateKey = date.toISOString().split('T')[0];
        if (!grouped[dateKey]) grouped[dateKey] = [];
        grouped[dateKey].push(job);
      }
    });

    // Add summary entries to every day
    dayKeys.forEach((dateKey) => {
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(...summaryEntries);
    });

    return grouped;
  }, [enrichedJobs, next7Days]);

  const handleTriggerJob = async (jobId: string) => {
    // In production, this would call OpenClaw's cron API to trigger immediately
    // For now, show a message
    const job = enrichedJobs.find((j: any) => j._id === jobId);
    if (job) {
      alert(`Job "${job.name}" triggered! (Running in background)`);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force re-fetch using the hook's refresh function
      await refresh();
      // Update current time to recalculate countdowns
      setCurrentTime(Date.now());
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  if (jobs === undefined) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-dark-panel2 rounded mb-4"></div>
          <div className="h-4 w-32 bg-dark-panel2 rounded"></div>
        </div>
      </div>
    );
  }

  const scheduledCount = enrichedJobs.filter((j: any) => (j.status === "scheduled" || j.status === "idle") && j.enabled).length;
  const runningCount = enrichedJobs.filter((j: any) => j.status === "running").length;
  const completedToday = enrichedJobs.filter((j: any) => {
    if (!j.lastRunAt) return false;
    const today = new Date().setHours(0, 0, 0, 0);
    return j.lastRunAt >= today && (j.status === "completed" || j.status === "ok");
  }).length;

  // Get next scheduled job
  const nextJob = enrichedJobs
    .filter((j: any) => j.enabled && (j.status === "scheduled" || j.status === "idle"))
    .sort((a: any, b: any) => a.nextRunAt - b.nextRunAt)[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-dark-text mb-2">
            Scheduled Jobs
          </h2>
          <p className="text-dark-muted">
            Cron jobs and scheduled tasks
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg transition-colors flex items-center gap-2 bg-dark-panel2 text-dark-text hover:bg-dark-border disabled:opacity-50"
          title="Refresh cron jobs"
        >
          <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Next Job Countdown */}
      {nextJob && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-cm-purple/15 rounded-lg p-3">
                <Clock size={24} className="text-cm-purple" />
              </div>
              <div>
                <p className="text-dark-muted text-sm mb-1">Next Scheduled Job</p>
                <h3 className="text-2xl font-semibold tracking-tight text-dark-text mb-1 flex items-center gap-2">
                  <span className="text-3xl">{nextJob.agentEmoji || '⚙️'}</span>
                  {nextJob.name}
                </h3>
                <p className="text-dark-muted text-sm">
                  {nextJob.agent && <span className="font-semibold text-dark-text">{nextJob.agent}</span>} • {new Date(nextJob.nextRunAt).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-dark-text mb-2">
                {nextJob.timeUntilNextFormatted}
              </div>
              <p className="text-dark-muted text-sm">Until Execution</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-sm text-dark-muted">Total Jobs</p>
          <p className="text-3xl font-bold text-dark-text mt-1">{enrichedJobs.length}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-sm text-dark-muted flex items-center gap-2">
            <Clock size={16} />
            Scheduled
          </p>
          <p className="text-3xl font-bold text-dark-text mt-1">{scheduledCount}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-sm text-dark-muted flex items-center gap-2">
            <Activity size={16} />
            Running
          </p>
          <p className="text-3xl font-bold text-dark-text mt-1">{runningCount}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-sm text-dark-muted">Completed Today</p>
          <p className="text-3xl font-bold text-dark-text mt-1">{completedToday}</p>
        </div>
      </div>

      {/* Calendar View */}
      <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        <div className="p-4 border-b border-dark-border bg-dark-panel2">
          <h3 className="font-semibold tracking-tight text-dark-text">Next 7 Days</h3>
        </div>
        <div className="grid grid-cols-7 divide-x divide-dark-border">
          {next7Days.map((day) => {
            const dayJobs = jobsByDay[day.dateKey] || [];

            return (
              <div key={day.dateKey} className="min-h-[200px]">
                <div className="p-3 border-b border-dark-border bg-dark-panel2">
                  <p className="text-xs text-dark-muted font-medium">{day.dayName}</p>
                  <p className="text-2xl font-bold text-dark-text">{day.dayNum}</p>
                </div>
                <div className="p-2 space-y-2">
                  {dayJobs.length === 0 ? (
                    <p className="text-xs text-dark-muted text-center py-4">No jobs</p>
                  ) : (
                    dayJobs.map((job: any) => (
                      <button
                        key={job._id}
                        onClick={() => {
                          if (job.isSummary) {
                            setSelectedJob(job);
                            setShowLogs(true);
                          } else {
                            setSelectedJob(job);
                            setShowLogs(true);
                          }
                        }}
                        className={`w-full text-left p-2 rounded text-xs ${
                          job.isSummary
                            ? 'bg-cm-purple/10 border border-cm-purple/20 text-dark-text'
                            : statusColors[job.status as keyof typeof statusColors]
                        } hover:opacity-80 transition-opacity`}
                      >
                        <p className="font-medium truncate">
                          {job.agentEmoji && <span className="mr-1">{job.agentEmoji}</span>}
                          {job.name}
                        </p>
                        <p className="text-xs opacity-75">
                          {job.isSummary
                            ? (job.summaryJobs?.length === 1 ? job.summaryJobs[0].scheduleHuman : `${job.summaryJobs?.length} jobs`)
                            : new Date(job.nextRunAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-3">
        {enrichedJobs.length === 0 ? (
          <div className="bg-dark-panel rounded-xl p-8 border border-dark-border text-center text-dark-muted">
            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-medium">No jobs found</p>
          </div>
        ) : (
          enrichedJobs.map((job: any) => (
              <div
                key={job._id}
                className={`p-4 rounded-xl border ${statusColors[job.status as keyof typeof statusColors] || "bg-dark-panel border-dark-border"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left Content */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{statusIcons[job.status as keyof typeof statusIcons]}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        {job.agentEmoji && (
                          <span className="text-xl">{job.agentEmoji}</span>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold tracking-tight text-dark-text">
                              {job.name}
                            </h3>
                            {job.frequency === 'daily' && (
                              <span className="px-2 py-0.5 bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded font-medium">
                                Daily
                              </span>
                            )}
                          </div>
                          {job.agent && job.agent !== 'System' && (
                            <p className="text-xs text-dark-muted">Agent: {job.agent}</p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[job.status as keyof typeof statusBadgeColors]}`}>
                          {job.status}
                        </span>
                      </div>
                      {job.description && (
                        <p className="text-sm text-dark-muted mb-2">
                          {job.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-dark-muted flex-wrap">
                        <span className="font-dm-mono text-xs bg-dark-panel2 border border-dark-border text-dark-muted px-2 py-1 rounded">
                          {job.scheduleHuman || job.schedule}
                        </span>
                        <span>{job.timezone}</span>
                        {job.enabled && job.status === "scheduled" && (
                          <span className="flex items-center gap-1 text-cm-purple font-medium">
                            <Clock size={14} />
                            Next: {job.timeUntilNextFormatted}
                          </span>
                        )}
                        {job.lastRunAt && (
                          <span>
                            Last: {new Date(job.lastRunAt).toLocaleString()}
                          </span>
                        )}
                        {job.executionCount && (
                          <span>Runs: {job.executionCount}</span>
                        )}
                        {job.consecutiveErrors && job.consecutiveErrors > 0 && (
                          <span className="text-dark-danger">Errors: {job.consecutiveErrors}</span>
                        )}
                        {job.lastError && (
                          <span className="text-dark-danger text-xs truncate max-w-xs" title={job.lastError}>{job.lastError}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Controls */}
                  <div className="flex items-center gap-2">
                    {job.enabled ? (
                      <span className="px-3 py-1 bg-cm-purple/15 text-cm-purple border border-cm-purple/20 text-xs font-medium rounded-full">
                        Enabled
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-dark-panel2 border border-dark-border text-dark-muted text-xs font-medium rounded-full">
                        Disabled
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedJob(job);
                        setShowLogs(true);
                      }}
                      className="p-2 rounded-lg hover:bg-dark-panel2/50 transition-colors"
                      title="View Logs"
                    >
                      <FileText size={16} className="text-dark-muted" />
                    </button>
                    <button
                      onClick={() => handleTriggerJob(job._id)}
                      className="p-2 rounded-lg hover:bg-dark-panel2/50 transition-colors"
                      title="Trigger Now"
                      disabled={job.status === "running"}
                    >
                      <Play size={16} className={job.status === "running" ? "text-dark-muted" : "text-dark-muted"} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      {/* Logs Modal */}
      {showLogs && selectedJob && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-panel rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl shadow-black/40">
            <div className="p-4 border-b border-dark-border flex items-center justify-between bg-dark-panel2">
              <div>
                <h3 className="font-semibold tracking-tight text-dark-text">{selectedJob.name}</h3>
                <p className="text-sm text-dark-muted">Execution Logs</p>
              </div>
              <button
                onClick={() => {
                  setShowLogs(false);
                  setSelectedJob(null);
                }}
                className="text-dark-muted hover:text-dark-text"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {selectedJob.isSummary ? (
                <div className="space-y-3">
                  <p className="text-sm text-dark-muted mb-3">
                    {selectedJob.summaryJobs?.length} high-frequency jobs consolidated into this group:
                  </p>
                  {(selectedJob.summaryJobs || []).map((sub: any) => (
                    <div key={sub._id} className="p-3 rounded-lg bg-dark-panel2 border border-dark-border">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-dark-text text-sm">{sub.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadgeColors[sub.status as keyof typeof statusBadgeColors]}`}>
                          {sub.status}
                        </span>
                      </div>
                      <p className="text-xs text-dark-muted font-dm-mono">{sub.scheduleHuman || sub.schedule}</p>
                      {sub.lastRunAt && (
                        <p className="text-xs text-dark-muted mt-1">Last run: {new Date(sub.lastRunAt).toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : selectedJobLogs.length === 0 ? (
                <p className="text-center text-dark-muted py-8">No execution logs yet</p>
              ) : (
                <div className="space-y-3">
                  {selectedJobLogs.map((log: any) => (
                    <div
                      key={log._id}
                      className={`p-4 rounded-lg border ${statusColors[log.status as keyof typeof statusColors]}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${statusBadgeColors[log.status as keyof typeof statusBadgeColors]}`}>
                          {log.status}
                        </span>
                        <span className="text-xs text-dark-muted">
                          {new Date(log.startedAt).toLocaleString()}
                        </span>
                      </div>
                      {log.output && (
                        <pre className="text-xs bg-dark-panel2/50 p-2 rounded overflow-x-auto mt-2 text-dark-text">
                          {log.output}
                        </pre>
                      )}
                      {log.error && (
                        <div className="text-xs text-dark-danger bg-dark-danger/10 p-2 rounded mt-2">
                          {log.error}
                        </div>
                      )}
                      {log.completedAt && (
                        <p className="text-xs text-dark-muted mt-2">
                          Duration: {Math.round((log.completedAt - log.startedAt) / 1000)}s
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
