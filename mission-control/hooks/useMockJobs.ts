/**
 * Mock jobs/cron data for Mission Control calendar
 * Displays scheduled agent tasks and their execution history
 */

import { useMemo } from "react";

export interface Job {
  _id: string;
  name: string;
  agent: string; // Agent name (e.g., "Teddy", "Emmie")
  agentEmoji: string; // Agent emoji (e.g., "🧸", "📧")
  description: string;
  schedule: string; // Cron expression or human-readable (e.g., "2:30 AM every day")
  nextRun: number; // Timestamp of next scheduled run
  lastRun?: number; // Timestamp of last execution
  status: "scheduled" | "running" | "completed" | "failed";
  frequency: "daily" | "every-3-days" | "weekly" | "monthly" | "once";
  enabled: boolean;
  jobId?: string; // OpenClaw cron job ID
  createdAt: number;
  updatedAt: number;
}

const NOW = Date.now();

// Helper: Next occurrence of a time today or tomorrow (GMT+8)
function getNextOccurrenceAtTime(hour: number, minute: number = 0): number {
  const now = new Date();
  
  // Set to Singapore timezone (GMT+8)
  const singaporeDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  
  const nextRun = new Date(singaporeDate);
  nextRun.setHours(hour, minute, 0, 0);
  
  // If that time has already passed today, schedule for tomorrow
  if (nextRun <= singaporeDate) {
    nextRun.setDate(nextRun.getDate() + 1);
  }
  
  return nextRun.getTime();
}

const MOCK_JOBS: Job[] = [
  {
    _id: 'job_teddy_cleanup',
    name: "Teddy's Telegram Cleanup",
    agent: 'Teddy',
    agentEmoji: '🧸',
    description: 'Delete "joined Telegram" system messages from DM chats',
    schedule: '2:30 AM GMT+8 every day',
    nextRun: getNextOccurrenceAtTime(2, 30),
    lastRun: NOW - 3600000, // 1 hour ago (mock)
    status: 'scheduled',
    frequency: 'daily',
    enabled: true,
    jobId: '766cf1fc-1f62-409b-b7af-e94998eedade',
    createdAt: NOW - 86400000,
    updatedAt: NOW,
  },
  
  {
    _id: 'job_emmie_inbox',
    name: "Emmie's 4AM Inbox Review",
    agent: 'Emmie',
    agentEmoji: '📧',
    description: 'Review inbox, apply cleanup rules, process 200+ emails',
    schedule: '4:00 AM GMT+8 every day',
    nextRun: getNextOccurrenceAtTime(4, 0),
    lastRun: NOW - 82800000, // ~23 hours ago
    status: 'scheduled',
    frequency: 'daily',
    enabled: true,
    jobId: '03a270b4-7912-4703-8ab7-62cb35185121',
    createdAt: NOW - 604800000,
    updatedAt: NOW,
  },
  
  {
    _id: 'job_backup_midnight',
    name: 'OpenClaw Midnight Backup',
    agent: 'System',
    agentEmoji: '💾',
    description: 'Backup OpenClaw workspace and configurations',
    schedule: '12:00 AM GMT+8 every day',
    nextRun: getNextOccurrenceAtTime(0, 0),
    lastRun: NOW - 3600000,
    status: 'completed',
    frequency: 'daily',
    enabled: true,
    createdAt: NOW - 1209600000,
    updatedAt: NOW,
  },
  
  {
    _id: 'job_backup_noon',
    name: 'OpenClaw Noon Backup',
    agent: 'System',
    agentEmoji: '💾',
    description: 'Backup OpenClaw workspace and configurations',
    schedule: '12:00 PM GMT+8 every day',
    nextRun: getNextOccurrenceAtTime(12, 0),
    lastRun: NOW - 86400000,
    status: 'completed',
    frequency: 'daily',
    enabled: true,
    createdAt: NOW - 1209600000,
    updatedAt: NOW,
  },
];

/**
 * Hook: Get all scheduled jobs for agents
 * Used by Mission Control calendar to display agent schedules
 */
export function useMockJobs(): Job[] {
  return useMemo(() => MOCK_JOBS, []);
}

/**
 * Hook: Get jobs for a specific agent
 */
export function useMockAgentJobs(agentName: string): Job[] {
  return useMemo(() => MOCK_JOBS.filter(job => job.agent === agentName), [agentName]);
}

/**
 * Hook: Get next scheduled job (across all agents)
 */
export function useNextScheduledJob(): Job | null {
  return useMemo(() => {
    const scheduled = MOCK_JOBS.filter(j => j.enabled && j.status === 'scheduled');
    if (scheduled.length === 0) return null;
    return scheduled.sort((a, b) => a.nextRun - b.nextRun)[0];
  }, []);
}

/**
 * Hook: Get job statistics
 */
export function useMockJobStats() {
  return useMemo(() => {
    const jobs = MOCK_JOBS;
    return {
      total: jobs.length,
      enabled: jobs.filter(j => j.enabled).length,
      scheduled: jobs.filter(j => j.status === 'scheduled').length,
      running: jobs.filter(j => j.status === 'running').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
    };
  }, []);
}

/**
 * PATTERN FOR ADDING NEW AGENTS:
 * 
 * When you create a new agent (e.g., "Bingo" for calendar management):
 * 
 * 1. Create the agent structure in `/agents/bingo/`
 * 2. Create a cron job via OpenClaw cron (get the jobId)
 * 3. Add a new job entry to MOCK_JOBS array:
 * 
 *    {
 *      _id: 'job_bingo_calendar',
 *      name: "Bingo's Calendar Sync",
 *      agent: 'Bingo',
 *      agentEmoji: '📅',
 *      description: 'Sync calendar events with Telegram',
 *      schedule: '8:00 AM GMT+8 every day',
 *      nextRun: getNextOccurrenceAtTime(8, 0),
 *      lastRun: undefined,
 *      status: 'scheduled',
 *      frequency: 'daily',
 *      enabled: true,
 *      jobId: '<job-id-from-openclaw>',
 *      createdAt: NOW,
 *      updatedAt: NOW,
 *    }
 * 
 * 4. Add agent to useMockAgents() in hooks/useMockAgents.ts
 * 5. Agent will automatically appear in:
 *    - Office Space (agent desk)
 *    - Team Space (team roster)
 *    - Calendar (scheduled jobs)
 * 
 * This way, every agent's schedule is visible and trackable in Mission Control.
 */
