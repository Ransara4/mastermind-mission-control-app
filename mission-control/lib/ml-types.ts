// ---- Raw filesystem shapes ----

export interface Gene {
  type: "Gene";
  id: string;
  category: string;
  signals_match: string[];
  preconditions: string[];
  strategy: string[];
  constraints: {
    max_files: number;
    forbidden_paths: string[];
  };
  validation: string[];
}

export interface GenesFile {
  version: number;
  genes: Gene[];
}

export interface Capsule {
  type: "Capsule";
  schema_version: string;
  id: string;
  trigger: string[];
  gene: string;
  summary: string;
  confidence: number;
  blast_radius: { files: number; lines: number };
  outcome: { status: string; score: number };
  success_streak: number;
  env_fingerprint: Record<string, string>;
  a2a: { eligible_to_broadcast: boolean };
  asset_id: string;
}

export interface CapsulesFile {
  version: number;
  capsules: Capsule[];
}

export interface FailedCapsulesFile {
  version: number;
  failed_capsules: Capsule[];
}

export interface CapabilityCandidate {
  type: "CapabilityCandidate";
  id: string;
  title: string;
  source: string;
  created_at: string;
  signals: string[];
  status?: "open" | "implemented" | "stale" | "dismissed";
  implementedBy?: string;
  implementedAt?: string;
  shape: {
    title: string;
    input: string;
    output: string;
    invariants: string;
    params: string;
    failure_points: string;
    evidence: string;
  };
}

export interface EvolutionEvent {
  type: "EvolutionEvent";
  id: string;
  intent: string;
  signals: string[];
  genes_used: string[];
  mutation_id: string;
  blast_radius: { files: number; lines: number };
  outcome: { status: string; score: number };
  capsule_id?: string;
  meta?: {
    at?: string;
    signal_key?: string;
    ml_stats?: MLStats;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface PersonalityState {
  type: "PersonalityState";
  rigor: number;
  creativity: number;
  verbosity: number;
  risk_tolerance: number;
  obedience: number;
}

export interface PersonalityFile {
  version: number;
  current: PersonalityState;
  stats: Record<string, unknown>;
  history: unknown[];
  updated_at: string;
}

export interface Mutation {
  type: "Mutation";
  id: string;
  category: string;
  trigger_signals: string[];
  target: string;
  expected_effect: string;
  risk_level: string;
}

export interface SolidifyState {
  last_run: {
    run_id: string;
    created_at: string;
    parent_event_id: string | null;
    selected_gene_id: string;
    selected_capsule_id: string;
    selector: {
      selected: string;
      reason: string[];
      alternatives: string[];
    };
    signals: string[];
    mutation: Mutation;
    mutation_id: string;
    personality_state: PersonalityState;
    personality_key: string;
    personality_known: boolean;
    personality_mutations: unknown[];
    drift: boolean;
    selected_by: string;
    source_type: string;
    blast_radius_estimate: { files: number; lines: number };
    active_task_id: string | null;
    active_task_title: string | null;
    applied_lessons: unknown[];
    hub_lessons: unknown[];
  };
}

export interface MemoryGraphEvent {
  type: "MemoryGraphEvent";
  kind: string;
  id: string;
  ts: string;
  [key: string]: unknown;
}

// ---- ML types ----

export interface FeedbackEntry {
  gene_id: string;
  signals: string[];
  error_hash: string;
  applied_at: string;
  env: string;
  status: "pending" | "proven" | "failed";
  cycles_since: number;
  resolved_at: string | null;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  proven: number;
  failed: number;
  success_rate: number;
}

export interface KnowledgeLesson {
  key: string;
  error_hash: string;
  gene_id: string;
  environment: string;
  confidence: number;
  times_applied: number;
  times_succeeded: number;
  times_failed: number;
  created_at: string;
  last_applied: string;
}

export interface KnowledgeStats {
  total_lessons: number;
  top_genes: {
    gene_id: string;
    avg_confidence: number;
    applications: number;
    successes: number;
  }[];
  avg_confidence: number;
  improvement_trend: "improving" | "declining" | "stable" | "none";
}

export interface PredictorStats {
  ready: boolean;
  sample_count: number;
  trained_at: string | null;
  min_required: number;
}

export interface ErrorCluster {
  id: string;
  label: string;
  error_count: number;
  first_seen: string;
  last_seen: string;
}

export interface MLStats {
  feedback?: FeedbackStats & { entries?: FeedbackEntry[] };
  knowledge?: KnowledgeStats & { lessons?: KnowledgeLesson[] };
  predictor?: PredictorStats;
  clusters?: ErrorCluster[];
}

// ---- Dashboard API response ----

export interface MLDashboard {
  stats: {
    geneCount: number;
    capsuleCount: number;
    failedCapsuleCount: number;
    candidateCount: number;
    successRate: number;
  };
  genes: Gene[];
  capsules: Capsule[];
  failedCapsules: Capsule[];
  candidates: CapabilityCandidate[];
  events: EvolutionEvent[];
  candidateStats: {
    open: number;
    implemented: number;
    stale: number;
    dismissed: number;
  };
  personality: PersonalityState | null;
  lastRun: {
    geneId: string;
    signals: string[];
    mutation: Mutation | null;
    riskLevel: string;
    createdAt: string;
    selectorReason: string[];
    blastRadius: { files: number; lines: number };
  } | null;
  memoryGraph: {
    total: number;
    byKind: Record<string, number>;
  };
  settings: {
    evolveStrategy: string;
    a2aHubUrl: string;
    pendingSleepMs: number;
    memoryGraphProvider: string;
    autoPublish: boolean;
    defaultVisibility: string;
    ollamaUrl: string;
    ollamaModel: string;
    ollamaAvailable: boolean;
  };
  ml: MLStats;
  daemon: {
    running: boolean;
    pid: number | null;
    scheduled: boolean;
    lastRunAt: string | null;
    nextRunAt: string | null;
  };
  version: string;
  lastUpdated: string;
}

export interface MLSettingsUpdate {
  key: string;
  value: string;
}
