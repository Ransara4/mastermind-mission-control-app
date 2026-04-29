/**
 * Types for the central agent registry (agent-registry.json)
 */

export interface RegistryAgentOffice {
  defaultStatus: "idle" | "working" | "blocked" | "done";
  defaultActivityLevel: number;
  avgTaskTime: number;
}

export interface RegistryAgentTelegram {
  enabled: boolean;
  commands: string[];
  keywords: string[];
  canReceiveInbound: boolean;
  handler?: string;
}

export interface RegistryAgent {
  agentId: string;
  name: string;
  avatar: string;
  role: string;
  bio: string;
  skills: string[];
  email: string;
  reportsTo?: string;
  office: RegistryAgentOffice;
  telegram: RegistryAgentTelegram;
}

export interface AgentRegistry {
  version: number;
  agents: RegistryAgent[];
}
