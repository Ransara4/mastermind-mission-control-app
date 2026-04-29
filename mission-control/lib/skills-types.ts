export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  version: string;
  installed_date: string;
  status: "active" | "inactive" | "error";
  description: string;
  location: string;
  commands: string[];
  dependencies: string[];
  logs: string;
  docs: string;
  authType?: string;
  authStatus?: string;
  requiresAuth?: boolean;
}

export type SkillType =
  | "credential-manager"
  | "agent"
  | "skill"
  | "integration"
  | "tool";

export interface SkillsRegistry {
  version: string;
  lastUpdated: string;
  skills: Skill[];
}

export interface SkillsDashboard {
  registry: SkillsRegistry;
  stats: {
    total: number;
    active: number;
    inactive: number;
    error: number;
    byType: Record<SkillType, number>;
  };
}
