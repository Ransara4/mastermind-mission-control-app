/**
 * Mock data hooks for Team Space and Office Space
 *
 * Agent definitions (useMockTeam, useMockAgents) have been replaced by
 * useAgentRegistry.ts which derives data from agent-registry.json.
 *
 * This file retains interfaces and useMockActivities() (event data).
 */

import { useMemo } from "react";

export interface TeamMember {
  _id: string;
  agentId: string;
  name: string;
  role: string;
  avatar: string;
  email?: string;
  skills: string[];
  bio: string;
  reportsTo?: string;
}

export interface Activity {
  agentId: string;
  action: string;
  description: string;
  timestamp: number;
}

export interface Agent {
  _id: string;
  agentId: string;
  name: string;
  status: "idle" | "working" | "blocked" | "done";
  currentTask?: string;
  taskProgress?: number;
  currentActivityLevel: number;
  tasksCompleted: number;
  avgTaskTime: number;
  heartbeatAt: number;
}

/**
 * Returns recent team activities
 */
export function useMockActivities(): Activity[] {
  return useMemo(() => {
    const now = Date.now();
    const minute = 60 * 1000;
    const hour = 60 * minute;

    return [
      {
        agentId: "joe",
        action: "created task",
        description: "Set up Mission Control dashboard layout",
        timestamp: now - 5 * minute,
      },
      {
        agentId: "uni",
        action: "completed task",
        description: "Implemented mock data for team pages",
        timestamp: now - 12 * minute,
      },
      {
        agentId: "emmy",
        action: "processed emails",
        description: "Filtered 47 emails and flagged 3 for review",
        timestamp: now - 18 * minute,
      },
      {
        agentId: "uni",
        action: "pushed code",
        description: "Updated navigation and sidebar components",
        timestamp: now - 35 * minute,
      },
      {
        agentId: "joe",
        action: "reviewed progress",
        description: "Checked task completion status",
        timestamp: now - 45 * minute,
      },
      {
        agentId: "emmy",
        action: "scheduled automation",
        description: "Set up daily inbox cleanup rule",
        timestamp: now - 1 * hour,
      },
      {
        agentId: "uni",
        action: "refactored code",
        description: "Cleaned up task management hooks",
        timestamp: now - 1.5 * hour,
      },
      {
        agentId: "joe",
        action: "assigned task",
        description: "Delegated API integration to Uni",
        timestamp: now - 2 * hour,
      },
      {
        agentId: "emmy",
        action: "generated report",
        description: "Daily email summary sent to Joe",
        timestamp: now - 2.5 * hour,
      },
      {
        agentId: "uni",
        action: "fixed bug",
        description: "Resolved task status update issue",
        timestamp: now - 3 * hour,
      },
      {
        agentId: "teddy",
        action: "initialized",
        description: "Telegram manager agent setup complete",
        timestamp: now - 3.5 * hour,
      },
      {
        agentId: "scrooge",
        action: "optimized resources",
        description: "Reduced backup storage by 15% through compression",
        timestamp: now - 4 * hour,
      },
      {
        agentId: "guard-dog",
        action: "security scan",
        description: "Completed daily security scan - no threats detected",
        timestamp: now - 5 * hour,
      },
      {
        agentId: "wix",
        action: "initialized",
        description: "Wix agent set up — connected to 3 active sites with API access",
        timestamp: now - 1 * minute,
      },
      {
        agentId: "stripe",
        action: "synced data",
        description: "Payment links and promo codes refreshed from Stripe API",
        timestamp: now - 2 * minute,
      },
    ];
  }, []);
}
