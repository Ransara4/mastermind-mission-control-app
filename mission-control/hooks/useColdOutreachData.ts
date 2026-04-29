"use client";

import { useState, useEffect, useCallback } from "react";

export interface ICP {
  id: string;
  name: string;
  description: string;
  icp_tag: string;
  target_profile: Record<string, unknown>;
  niche_categories: string[];
  qualification_rules: { must_have: string[]; disqualify_if: string[] };
  track_definitions: Record<string, { name: string; criteria: string; angle?: string; hook_angle?: string }>;
  hook_template_id: string;
  total_leads: number;
  total_qualified: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Loaded when selected:
  hookTemplate?: HookTemplate;
}

export interface HookTemplate {
  template_id: string;
  template_name: string;
  credibility_block: string | { must_include: string; short_form?: string; partner?: string };
  format_rules: Record<string, string>;
  banned_words: string[];
  subject_line_formula: Record<string, unknown>;
  track_hooks: Record<string, { name: string; angle: string; key_framing?: string; example_framing?: string }>;
  prompt_template: string;
  output_schema: Record<string, string>;
  [key: string]: unknown;
}

export interface Batch {
  id: string;
  icp_id: string;
  icp_tag: string;
  created_at: string;
  candidates_searched: number;
  emails_verified: number;
  qualified: number;
  disqualified: number;
  track_a: number;
  track_b: number;
  uploaded: number;
  notes: string | null;
  instantly_campaign_id: string | null;
  instantly_uploaded_at: string | null;
  instantly_upload_count: number;
}

export interface DashboardStats {
  totalLeads: number;
  activeIcps: number;
  lastPipelineRun: string | null;
  googleSheetUrl: string | null;
  batchCount: number;
  totalContacts: number;
  totalLeadsFound: number;
  yesesToSend: number;
  notToSend: number;
  yesesToFindTarget: number;
}

export interface HookResult {
  qualified: boolean;
  disqualify_reason: string;
  track: string;
  first_name: string;
  last_name: string;
  niche: string;
  subject: string;
  hook: string;
  linkedin: string;
  open_rating: number;
  response_likelihood: number;
  raw_response?: string;
}

export interface TestModeResult {
  prospect: { name: string; domain: string; email?: string; research?: string };
  hookResult: HookResult;
}

export interface InstantlyCampaign {
  id: string;
  name: string;
  status: number;
}

export interface Settings {
  [key: string]: string;
}

export function useColdOutreachData() {
  const [icps, setIcps] = useState<ICP[]>([]);
  const [selectedIcpId, setSelectedIcpId] = useState<string | null>(null);
  const [selectedIcp, setSelectedIcp] = useState<ICP | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [settings, setSettingsState] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Hook testing state
  const [testResult, setTestResult] = useState<HookResult | null>(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);

  // Pipeline state
  const [pipelineStatus, setPipelineStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // Instantly state
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [uploadingBatchId, setUploadingBatchId] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-outreach");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      const data = await res.json();
      setStats(data.stats || null);
    } catch (err) {
      console.error("fetchDashboard error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  const fetchIcps = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-outreach/icps");
      if (!res.ok) throw new Error("Failed to fetch ICPs");
      const data = await res.json();
      setIcps(data.icps || []);
    } catch (err) {
      console.error("fetchIcps error:", err);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-outreach/batches");
      if (!res.ok) throw new Error("Failed to fetch batches");
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error("fetchBatches error:", err);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/cold-outreach/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data = await res.json();
      setSettingsState(data.settings || {});
    } catch (err) {
      console.error("fetchSettings error:", err);
    }
  }, []);

  const selectIcp = useCallback(async (id: string) => {
    setSelectedIcpId(id);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch(`/api/cold-outreach/icps?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch ICP");
      const data = await res.json();
      setSelectedIcp(data.icp || null);
    } catch (err) {
      console.error("selectIcp error:", err);
      setSelectedIcp(null);
    }
  }, []);

  const createIcp = useCallback(async (data: Partial<ICP> & { hook_template?: Partial<HookTemplate> }) => {
    const res = await fetch("/api/cold-outreach/icps", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to create ICP");
    }
    const result = await res.json();
    await fetchIcps();
    await fetchDashboard();
    return result;
  }, [fetchIcps, fetchDashboard]);

  const updateIcp = useCallback(async (id: string, data: Partial<ICP> & { hook_template?: Partial<HookTemplate> }) => {
    const res = await fetch("/api/cold-outreach/icps", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || "Failed to update ICP");
    }
    const result = await res.json();
    if (selectedIcpId === id) await selectIcp(id);
    await fetchIcps();
    return result;
  }, [fetchIcps, selectedIcpId, selectIcp]);

  const testHook = useCallback(async (prospect: { name: string; domain: string; email?: string; research?: string }) => {
    if (!selectedIcpId) throw new Error("No ICP selected");
    setTestLoading(true);
    setTestResult(null);
    setTestError(null);
    try {
      const res = await fetch("/api/cold-outreach/test-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp_id: selectedIcpId,
          prospect_name: prospect.name,
          prospect_domain: prospect.domain,
          prospect_email: prospect.email,
          research_notes: prospect.research,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestError(data.error || "Failed to generate test hook");
        return null;
      }
      setTestResult(data.hookResult || null);
      return data.hookResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate test hook";
      setTestError(msg);
      return null;
    } finally {
      setTestLoading(false);
    }
  }, [selectedIcpId]);

  // Test mode batch (3 prospects)
  const [testModeResults, setTestModeResults] = useState<TestModeResult[]>([]);
  const [testModeLoading, setTestModeLoading] = useState(false);
  const [testModeError, setTestModeError] = useState<string | null>(null);

  const testModeBatch = useCallback(async (prospects: { name: string; domain: string; email?: string; research?: string }[]) => {
    if (!selectedIcpId) throw new Error("No ICP selected");
    setTestModeLoading(true);
    setTestModeResults([]);
    setTestModeError(null);
    try {
      const res = await fetch("/api/cold-outreach/test-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp_id: selectedIcpId,
          batch: prospects,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setTestModeError(data.error || "Failed to run test batch");
        return [];
      }
      setTestModeResults(data.results || []);
      return data.results || [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Test mode failed";
      setTestModeError(msg);
      return [];
    } finally {
      setTestModeLoading(false);
    }
  }, [selectedIcpId]);

  const rewriteHook = useCallback(async (prospect: { name: string; domain: string; email?: string; research?: string }, index: number) => {
    if (!selectedIcpId) return null;
    try {
      const res = await fetch("/api/cold-outreach/test-hook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          icp_id: selectedIcpId,
          prospect_name: prospect.name,
          prospect_domain: prospect.domain,
          prospect_email: prospect.email,
          research_notes: prospect.research,
        }),
      });
      const data = await res.json();
      if (!res.ok) return null;
      // Update the specific result in testModeResults
      setTestModeResults(prev => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { prospect, hookResult: data.hookResult };
        }
        return next;
      });
      return data.hookResult;
    } catch {
      return null;
    }
  }, [selectedIcpId]);

  const triggerPipeline = useCallback(async (icpId: string, opts?: { skipUpload?: boolean }) => {
    setPipelineStatus("running");
    setPipelineError(null);
    try {
      const res = await fetch("/api/cold-outreach/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icp_id: icpId, skip_upload: opts?.skipUpload ?? false }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to trigger pipeline");
      }
      const result = await res.json();
      setPipelineStatus("success");
      // Auto-reset after 5 seconds
      setTimeout(() => setPipelineStatus("idle"), 5000);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Pipeline failed";
      setPipelineError(msg);
      setPipelineStatus("error");
      setTimeout(() => setPipelineStatus("idle"), 8000);
      throw err;
    }
  }, []);

  const fetchCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    try {
      const res = await fetch("/api/cold-outreach/instantly?action=campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      console.error("fetchCampaigns error:", err);
    } finally {
      setCampaignsLoading(false);
    }
  }, []);

  const uploadToInstantly = useCallback(async (batchId: string, campaignId: string) => {
    setUploadingBatchId(batchId);
    try {
      const res = await fetch("/api/cold-outreach/instantly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload", batch_id: batchId, campaign_id: campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      await fetchBatches();
      return data;
    } finally {
      setUploadingBatchId(null);
    }
  }, [fetchBatches]);

  const updateSettings = useCallback(async (updates: Record<string, string>) => {
    const res = await fetch("/api/cold-outreach/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update settings");
    await fetchSettings();
    return res.json();
  }, [fetchSettings]);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDashboard(), fetchIcps(), fetchBatches(), fetchSettings()]).finally(() =>
      setLoading(false)
    );
  }, [fetchDashboard, fetchIcps, fetchBatches, fetchSettings]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchDashboard(), fetchIcps(), fetchBatches(), fetchSettings()]);
    setLoading(false);
  }, [fetchDashboard, fetchIcps, fetchBatches, fetchSettings]);

  return {
    icps,
    selectedIcpId,
    selectedIcp,
    batches,
    stats,
    settings,
    loading,
    error,
    testResult,
    testLoading,
    testError,
    pipelineStatus,
    pipelineError,
    fetchDashboard,
    selectIcp,
    createIcp,
    updateIcp,
    testHook,
    triggerPipeline,
    updateSettings,
    refresh,
    campaigns,
    campaignsLoading,
    uploadingBatchId,
    fetchCampaigns,
    uploadToInstantly,
    testModeResults,
    testModeLoading,
    testModeError,
    testModeBatch,
    rewriteHook,
  };
}
