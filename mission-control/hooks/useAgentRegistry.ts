"use client";

import { useMemo } from "react";
import type { TeamMember, Agent } from "./useMockTeam";
import type { AgentRegistry } from "@/lib/agent-registry-types";
import registryData from "@/lib/agent-registry.json";

const agents = (registryData as AgentRegistry).agents;

/**
 * Derives TeamMember[] from the agent registry.
 * Drop-in replacement for useMockTeam().
 */
export function useRegistryTeam(): TeamMember[] {
  return useMemo(
    () =>
      agents.map((a) => ({
        _id: `${a.agentId}-${a.role.toLowerCase().replace(/\s+/g, "-")}`,
        agentId: a.agentId,
        name: a.name,
        role: a.role,
        avatar: a.avatar,
        email: a.email,
        skills: a.skills,
        bio: a.bio,
        reportsTo: a.reportsTo,
      })),
    []
  );
}

/**
 * Derives Agent[] (office data) from the agent registry.
 * Drop-in replacement for useMockAgents().
 */
export function useRegistryAgents(): Agent[] {
  return useMemo(() => {
    const now = Date.now();
    const second = 1000;

    return agents.map((a) => ({
      _id: `${a.agentId}-agent`,
      agentId: a.agentId,
      name: a.name,
      status: a.office.defaultStatus,
      currentTask: a.office.defaultStatus === "working" ? getDefaultTask(a.agentId) : undefined,
      taskProgress: a.office.defaultStatus === "working" ? getDefaultProgress(a.agentId) : undefined,
      currentActivityLevel: a.office.defaultActivityLevel,
      tasksCompleted: getDefaultTasksCompleted(a.agentId),
      avgTaskTime: a.office.avgTaskTime,
      heartbeatAt: now - Math.floor(Math.random() * 45) * second,
    }));
  }, []);
}

/**
 * Returns a Record<agentId, avatar> from the registry.
 * Drop-in replacement for the hardcoded agentAvatars map.
 */
export function useAgentAvatars(): Record<string, string> {
  return useMemo(
    () =>
      Object.fromEntries(agents.map((a) => [a.agentId, a.avatar])),
    []
  );
}

// --- Default mock values for office display ---

function getDefaultTask(agentId: string): string {
  const tasks: Record<string, string> = {
    joe: "Reviewing team progress and planning next sprint",
    uni: "Building mock data integration for team pages",
    stripe: "Monitoring payment activity and link status",
    gumroad: "Managing product listings and tracking sales",
  };
  return tasks[agentId] || "Processing tasks";
}

function getDefaultProgress(agentId: string): number {
  const progress: Record<string, number> = {
    joe: 65,
    uni: 90,
    stripe: 40,
    gumroad: 30,
  };
  return progress[agentId] || 50;
}

function getDefaultTasksCompleted(agentId: string): number {
  const completed: Record<string, number> = {
    joe: 24,
    uni: 38,
    emmy: 156,
    teddy: 0,
    "guard-dog": 42,
    wix: 0,
    stripe: 12,
    gumroad: 0,
  };
  return completed[agentId] ?? 0;
}
