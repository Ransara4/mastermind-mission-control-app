"use client";

import { useState, useEffect } from "react";
import {
  Mail,
  Users,
  Clock,
  ExternalLink,
  Plus,
  Save,
  Play,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Tag,
  FileText,
  Zap,
  AlertCircle,
  Upload,
  Search,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Target,
  GitBranch,
  ArrowRight,
  Terminal,
  Database,
} from "lucide-react";
import {
  useColdOutreachData,
  type ICP,
  type HookTemplate,
} from "@/hooks/useColdOutreachData";

/* ── Stat Card ─────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  href?: string;
}) {
  const inner = (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dark-muted">{label}</span>
        <div className="p-1.5 rounded-lg bg-cm-purple/15">
          <Icon size={16} className="text-cm-purple" />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-text truncate">{value}</p>
    </div>
  );
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block hover:ring-2 hover:ring-cm-purple rounded-xl transition-all">
        {inner}
      </a>
    );
  }
  return inner;
}

/* ── Toast Banner ──────────────────────────────────────────────── */

function Toast({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "info";
  message: string;
  onDismiss?: () => void;
}) {
  const styles = {
    success: "bg-dark-success/10 border-dark-success/30 text-dark-success",
    error: "bg-dark-danger/10 border-dark-danger/30 text-dark-danger",
    info: "bg-cm-purple/10 border-cm-purple/30 text-cm-purple",
  };
  const icons = {
    success: <CheckCircle size={16} className="text-dark-success flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-dark-danger flex-shrink-0" />,
    info: <Loader2 size={16} className="text-cm-purple animate-spin flex-shrink-0" />,
  };

  return (
    <div className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm ${styles[type]}`}>
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="p-0.5 rounded hover:bg-dark-panel2">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* ── Create ICP Modal ──────────────────────────────────────────── */

function CreateIcpModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: Partial<ICP> & { hook_template?: Partial<HookTemplate> }) => Promise<unknown>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const slugify = (s: string) =>
    "icp_" +
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30);

  const id = slugify(name || "new");
  const [icpTag, setIcpTag] = useState("");

  // Auto-populate tag from name if not manually edited
  const [tagManuallyEdited, setTagManuallyEdited] = useState(false);
  const effectiveTag = tagManuallyEdited ? icpTag : id;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setCreateError(null);
    try {
      await onCreate({
        id,
        name: name.trim(),
        description: description.trim(),
        icp_tag: effectiveTag,
        target_profile: {},
        niche_categories: [],
        qualification_rules: { must_have: [], disqualify_if: [] },
        track_definitions: {},
        hook_template_id: `${id}_hook`,
        status: "active",
        hook_template: {
          template_id: `${id}_hook`,
          template_name: `${name.trim()} Hook Template`,
          credibility_block: "",
          format_rules: {},
          banned_words: [],
          subject_line_formula: {},
          track_hooks: {},
          prompt_template: "",
          output_schema: {},
        },
      });
      onClose();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create ICP");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-dark-panel rounded-xl border border-dark-border shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold tracking-tight text-dark-text">Create New ICP</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-dark-panel2">
            <X size={18} className="text-dark-muted" />
          </button>
        </div>

        {createError && (
          <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
            <AlertCircle size={14} className="flex-shrink-0" />
            {createError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="e.g. Coaching Business Owners"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              ICP ID <span className="text-dark-muted font-normal">(auto-generated)</span>
            </label>
            <input
              value={id}
              readOnly
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm bg-dark-bg text-dark-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              ICP Tag <span className="text-dark-muted font-normal">(for Google Sheet tagging)</span>
            </label>
            <input
              value={effectiveTag}
              onChange={(e) => { setIcpTag(e.target.value); setTagManuallyEdited(true); }}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="e.g. icp_coaching_owners"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="Describe this ICP..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-dark-muted rounded-lg hover:bg-dark-panel2"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || saving}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? "Creating..." : "Create ICP"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */

export default function ColdOutreachPage() {
  const {
    icps,
    selectedIcpId,
    selectedIcp,
    batches,
    stats,
    loading,
    error,
    pipelineStatus,
    pipelineError,
    selectIcp,
    createIcp,
    updateIcp,
    triggerPipeline,
    refresh,
    campaigns,
    campaignsLoading,
    uploadingBatchId,
    fetchCampaigns,
    uploadToInstantly,
    updateSettings,
  } = useColdOutreachData();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [uploadToast, setUploadToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [tagIssues, setTagIssues] = useState<{ icp_id: string; issue: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "pipeline">("dashboard");

  // Fetch campaigns and tag issues on mount
  useEffect(() => {
    fetchCampaigns();
    fetch("/api/cold-outreach/icps")
      .then((r) => r.json())
      .then((d) => { if (d.tag_issues) setTagIssues(d.tag_issues); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-select first ICP once loaded
  useEffect(() => {
    if (!loading && icps.length > 0 && !selectedIcpId) {
      selectIcp(icps[0].id);
    }
  }, [loading, icps, selectedIcpId, selectIcp]);

  // Editable ICP fields
  const [editName, setEditName] = useState("");
  const [editIcpTag, setEditIcpTag] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingIcp, setSavingIcp] = useState(false);
  const [savedIcp, setSavedIcp] = useState(false);
  const [saveIcpError, setSaveIcpError] = useState<string | null>(null);

  // Hook writer editable fields
  const [editCredibility, setEditCredibility] = useState("");
  const [editBannedWords, setEditBannedWords] = useState<string[]>([]);
  const [bannedWordInput, setBannedWordInput] = useState("");
  const [editPromptTemplate, setEditPromptTemplate] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [savingHook, setSavingHook] = useState(false);
  const [savedHook, setSavedHook] = useState(false);
  const [saveHookError, setSaveHookError] = useState<string | null>(null);

  // Target Profile (key-value pairs)
  const [editTargetProfile, setEditTargetProfile] = useState<Record<string, string>>({});
  const [newProfileKey, setNewProfileKey] = useState("");
  const [newProfileValue, setNewProfileValue] = useState("");

  // Niche Categories (string array)
  const [editNicheCategories, setEditNicheCategories] = useState<string[]>([]);
  const [nicheCategoryInput, setNicheCategoryInput] = useState("");

  // Qualification Rules
  const [editMustHave, setEditMustHave] = useState<string[]>([]);
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [editDisqualifyIf, setEditDisqualifyIf] = useState<string[]>([]);
  const [disqualifyIfInput, setDisqualifyIfInput] = useState("");

  // Track Definitions (keyed object)
  const [editTrackDefs, setEditTrackDefs] = useState<Record<string, { name: string; criteria: string; angle: string }>>({});

  // Format Rules (key-value, lives on hookTemplate)
  const [editFormatRules, setEditFormatRules] = useState<Record<string, string>>({});
  const [newFormatKey, setNewFormatKey] = useState("");
  const [newFormatValue, setNewFormatValue] = useState("");

  // Subject Line Formula (key-value, lives on hookTemplate)
  const [editSubjectFormula, setEditSubjectFormula] = useState<Record<string, unknown>>({});


  // Test Mode
  const [testModeEnabled, setTestModeEnabled] = useState(false);

  // When ICP selection changes, populate editable fields
  const handleSelectIcp = async (id: string) => {
    await selectIcp(id);
  };

  // Populate edit fields when selectedIcp changes
  const populateFields = (icp: ICP) => {
    setEditName(icp.name);
    setEditIcpTag(icp.icp_tag || "");
    setEditDescription(icp.description);

    // Target profile
    const tp = typeof icp.target_profile === "object" && icp.target_profile ? icp.target_profile : {};
    const tpStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(tp)) tpStrings[k] = String(v);
    setEditTargetProfile(tpStrings);

    // Niche categories
    setEditNicheCategories(Array.isArray(icp.niche_categories) ? [...icp.niche_categories] : []);

    // Qualification rules
    const qr = icp.qualification_rules || { must_have: [], disqualify_if: [] };
    setEditMustHave(Array.isArray(qr.must_have) ? [...qr.must_have] : []);
    setEditDisqualifyIf(Array.isArray(qr.disqualify_if) ? [...qr.disqualify_if] : []);

    // Track definitions
    const td = typeof icp.track_definitions === "object" && icp.track_definitions ? icp.track_definitions : {};
    const tdClone: Record<string, { name: string; criteria: string; angle: string }> = {};
    for (const [k, v] of Object.entries(td)) {
      tdClone[k] = { name: v.name || "", criteria: v.criteria || "", angle: (v as Record<string, string>).angle || (v as Record<string, string>).hook_angle || "" };
    }
    setEditTrackDefs(tdClone);

    // Hook template fields
    const ht = icp.hookTemplate;
    if (ht) {
      setEditCredibility(
        typeof ht.credibility_block === "string"
          ? ht.credibility_block
          : JSON.stringify(ht.credibility_block, null, 2)
      );
      setEditBannedWords([...(ht.banned_words || [])]);
      setEditPromptTemplate(ht.prompt_template || "");

      const fr = ht.format_rules || {};
      const frStrings: Record<string, string> = {};
      for (const [k, v] of Object.entries(fr)) frStrings[k] = String(v);
      setEditFormatRules(frStrings);

      setEditSubjectFormula(ht.subject_line_formula || {});
    } else {
      setEditCredibility("");
      setEditBannedWords([]);
      setEditPromptTemplate("");
      setEditFormatRules({});
      setEditSubjectFormula({});
    }
    setSavedIcp(false);
    setSavedHook(false);
    setSaveIcpError(null);
    setSaveHookError(null);
  };

  // Track previous selectedIcp to detect changes
  const [prevIcpId, setPrevIcpId] = useState<string | null>(null);
  if (selectedIcp && selectedIcp.id !== prevIcpId) {
    setPrevIcpId(selectedIcp.id);
    populateFields(selectedIcp);
  }

  const handleSaveIcp = async () => {
    if (!selectedIcp) return;
    setSavingIcp(true);
    setSaveIcpError(null);
    try {
      await updateIcp(selectedIcp.id, {
        name: editName,
        icp_tag: editIcpTag,
        description: editDescription,
        target_profile: editTargetProfile,
        niche_categories: editNicheCategories,
        qualification_rules: { must_have: editMustHave, disqualify_if: editDisqualifyIf },
        track_definitions: editTrackDefs,
      });
      setSavedIcp(true);
      setTimeout(() => setSavedIcp(false), 3000);
    } catch (err) {
      setSaveIcpError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingIcp(false);
    }
  };

  const handleSaveHook = async () => {
    if (!selectedIcp) return;
    setSavingHook(true);
    setSaveHookError(null);
    try {
      await updateIcp(selectedIcp.id, {
        hook_template: {
          credibility_block: editCredibility,
          banned_words: editBannedWords,
          prompt_template: editPromptTemplate,
          format_rules: editFormatRules,
          subject_line_formula: editSubjectFormula,
        },
      });
      setSavedHook(true);
      setTimeout(() => setSavedHook(false), 3000);
    } catch (err) {
      setSaveHookError(err instanceof Error ? err.message : "Failed to save hook");
    } finally {
      setSavingHook(false);
    }
  };

  const handleTriggerPipeline = async () => {
    if (!selectedIcpId) return;
    try {
      await triggerPipeline(selectedIcpId, { skipUpload: testModeEnabled });
      setTimeout(refresh, 3000);
    } catch {
      // Error handled by hook state
    }
  };

  const addBannedWord = () => {
    const w = bannedWordInput.trim();
    if (w && !editBannedWords.includes(w)) {
      setEditBannedWords([...editBannedWords, w]);
    }
    setBannedWordInput("");
  };

  const removeBannedWord = (word: string) => {
    setEditBannedWords(editBannedWords.filter((w) => w !== word));
  };

  /* ── Loading / Error ──────────────────────────────────────────── */

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading cold outreach...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <XCircle className="text-dark-danger mb-4" size={32} />
        <p className="text-dark-muted mb-2">{error}</p>
        <p className="text-xs text-dark-muted mb-4">Check the browser console for details.</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80"
        >
          Retry
        </button>
      </div>
    );
  }

  const sortedBatches = [...batches].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6">
      {/* ── Tab Navigation ────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-dark-panel border border-dark-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "dashboard"
              ? "bg-cm-purple text-white"
              : "text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          <Target size={16} />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "pipeline"
              ? "bg-cm-purple text-white"
              : "text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          <GitBranch size={16} />
          Pipeline Backend
        </button>
      </div>

      {activeTab === "dashboard" && (
      <>
      {/* ── Primary Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Contacts"
          value={stats?.totalContacts ?? 0}
          icon={Search}
        />
        <StatCard
          label="Total Leads Found"
          value={stats?.totalLeadsFound ?? 0}
          icon={Users}
        />
        <StatCard
          label="Yeses to Send"
          value={stats?.yesesToSend ?? 0}
          icon={ThumbsUp}
        />
        <StatCard
          label="Not to Send"
          value={stats?.notToSend ?? 0}
          icon={ThumbsDown}
        />
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-dark-muted">Yeses to Find</span>
            <div className="p-1.5 rounded-lg bg-cm-purple/15">
              <Target size={16} className="text-cm-purple" />
            </div>
          </div>
          {editingTarget ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateSettings({ yeses_to_find_target: targetInput });
                    setEditingTarget(false);
                    setTimeout(refresh, 500);
                  }
                  if (e.key === "Escape") setEditingTarget(false);
                }}
                className="w-20 text-2xl font-bold text-dark-text border-b-2 border-cm-purple outline-none bg-transparent"
                autoFocus
              />
              <button
                onClick={() => {
                  updateSettings({ yeses_to_find_target: targetInput });
                  setEditingTarget(false);
                  setTimeout(refresh, 500);
                }}
                className="text-cm-purple hover:text-cm-purple-mid"
              >
                <CheckCircle size={16} />
              </button>
            </div>
          ) : (
            <p
              className="text-2xl font-bold text-dark-text truncate cursor-pointer hover:text-cm-purple transition-colors"
              onClick={() => { setTargetInput(String(stats?.yesesToFindTarget ?? 0)); setEditingTarget(true); }}
              title="Click to edit"
            >
              {stats?.yesesToFindTarget ?? 0}
            </p>
          )}
        </div>
      </div>

      {/* ── Secondary Stats ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Active ICPs"
          value={stats?.activeIcps ?? 0}
          icon={Tag}
        />
        <StatCard
          label="Last Pipeline Run"
          value={stats?.lastPipelineRun ? new Date(stats.lastPipelineRun).toLocaleDateString() : "Never"}
          icon={Clock}
        />
        <StatCard
          label="Google Sheet"
          value={stats?.googleSheetUrl ? "Open Sheet" : "Not configured"}
          icon={ExternalLink}
          href={stats?.googleSheetUrl || undefined}
        />
      </div>

      {/* ── Actions: Mode Segmented Control + Run Pipeline + Campaign ── */}
      <div className="flex items-center justify-end gap-3 flex-wrap">
        <div className="inline-flex rounded-lg border border-dark-border overflow-hidden text-sm">
          <button
            onClick={() => setTestModeEnabled(true)}
            className={`px-4 py-1.5 transition-colors ${
              testModeEnabled
                ? "bg-cm-purple text-white font-medium"
                : "bg-dark-panel text-dark-muted hover:bg-dark-bg"
            }`}
          >
            Test: won&apos;t upload to Instantly
          </button>
          <button
            onClick={() => setTestModeEnabled(false)}
            className={`px-4 py-1.5 transition-colors border-l border-dark-border ${
              !testModeEnabled
                ? "bg-cm-purple text-white font-medium"
                : "bg-dark-panel text-dark-muted hover:bg-dark-bg"
            }`}
          >
            Live: will upload to Instantly
          </button>
        </div>

        {/* Campaign selector — only in live mode */}
        {!testModeEnabled && (
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-dark-muted" />
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple min-w-[220px]"
            >
              <option value="">Select campaign...</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 1 ? "(Active)" : c.status === 0 ? "(Inactive)" : ""}
                </option>
              ))}
            </select>
            <button
              onClick={fetchCampaigns}
              disabled={campaignsLoading}
              className="p-1.5 text-dark-muted hover:text-dark-muted disabled:opacity-50"
              title="Refresh campaigns"
            >
              <RefreshCw size={14} className={campaignsLoading ? "animate-spin" : ""} />
            </button>
          </div>
        )}

        <button
          onClick={handleTriggerPipeline}
          disabled={pipelineStatus === "running" || !selectedIcpId}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm text-white rounded-lg disabled:opacity-50 bg-cm-purple hover:bg-cm-purple/80"
        >
          {pipelineStatus === "running" ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {pipelineStatus === "running"
            ? "Running..."
            : testModeEnabled
              ? "Run Pipeline (Test)"
              : "Run Pipeline (Live)"}
        </button>
      </div>

      {/* ── Pipeline Status Toast ─────────────────────────────────── */}
      {pipelineStatus === "running" && (
        <Toast type="info" message="Pipeline is running... This may take a moment." />
      )}
      {pipelineStatus === "success" && (
        <Toast type="success" message="Pipeline run queued successfully. Data will refresh shortly." />
      )}
      {pipelineStatus === "error" && (
        <Toast type="error" message={pipelineError || "Pipeline failed. Check logs for details."} />
      )}

      {/* ── Main Two-Column Layout ──────────────────────────────── */}
      <div className="flex gap-6">
        {/* Left: ICP List */}
        <div className="w-80 flex-shrink-0 space-y-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cm-purple text-white rounded-xl hover:bg-cm-purple/80 transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Create New ICP
          </button>

          {icps.length === 0 && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-6 text-center text-dark-muted text-sm">
              No ICPs yet. Create one to get started.
            </div>
          )}

          {icps.map((icp) => {
            const hasTagIssue = tagIssues.some((t) => t.icp_id === icp.id);
            return (
            <button
              key={icp.id}
              onClick={() => handleSelectIcp(icp.id)}
              className={`w-full text-left bg-dark-panel border rounded-xl p-4 transition-all ${
                selectedIcpId === icp.id
                  ? "border-cm-purple ring-2 ring-cm-purple/20"
                  : "border-dark-border hover:border-cm-purple/30"
              }`}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-semibold text-dark-text text-sm">{icp.name}</h4>
                  {hasTagIssue && (
                    <span title="ICP tag mismatch" className="text-dark-warn">
                      <AlertCircle size={14} />
                    </span>
                  )}
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    icp.status === "active"
                      ? "bg-cm-purple/15 text-cm-purple border border-cm-purple/20"
                      : icp.status === "paused"
                      ? "bg-dark-panel2 text-dark-muted border border-dark-border"
                      : "bg-dark-panel2 text-dark-muted border border-dark-border"
                  }`}
                >
                  {icp.status}
                </span>
              </div>
              <p className="text-xs text-dark-muted line-clamp-2 mb-2">{icp.description}</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded">
                  {icp.icp_tag}
                </span>
                <span className="text-xs bg-dark-panel2 border border-dark-border text-dark-muted px-2 py-0.5 rounded-full font-medium">
                  {icp.total_leads} leads
                </span>
                <span className="text-xs bg-dark-bg text-dark-muted px-2 py-0.5 rounded-full">
                  {icp.total_qualified} qualified
                </span>
              </div>
            </button>
            );
          })}
        </div>

        {/* Right: ICP Detail */}
        <div className="flex-1 min-w-0 space-y-6">
          {!selectedIcp ? (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-12 text-center">
              <FileText size={48} className="mx-auto text-dark-muted mb-4" />
              <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">Select an ICP</h3>
              <p className="text-sm text-dark-muted">
                Choose an ICP from the left panel to view and edit its targeting profile, hook writer, and test hooks.
              </p>
            </div>
          ) : (
            <>
              {/* Section A: ICP Targeting Profile */}
              <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold tracking-tight text-dark-text flex items-center gap-2">
                    <Users size={18} className="text-cm-purple" />
                    ICP Targeting Profile
                  </h3>
                  <button
                    onClick={handleSaveIcp}
                    disabled={savingIcp}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
                  >
                    {savingIcp ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : savedIcp ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    {savingIcp ? "Saving..." : savedIcp ? "Saved!" : "Save"}
                  </button>
                </div>

                {saveIcpError && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {saveIcpError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                  </div>

                  {/* ICP Tag */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">
                      ICP Tag <span className="text-dark-muted font-normal">(underscore format, e.g. Coaches_Consultants)</span>
                    </label>
                    <input
                      value={editIcpTag}
                      onChange={(e) => setEditIcpTag(e.target.value.replace(/\s+/g, "_"))}
                      className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cm-purple"
                      placeholder="e.g. Coaches_Consultants"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-20 resize-none focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                  </div>

                  {/* Target Profile (editable key-value) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Target Profile</label>
                    <div className="space-y-2">
                      {Object.entries(editTargetProfile).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border">{key}</span>
                          <input
                            value={val}
                            onChange={(e) => setEditTargetProfile({ ...editTargetProfile, [key]: e.target.value })}
                            className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                          />
                          <button
                            onClick={() => {
                              const next = { ...editTargetProfile };
                              delete next[key];
                              setEditTargetProfile(next);
                            }}
                            className="p-1 text-dark-danger/70 hover:text-dark-danger"
                            title="Remove"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={newProfileKey}
                          onChange={(e) => setNewProfileKey(e.target.value)}
                          placeholder="New key..."
                          className="w-36 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <input
                          value={newProfileValue}
                          onChange={(e) => setNewProfileValue(e.target.value)}
                          placeholder="Value..."
                          className="flex-1 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <button
                          onClick={() => {
                            if (newProfileKey.trim()) {
                              setEditTargetProfile({ ...editTargetProfile, [newProfileKey.trim()]: newProfileValue.trim() });
                              setNewProfileKey("");
                              setNewProfileValue("");
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Niche Categories (editable tag list) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">
                      Niche Categories <span className="text-dark-muted font-normal">({editNicheCategories.length})</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editNicheCategories.map((cat, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 px-2.5 py-1 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium"
                        >
                          <Tag size={10} />
                          {cat}
                          <button
                            onClick={() => setEditNicheCategories(editNicheCategories.filter((_, i) => i !== idx))}
                            className="hover:text-dark-danger ml-0.5"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {editNicheCategories.length === 0 && (
                        <span className="text-xs text-dark-muted italic">No niches defined</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={nicheCategoryInput}
                        onChange={(e) => setNicheCategoryInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            const val = nicheCategoryInput.trim();
                            if (val && !editNicheCategories.includes(val)) {
                              setEditNicheCategories([...editNicheCategories, val]);
                            }
                            setNicheCategoryInput("");
                          }
                        }}
                        placeholder="Add niche category..."
                        className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                      />
                      <button
                        onClick={() => {
                          const val = nicheCategoryInput.trim();
                          if (val && !editNicheCategories.includes(val)) {
                            setEditNicheCategories([...editNicheCategories, val]);
                          }
                          setNicheCategoryInput("");
                        }}
                        className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Qualification Rules (editable lists) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Must Have */}
                    <div>
                      <label className="block text-sm font-medium text-dark-success mb-1">Must Have</label>
                      <ul className="space-y-1 mb-2">
                        {editMustHave.map((rule, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-dark-muted group">
                            <CheckCircle size={14} className="text-dark-success mt-0.5 flex-shrink-0" />
                            <input
                              value={rule}
                              onChange={(e) => {
                                const next = [...editMustHave];
                                next[i] = e.target.value;
                                setEditMustHave(next);
                              }}
                              className="flex-1 bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none py-0.5 text-sm"
                            />
                            <button
                              onClick={() => setEditMustHave(editMustHave.filter((_, idx) => idx !== i))}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-danger/70 hover:text-dark-danger"
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                        {editMustHave.length === 0 && (
                          <li className="text-xs text-dark-muted italic">None defined</li>
                        )}
                      </ul>
                      <div className="flex gap-2">
                        <input
                          value={mustHaveInput}
                          onChange={(e) => setMustHaveInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (mustHaveInput.trim()) {
                                setEditMustHave([...editMustHave, mustHaveInput.trim()]);
                                setMustHaveInput("");
                              }
                            }
                          }}
                          placeholder="Add rule..."
                          className="flex-1 border border-dark-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <button
                          onClick={() => {
                            if (mustHaveInput.trim()) {
                              setEditMustHave([...editMustHave, mustHaveInput.trim()]);
                              setMustHaveInput("");
                            }
                          }}
                          className="px-2 py-1 text-xs bg-dark-success/20 text-dark-success rounded-lg hover:bg-dark-success/20"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Disqualify If */}
                    <div>
                      <label className="block text-sm font-medium text-dark-danger mb-1">Disqualify If</label>
                      <ul className="space-y-1 mb-2">
                        {editDisqualifyIf.map((rule, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-sm text-dark-muted group">
                            <XCircle size={14} className="text-dark-danger mt-0.5 flex-shrink-0" />
                            <input
                              value={rule}
                              onChange={(e) => {
                                const next = [...editDisqualifyIf];
                                next[i] = e.target.value;
                                setEditDisqualifyIf(next);
                              }}
                              className="flex-1 bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none py-0.5 text-sm"
                            />
                            <button
                              onClick={() => setEditDisqualifyIf(editDisqualifyIf.filter((_, idx) => idx !== i))}
                              className="opacity-0 group-hover:opacity-100 p-0.5 text-dark-danger/70 hover:text-dark-danger"
                            >
                              <X size={12} />
                            </button>
                          </li>
                        ))}
                        {editDisqualifyIf.length === 0 && (
                          <li className="text-xs text-dark-muted italic">None defined</li>
                        )}
                      </ul>
                      <div className="flex gap-2">
                        <input
                          value={disqualifyIfInput}
                          onChange={(e) => setDisqualifyIfInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (disqualifyIfInput.trim()) {
                                setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
                                setDisqualifyIfInput("");
                              }
                            }
                          }}
                          placeholder="Add rule..."
                          className="flex-1 border border-dark-border rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <button
                          onClick={() => {
                            if (disqualifyIfInput.trim()) {
                              setEditDisqualifyIf([...editDisqualifyIf, disqualifyIfInput.trim()]);
                              setDisqualifyIfInput("");
                            }
                          }}
                          className="px-2 py-1 text-xs bg-dark-danger/20 text-dark-danger rounded-lg hover:bg-dark-danger/20"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Track Definitions (editable) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-2">Track Definitions</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(editTrackDefs).map(([trackKey, track]) => (
                        <div key={trackKey} className="bg-dark-bg rounded-lg p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              trackKey.toLowerCase().includes("a") || trackKey.toLowerCase().includes("collab")
                                ? "bg-cm-purple/20 text-cm-purple" : "bg-cm-purple/15 text-cm-purple"
                            }`}>
                              {trackKey}
                            </span>
                            <input
                              value={track.name}
                              onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, name: e.target.value } })}
                              className="flex-1 text-sm font-semibold bg-transparent border-b border-transparent hover:border-cm-purple/30 focus:border-cm-purple focus:outline-none"
                              placeholder="Track name"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-dark-muted">Criteria</label>
                            <input
                              value={track.criteria}
                              onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, criteria: e.target.value } })}
                              className="w-full text-xs bg-dark-panel border border-dark-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-dark-muted">Angle</label>
                            <input
                              value={track.angle}
                              onChange={(e) => setEditTrackDefs({ ...editTrackDefs, [trackKey]: { ...track, angle: e.target.value } })}
                              className="w-full text-xs bg-dark-panel border border-dark-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {Object.keys(editTrackDefs).length === 0 && (
                      <p className="text-xs text-dark-muted italic">No tracks defined</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Section B: Hook Writer */}
              <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold tracking-tight text-dark-text flex items-center gap-2">
                    <Zap size={18} className="text-cm-purple" />
                    Hook Writer
                  </h3>
                  <button
                    onClick={handleSaveHook}
                    disabled={savingHook}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50"
                  >
                    {savingHook ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : savedHook ? (
                      <CheckCircle size={14} />
                    ) : (
                      <Save size={14} />
                    )}
                    {savingHook ? "Saving..." : savedHook ? "Saved!" : "Save"}
                  </button>
                </div>

                {saveHookError && (
                  <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg text-sm text-dark-danger">
                    <AlertCircle size={14} className="flex-shrink-0" />
                    {saveHookError}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Track Context Panel */}
                  {selectedIcp.hookTemplate?.track_hooks && Object.keys(selectedIcp.hookTemplate.track_hooks).length > 0 && (
                    <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
                      <h4 className="text-sm font-bold text-dark-text mb-2">Track Context</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(selectedIcp.hookTemplate.track_hooks).map(([key, track]) => (
                          <div key={key} className="bg-dark-panel/80 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                key.toLowerCase().includes("collab") || key.toLowerCase().includes("a")
                                  ? "bg-cm-purple/20 text-cm-purple"
                                  : "bg-cm-purple/15 text-cm-purple"
                              }`}>
                                {key}
                              </span>
                              <span className="text-sm font-medium text-dark-text">{track.name}</span>
                            </div>
                            <p className="text-xs text-dark-muted">{track.angle}</p>
                            {track.key_framing && (
                              <p className="text-xs text-dark-muted mt-1">Framing: {track.key_framing}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Credibility Block */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Credibility Block</label>
                    <textarea
                      value={editCredibility}
                      onChange={(e) => setEditCredibility(e.target.value)}
                      className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-cm-purple"
                      placeholder="Your credibility statement..."
                    />
                  </div>

                  {/* Format Rules (editable key-value) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Format Rules</label>
                    <div className="space-y-2">
                      {Object.entries(editFormatRules).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border truncate">{key}</span>
                          <input
                            value={val}
                            onChange={(e) => setEditFormatRules({ ...editFormatRules, [key]: e.target.value })}
                            className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                          />
                          <button
                            onClick={() => {
                              const next = { ...editFormatRules };
                              delete next[key];
                              setEditFormatRules(next);
                            }}
                            className="p-1 text-dark-danger/70 hover:text-dark-danger"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                      {Object.keys(editFormatRules).length === 0 && (
                        <p className="text-xs text-dark-muted italic">No format rules</p>
                      )}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          value={newFormatKey}
                          onChange={(e) => setNewFormatKey(e.target.value)}
                          placeholder="Rule name..."
                          className="w-36 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <input
                          value={newFormatValue}
                          onChange={(e) => setNewFormatValue(e.target.value)}
                          placeholder="Rule value..."
                          className="flex-1 border border-dark-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        />
                        <button
                          onClick={() => {
                            if (newFormatKey.trim()) {
                              setEditFormatRules({ ...editFormatRules, [newFormatKey.trim()]: newFormatValue.trim() });
                              setNewFormatKey("");
                              setNewFormatValue("");
                            }
                          }}
                          className="px-3 py-1.5 text-xs bg-cm-purple/20 text-cm-purple rounded-lg hover:bg-cm-purple/20"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Banned Words */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Banned Words</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editBannedWords.map((word) => (
                        <span
                          key={word}
                          className="flex items-center gap-1 px-2 py-0.5 bg-dark-danger/10 text-dark-danger rounded-full text-xs"
                        >
                          {word}
                          <button onClick={() => removeBannedWord(word)} className="hover:text-dark-danger">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {editBannedWords.length === 0 && (
                        <span className="text-xs text-dark-muted italic">No banned words</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={bannedWordInput}
                        onChange={(e) => setBannedWordInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBannedWord();
                          }
                        }}
                        placeholder="Add banned word..."
                        className="flex-1 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                      />
                      <button
                        onClick={addBannedWord}
                        className="px-3 py-1.5 text-xs bg-dark-danger/20 text-dark-danger rounded-lg hover:bg-dark-danger/20"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Subject Line Formula (editable) */}
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Subject Line Formula</label>
                    <div className="space-y-2">
                      {Object.entries(editSubjectFormula).map(([key, val]) => (
                        <div key={key} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-dark-muted min-w-[140px] bg-dark-bg px-2 py-1.5 rounded-l-lg border border-dark-border">{key}</span>
                          {typeof val === "boolean" ? (
                            <label className="flex items-center gap-2 flex-1 px-3 py-1.5">
                              <input
                                type="checkbox"
                                checked={val}
                                onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.checked })}
                                className="rounded border-dark-border"
                              />
                              <span className="text-sm text-dark-muted">{val ? "Yes" : "No"}</span>
                            </label>
                          ) : typeof val === "number" ? (
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: Number(e.target.value) })}
                              className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                            />
                          ) : Array.isArray(val) ? (
                            <input
                              value={val.join(", ")}
                              onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                              className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                              placeholder="Comma-separated values"
                            />
                          ) : (
                            <input
                              value={String(val)}
                              onChange={(e) => setEditSubjectFormula({ ...editSubjectFormula, [key]: e.target.value })}
                              className="flex-1 border border-dark-border rounded-r-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                            />
                          )}
                        </div>
                      ))}
                      {Object.keys(editSubjectFormula).length === 0 && (
                        <p className="text-xs text-dark-muted italic">No subject line formula</p>
                      )}
                    </div>
                  </div>

                  {/* Prompt Template */}
                  <div>
                    <button
                      onClick={() => setPromptExpanded(!promptExpanded)}
                      className="flex items-center gap-2 text-sm font-medium text-dark-text mb-1 hover:text-dark-text"
                    >
                      Prompt Template
                      {promptExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {promptExpanded && (
                      <textarea
                        value={editPromptTemplate}
                        onChange={(e) => setEditPromptTemplate(e.target.value)}
                        className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm h-48 resize-y font-mono focus:outline-none focus:ring-2 focus:ring-cm-purple"
                        placeholder="Prompt template for hook generation..."
                      />
                    )}
                  </div>
                </div>
              </div>

            </>
          )}
        </div>
      </div>

      {/* ── Upload Toast ─────────────────────────────────────────── */}
      {uploadToast && (
        <Toast type={uploadToast.type} message={uploadToast.message} onDismiss={() => setUploadToast(null)} />
      )}

      {/* ── Batch History Table ──────────────────────────────────── */}
      <div className="bg-dark-panel border border-dark-border rounded-xl">
        <div className="px-4 py-3 border-b border-dark-border">
          <h3 className="font-semibold text-dark-text flex items-center gap-2">
            <FileText size={16} />
            Batch History
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border text-left">
                <th className="px-4 py-2.5 font-medium text-dark-muted">Batch ID</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted">ICP</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted">Date</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Searched</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Verified</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Qualified</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Track A</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Track B</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted text-right">Uploaded</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted">Campaign</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted">Upload Status</th>
                <th className="px-4 py-2.5 font-medium text-dark-muted"></th>
              </tr>
            </thead>
            <tbody>
              {sortedBatches.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-dark-muted">
                    No batches yet. Run a pipeline to create the first batch.
                  </td>
                </tr>
              ) : (
                sortedBatches.map((batch, i) => (
                  <tr
                    key={batch.id}
                    className={`border-b border-dark-border ${i % 2 === 1 ? "bg-dark-bg/50" : ""}`}
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-dark-muted">{batch.id}</td>
                    <td className="px-4 py-2.5">
                      <span className="text-xs bg-cm-purple/10 text-cm-purple px-2 py-0.5 rounded-full">
                        {batch.icp_tag}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-dark-muted">
                      {new Date(batch.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-right text-dark-text">{batch.candidates_searched}</td>
                    <td className="px-4 py-2.5 text-right text-dark-text">{batch.emails_verified}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-dark-success">{batch.qualified}</td>
                    <td className="px-4 py-2.5 text-right text-cm-purple">{batch.track_a}</td>
                    <td className="px-4 py-2.5 text-right text-cm-purple">{batch.track_b}</td>
                    <td className="px-4 py-2.5 text-right text-dark-text">{batch.uploaded}</td>
                    <td className="px-4 py-2.5 text-dark-muted text-xs">
                      {batch.instantly_campaign_id ? (
                        <a
                          href={`https://app.instantly.ai/app/campaign/${batch.instantly_campaign_id}/leads`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cm-purple hover:underline"
                        >
                          View Campaign
                        </a>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {batch.instantly_uploaded_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-dark-success/20 text-dark-success">
                          <CheckCircle size={10} />
                          {batch.instantly_upload_count} uploaded {new Date(batch.instantly_uploaded_at).toLocaleDateString()}
                        </span>
                      ) : batch.uploaded > 0 ? (
                        <span className="text-xs text-dark-warn font-medium">Pending</span>
                      ) : (
                        <span className="text-xs text-dark-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {batch.uploaded > 0 && !batch.instantly_uploaded_at && (
                        <button
                          onClick={async () => {
                            if (!selectedCampaignId) {
                              setUploadToast({ type: "error", message: "Select a campaign first" });
                              return;
                            }
                            try {
                              const result = await uploadToInstantly(batch.id, selectedCampaignId);
                              setUploadToast({
                                type: "success",
                                message: `Uploaded ${result.uploaded} leads! View at app.instantly.ai`,
                              });
                            } catch (err) {
                              setUploadToast({
                                type: "error",
                                message: err instanceof Error ? err.message : "Upload failed",
                              });
                            }
                          }}
                          disabled={uploadingBatchId === batch.id}
                          className="flex items-center gap-1.5 px-3 py-1 text-xs bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 whitespace-nowrap"
                        >
                          {uploadingBatchId === batch.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Upload size={12} />
                          )}
                          {uploadingBatchId === batch.id ? "Uploading..." : "Upload to Instantly"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create ICP Modal ────────────────────────────────────── */}
      {showCreateModal && (
        <CreateIcpModal
          onClose={() => setShowCreateModal(false)}
          onCreate={createIcp}
        />
      )}
      </>
      )}

      {activeTab === "pipeline" && (
        <div className="space-y-6">
          {/* 1. Pipeline Architecture */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <GitBranch size={18} className="text-cm-purple" />
              Pipeline Architecture
            </h3>
            <p className="text-sm text-dark-muted mb-6">
              End-to-end flow from prospect discovery to email delivery. Each stage gates the next &mdash; prospects only advance if they pass all checks.
            </p>

            {/* Full 10-Stage Pipeline Diagram */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              {[
                { stage: "1", name: "Scout Discovery", desc: "Tavily web search across ICP niches", icon: Search, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "2", name: "Signal Scoring", desc: "Score on service fit, audience, pain, content", icon: Zap, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "3", name: "Qualification", desc: "ICP rules, track assignment, dedup", icon: CheckCircle, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "4", name: "Email Waterfall", desc: "Hunter find, pattern guess, Bouncer verify", icon: Mail, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "5", name: "Hook Writing", desc: "Opus writes personalized hooks per prospect", icon: FileText, color: "bg-dark-panel2 border-dark-border text-dark-text" },
              ].map((s, i) => (
                <div key={s.stage} className="relative">
                  <div className={`border rounded-xl p-3 ${s.color} h-full`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-bold opacity-60">STAGE {s.stage}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon size={14} />
                      <h4 className="font-semibold text-xs">{s.name}</h4>
                    </div>
                    <p className="text-[11px] opacity-80">{s.desc}</p>
                  </div>
                  {i < 4 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-dark-muted">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { stage: "6", name: "Hook Rating", desc: "Rate open likelihood + response chance", icon: Target, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "7", name: "Sheet Export", desc: "21-column append with conditional formatting", icon: Database, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "8", name: "Validation", desc: "Pre/post-upload integrity checks", icon: AlertCircle, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "9", name: "Instantly Upload", desc: "Send=Yes rows pushed to campaigns", icon: Upload, color: "bg-dark-panel2 border-dark-border text-dark-text" },
                { stage: "H", name: "Human Review", desc: "Joe reviews before any email goes out", icon: Users, color: "bg-dark-panel2 border-dark-border text-dark-text" },
              ].map((s, i) => (
                <div key={s.stage} className="relative">
                  <div className={`border rounded-xl p-3 ${s.color} h-full`}>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-[10px] font-bold opacity-60">{s.stage === "H" ? "GATE" : `STAGE ${s.stage}`}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon size={14} />
                      <h4 className="font-semibold text-xs">{s.name}</h4>
                    </div>
                    <p className="text-[11px] opacity-80">{s.desc}</p>
                  </div>
                  {i < 4 && (
                    <div className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 text-dark-muted">
                      <ArrowRight size={14} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. Scout Module (Stages 1-4) */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <Search size={18} className="text-cm-purple" />
              Scout Module (Stages 1-4)
            </h3>
            <div className="space-y-4">
              {/* Discovery */}
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-cm-purple">STAGE 1</span>
                  <h4 className="font-semibold text-sm text-dark-text">Discovery</h4>
                </div>
                <div className="text-xs text-dark-text space-y-1.5">
                  <p>Uses <span className="font-mono bg-cm-purple/20 px-1 rounded">Tavily API</span> (basic search depth, max 5 results per query) to find prospect websites.</p>
                  <p>For each niche in the ICP, two queries are generated: <span className="font-mono text-[11px]">&quot;&#123;niche&#125; online coach website&quot;</span> and <span className="font-mono text-[11px]">&quot;&#123;niche&#125; coaching program community membership&quot;</span>.</p>
                  <p>Searches run until <span className="font-semibold">3x the target count</span> is reached (buffer for filtering). Known non-prospect domains are auto-skipped (LinkedIn, YouTube, Medium, Udemy, etc. &mdash; 30+ excluded domains).</p>
                  <p>Each unique domain is captured with its page title, snippet (first 500 chars), niche tag, and source URL.</p>
                </div>
              </div>

              {/* Signal Scoring */}
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-cm-purple">STAGE 2</span>
                  <h4 className="font-semibold text-sm text-dark-text">Signal Scoring</h4>
                </div>
                <div className="text-xs text-dark-text space-y-1.5">
                  <p>Every prospect is scored 0-100 based on six signal categories. Threshold to proceed: <span className="font-mono font-bold">25+</span>.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Service Keywords (0-25)</p>
                      <p className="text-[11px]">coach, consultant, mentor, program, course, membership, community, workshop, clients &mdash; 5 pts each, capped at 25</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Individual Person (0-20)</p>
                      <p className="text-[11px]">&quot;I&quot;, &quot;my story&quot;, &quot;about me&quot; signals vs. &quot;our team&quot;, &quot;our agency&quot; signals. Solo = +20, likely individual = +10</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Audience Match (0-20)</p>
                      <p className="text-[11px]">solopreneur, freelancer, entrepreneur, small business owner, service provider &mdash; 5 pts each, capped at 20</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Pain Indicators (0-15)</p>
                      <p className="text-[11px]">overwhelm, too busy, burnout, juggling, automat*, streamline &mdash; 5 pts each, capped at 15</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Content Presence (0-10)</p>
                      <p className="text-[11px]">blog, podcast, newsletter, YouTube, book, author &mdash; 3 pts each, capped at 10</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border">
                      <p className="font-semibold text-cm-purple">Disqualification (-20 each)</p>
                      <p className="text-[11px]">automation consultant, AI consultant, SaaS, software company, SEO agency, digital marketing agency</p>
                    </div>
                  </div>
                  <p className="mt-1">Bonus: +10 if a person name is successfully extracted from the page title/snippet/domain.</p>
                </div>
              </div>

              {/* Qualification */}
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-dark-success">STAGE 3</span>
                  <h4 className="font-semibold text-sm text-dark-text">Qualification</h4>
                </div>
                <div className="text-xs text-dark-text space-y-1.5">
                  <p>Applies ICP rules from <span className="font-mono bg-dark-panel2 px-1 rounded">icps/&#123;icp_id&#125;/icp.json</span> and deduplicates against all existing leads.</p>
                  <p><span className="font-semibold">Dedup checks:</span> Name match against spreadsheet + all prior scout batches + batch tracker. Domain match against the same. Both intra-batch and cross-batch dedup.</p>
                  <p><span className="font-semibold">Must have:</span> An extractable person name (first + last). Prospects without names are rejected.</p>
                  <p><span className="font-semibold">Disqualify if:</span> ICP <span className="font-mono text-[11px]">disqualify_if</span> rules (keyword matching against snippet, 50% keyword overlap threshold).</p>
                  <p><span className="font-semibold">Track assignment:</span></p>
                  <div className="flex gap-3 mt-1">
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border flex-1">
                      <p className="font-semibold text-dark-success">Collab (default)</p>
                      <p className="text-[11px]">Prospect has clients, community, membership, students, audience. Offer = free online-program for their group, explore revenue share.</p>
                    </div>
                    <div className="bg-dark-panel/60 rounded-lg p-2 border border-dark-border flex-1">
                      <p className="font-semibold text-dark-success">Direct</p>
                      <p className="text-[11px]">Solo practitioner, freelancer, independent. Offer = &quot;would learning about AI tools be useful for you?&quot;</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email Waterfall */}
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-cm-purple">STAGE 4</span>
                  <h4 className="font-semibold text-sm text-dark-text">Email Waterfall</h4>
                </div>
                <div className="text-xs text-dark-text space-y-1.5">
                  <p>Three-step fallback chain to find a verified email for each qualified prospect:</p>
                  <div className="space-y-1 mt-1">
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">1.</span>
                      <p><span className="font-semibold">Hunter.io Email Finder</span> &mdash; name + domain lookup. Accepted if confidence score is 70+.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">2.</span>
                      <p><span className="font-semibold">Hunter.io Domain Search</span> &mdash; returns all known emails at the domain. First tries name-matching, then falls back to the first &quot;personal&quot; type email found.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-mono text-cm-purple font-bold text-[11px] mt-0.5">3.</span>
                      <p><span className="font-semibold">Pattern Guess + Verify</span> &mdash; generates <span className="font-mono text-[11px]">first@domain</span>, <span className="font-mono text-[11px]">first.last@domain</span>, <span className="font-mono text-[11px]">flast@domain</span>, <span className="font-mono text-[11px]">hello@</span>, <span className="font-mono text-[11px]">info@</span>, <span className="font-mono text-[11px]">contact@</span>. Each pattern verified via Hunter Email Verifier &mdash; accepted if status is &quot;valid&quot; or &quot;accept_all&quot;.</p>
                    </div>
                  </div>
                  <p className="mt-1">Optional: <span className="font-mono bg-dark-panel2 px-1 rounded">Bouncer API</span> as secondary verification if configured. Rate-limited at 0.5s between lookups.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Hook Writer */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <FileText size={18} className="text-cm-purple" />
              Hook Writer (Stage 5)
            </h3>
            <p className="text-sm text-dark-muted mb-4">
              Each hook is written by <span className="font-semibold">Opus</span> (Claude&apos;s most capable model). This is where tone and nuance matter &mdash; the difference between &quot;sounds like a person&quot; and &quot;sounds like a marketer.&quot; Everything else in the pipeline runs on faster models.
            </p>

            <div className="space-y-3">
              {/* Research Profile Input */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Research Profile Input</h4>
                <p className="text-xs text-dark-muted">
                  Each hook is personalized using the prospect&apos;s research profile with four sections: <span className="font-semibold">WHO</span> (background, career arc, origin story), <span className="font-semibold">WHAT</span> (programs, products, communities), <span className="font-semibold">WHY</span> (turning point, mission), <span className="font-semibold">AUDIENCE</span> (who they serve, pain points). The hook writer can only write once all four sections have specifics &mdash; not generalities.
                </p>
              </div>

              {/* Credibility Block */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Credibility Block Injection</h4>
                <p className="text-xs text-dark-muted">
                  Every hook must naturally weave in Joe&apos;s credibility: &quot;founded NYC&apos;s largest corporate software training company&quot; (NYIM Training, 1999-2017, 90,000+ people trained). Phrasing varies per hook &mdash; never listed like a resume. Examples: &quot;I had the largest software training company in New York for 18 years&quot; or &quot;I&apos;ve trained over 90,000 people on business technology.&quot;
                </p>
              </div>

              {/* Track-Specific Angle */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Track-Specific Angle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-dark-muted">
                  <div className="bg-dark-success/10 rounded p-2">
                    <p className="font-semibold text-dark-success">Collab Track</p>
                    <p>&quot;I could bring value to YOUR people. Free online-program for your group, explore ways to collaborate, extra income for both of us.&quot; Used when they have clients/community who could learn AI tools.</p>
                  </div>
                  <div className="bg-cm-purple/10 rounded p-2">
                    <p className="font-semibold text-cm-purple">Direct Track</p>
                    <p>&quot;Would learning about the newest AI tools be useful for you?&quot; Used for solo practitioners without large communities. Never mention the online-program name in Email 1.</p>
                  </div>
                </div>
              </div>

              {/* Hook Structure */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Hook Structure (4 Parts)</h4>
                <div className="text-xs text-dark-muted space-y-1">
                  <p><span className="font-semibold">1. Warm Opener</span> (1-2 sentences) &mdash; Something specific from their site. Must ONLY apply to this person. &quot;Hey [name], what a cool job...&quot; Fun and genuine, never generic.</p>
                  <p><span className="font-semibold">2. Credibility</span> (1-2 sentences) &mdash; Joe&apos;s story woven naturally. Training company, 90K people, non-techie approach.</p>
                  <p><span className="font-semibold">3. Offer/Bridge</span> (1-2 sentences) &mdash; Track-specific pitch. Collab = free online-program for their clients. Direct = AI tools for them personally.</p>
                  <p><span className="font-semibold">4. Easy Close</span> (1 sentence) &mdash; Low-pressure, answerable in under 5 seconds. &quot;Let me know if this sounds interesting.&quot;</p>
                </div>
              </div>

              {/* Subject Line Formula */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Subject Line Formula</h4>
                <p className="text-xs text-dark-muted">
                  3-7 words. Must reference something specific they built, said, or achieved. Formulas: <span className="font-mono text-[11px]">[Their program] + a question</span>, <span className="font-mono text-[11px]">[Their claim] + a question</span>, <span className="font-mono text-[11px]">[Their brand] + a thought</span>. No exclamation marks, no all-caps, no spam words, no em dashes.
                </p>
              </div>

              {/* Banned Words + Format Rules */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="border border-dark-border bg-dark-panel2 rounded-lg p-3">
                  <h4 className="font-semibold text-xs text-dark-danger mb-1">Banned Words/Phrases</h4>
                  <p className="text-[11px] text-dark-muted leading-relaxed">
                    innovative, revolutionary, game-changing, cutting-edge, leverage, synergy, alignment, scalable, scale, scaling, excited, partnership opportunity, &quot;I wanted to reach out&quot;, &quot;I hope this finds you well&quot;, &quot;I would love to connect&quot;, &quot;We help X do Y&quot;, genuinely, honestly, straightforward
                  </p>
                </div>
                <div className="border border-cm-purple/20 rounded-lg p-3">
                  <h4 className="font-semibold text-xs text-cm-purple mb-1">Format Rules</h4>
                  <div className="text-[11px] text-dark-muted space-y-0.5">
                    <p>75-125 words (sweet spot: 90-110)</p>
                    <p>Must start with &quot;Hey [name],&quot;</p>
                    <p>First person as Joe (&quot;I&quot; not &quot;we&quot;)</p>
                    <p>Conversational tone &mdash; coffee shop test</p>
                    <p>No em dashes (use &quot; - &quot; with spaces)</p>
                    <p>Max 1 exclamation mark per hook</p>
                    <p>Soft CTA, no hard sales pitch</p>
                  </div>
                </div>
              </div>

              {/* Quality Validation */}
              <div className="border border-cm-purple/20 rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Quality Validation (Before Acceptance)</h4>
                <p className="text-xs text-dark-muted">
                  Each hook is checked against all rules before it&apos;s accepted: opener references something specific from their site, correct angle chosen, credibility appears naturally, close is easy and low-pressure, word count in range, no banned phrases, no em dashes, written as Joe in first person. Hooks that fail any check are rewritten.
                </p>
              </div>
            </div>
          </div>

          {/* 4. Hook Rater */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <Target size={18} className="text-cm-purple" />
              Hook Rater (Stage 6)
            </h3>
            <p className="text-sm text-dark-muted mb-4">
              Each hook is evaluated <span className="font-semibold">as if you are the recipient</span>. Two independent scores determine whether the hook ships or gets rewritten.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <h4 className="font-semibold text-sm text-dark-text mb-2">Open Rating (1-10)</h4>
                <p className="text-xs text-dark-text mb-2">Would this subject line + opening make the prospect open the email?</p>
                <div className="text-[11px] text-dark-muted space-y-0.5">
                  <p><span className="font-semibold text-dark-success">8-10:</span> Ships as-is. Subject is specific, opener hooks attention.</p>
                  <p><span className="font-semibold text-dark-warn">6-7:</span> Yellow flag. Cell gets highlighted in the sheet for manual review.</p>
                  <p><span className="font-semibold text-dark-danger">Below 8:</span> Hook gets rewritten. Iterates until it hits 8+.</p>
                </div>
              </div>
              <div className="border border-dark-border bg-dark-panel2 rounded-xl p-4">
                <h4 className="font-semibold text-sm text-dark-text mb-2">Response Likelihood (1-10)</h4>
                <p className="text-xs text-dark-text mb-2">Would the prospect actually reply to this email?</p>
                <div className="text-[11px] text-dark-muted space-y-0.5">
                  <p><span className="font-semibold text-dark-success">8-10:</span> High likelihood. Prioritize for sending.</p>
                  <p><span className="font-semibold text-dark-warn">6-7:</span> Moderate. Good but not exceptional. Yellow cell in Yes rows.</p>
                  <p><span className="font-semibold text-dark-danger">1-5:</span> Consider rewriting or deprioritizing.</p>
                </div>
              </div>
            </div>

            <div className="border border-dark-border rounded-lg p-3">
              <h4 className="font-semibold text-xs text-cm-purple mb-1">Factors Evaluated</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-dark-muted">
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Subject specificity (mentions their exact program/achievement)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Personalization depth (opener could only be about this person)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Value clarity (is the offer obvious and relevant?)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Spam feel (would a human suspect this is automated?)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Length and punchiness (under 90 words scores higher)</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <CheckCircle size={12} className="text-dark-success mt-0.5 shrink-0" />
                  <span>Personal touches (humor, relatable details, partner mention)</span>
                </div>
              </div>
            </div>

            <div className="mt-3 bg-dark-panel border border-dark-border rounded-lg p-3 text-xs text-dark-muted">
              <span className="font-bold">Hard Rule:</span> Open Rating must be 8+ or the hook gets rewritten. Rewrites iterate until they hit the threshold. This ensures no weak hooks make it to the sheet.
            </div>
          </div>

          {/* 5. Sheet Export & Formatting */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <Database size={18} className="text-cm-purple" />
              Sheet Export &amp; Formatting (Stage 7)
            </h3>
            <p className="text-sm text-dark-muted mb-4">
              Prospects are appended to the &quot;All Prospects&quot; Google Sheet with a 21-column structure. The spreadsheet is the source of truth &mdash; manual edits survive every future pipeline run.
            </p>

            {/* 21-column structure */}
            <div className="mb-4">
              <h4 className="font-semibold text-xs text-dark-text mb-2">21-Column Structure</h4>
              <div className="bg-dark-bg rounded-lg p-3 overflow-x-auto">
                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  {[
                    "#", "First Name", "Last Name", "Subject Line", "Hook",
                    "Open Rating", "Prospect Profile", "Niche/Focus", "Notes",
                    "Email", "Website", "LinkedIn", "Score", "Tier", "Send?",
                    "Track", "Response Likelihood", "Warm-Up Status",
                    "Uploaded to Instantly", "ICP Tag", "Date Added"
                  ].map((col, i) => (
                    <span key={i} className="bg-dark-panel border border-dark-border px-2 py-0.5 rounded font-mono">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Row coloring */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
                <div className="w-4 h-4 rounded bg-dark-success shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-dark-success">Green Row</p>
                  <p className="text-dark-success">Send = Yes (score 95+)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
                <div className="w-4 h-4 rounded bg-dark-warn shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-cm-purple">Amber Row</p>
                  <p className="text-dark-warn">Send = Qualify (score 80-94)</p>
                </div>
              </div>
              <div className="flex items-center gap-2 border border-dark-border bg-dark-panel2 rounded-lg p-2.5">
                <div className="w-4 h-4 rounded bg-dark-danger shrink-0" />
                <div className="text-xs">
                  <p className="font-semibold text-dark-danger">Red Row</p>
                  <p className="text-dark-danger">Send = No (score below 80)</p>
                </div>
              </div>
            </div>

            <div className="border border-dark-border bg-dark-panel2 rounded-lg p-3 text-xs text-dark-muted">
              <span className="font-bold text-cm-purple">Yellow Cell Override:</span> Within green (Send=Yes) rows only, the Open Rating cell or Response Likelihood cell turns yellow if its value is 7 or below. This flags hooks that shipped but may need attention &mdash; the row is green but the individual rating is soft.
            </div>

            <div className="mt-3 text-xs text-dark-muted space-y-1">
              <p><span className="font-semibold">IDs:</span> Sequential, continuing from the last row in the sheet. Never resets.</p>
              <p><span className="font-semibold">Date Added:</span> Tracks when each lead was added (YYYY-MM-DD format).</p>
              <p><span className="font-semibold">Append-only:</span> Existing rows are never modified by the pipeline. Dedup runs against all existing rows before appending.</p>
            </div>
          </div>

          {/* 6. Validation */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <AlertCircle size={18} className="text-cm-purple" />
              Validation (Stage 8)
            </h3>
            <p className="text-sm text-dark-muted mb-4">
              Three validation passes prevent data corruption. The validator exists because commas in hook text can scatter one row across dozens of cells if uploaded incorrectly.
            </p>

            <div className="space-y-3">
              <div className="border border-dark-border rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Pre-Upload Validation</h4>
                <div className="text-xs text-dark-muted space-y-0.5">
                  <p>Validates column count (must be exactly 21), ID sequencing (must be continuous from last row), email format (regex), URL format (must start with https://), enum values (Send must be Yes/Qualify/No, Track must be Direct/Collab), no pipe characters in any field, Date Added format (YYYY-MM-DD).</p>
                </div>
              </div>
              <div className="border border-dark-border rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Upload Method</h4>
                <p className="text-xs text-dark-muted">
                  Always uses <span className="font-mono bg-dark-panel2 px-1 rounded">--values-json</span> (never pipe-separated) to prevent the comma-delimiter bug. Data is passed as structured JSON arrays, not CSV strings.
                </p>
              </div>
              <div className="border border-dark-border rounded-lg p-3">
                <h4 className="font-semibold text-xs text-cm-purple mb-1">Post-Upload Validation</h4>
                <div className="text-xs text-dark-muted space-y-0.5">
                  <p>Cell-by-cell comparison of what was uploaded vs. what the sheet now contains. Checks for: row explosion (one logical row scattered across multiple sheet rows), missing required fields (First Name, Last Name, Email, Score, Send, Track, ICP Tag), column count mismatch.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 7. CLI Reference */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text flex items-center gap-2 mb-4">
              <Terminal size={18} className="text-dark-muted" />
              CLI Reference
            </h3>
            <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 font-mono text-sm space-y-3">
              <div>
                <span className="text-dark-muted"># ── Scout Module ──────────────────────────────</span>
              </div>
              <div>
                <span className="text-dark-muted"># Basic run — find 12 prospects for ICP v1</span>
                <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12</div>
              </div>
              <div>
                <span className="text-dark-muted"># Test mode — no email credits spent</span>
                <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12 --test-mode</div>
              </div>
              <div>
                <span className="text-dark-muted"># Skip email lookup — discovery + qualify only</span>
                <div className="text-dark-success">python3 scout.py --icp icp_v1 --target 12 --skip-email</div>
              </div>
              <div>
                <span className="text-dark-muted"># Target specific niches</span>
                <div className="text-dark-success">python3 scout.py --icp icp_v1 --niches &quot;burnout coaches,grief coaches&quot; --target 5</div>
              </div>
              <div className="pt-2">
                <span className="text-dark-muted"># ── Validate &amp; Merge ────────────────────────</span>
              </div>
              <div>
                <span className="text-dark-muted"># Full merge — append new prospects to spreadsheet</span>
                <div className="text-dark-success">python3 validate_and_merge.py</div>
              </div>
              <div>
                <span className="text-dark-muted"># Skip Hunter credit check</span>
                <div className="text-dark-success">python3 validate_and_merge.py --skip-credit-check</div>
              </div>
              <div>
                <span className="text-dark-muted"># Audit spreadsheet only — no changes</span>
                <div className="text-dark-success">python3 validate_and_merge.py --validate-only</div>
              </div>
              <div className="pt-2">
                <span className="text-dark-muted"># ── Sheet Upload Validator ────────────────────</span>
              </div>
              <div>
                <span className="text-dark-muted"># Pre-check before uploading</span>
                <div className="text-dark-success">python3 validate_sheet_upload.py pre-check batch.json</div>
              </div>
              <div>
                <span className="text-dark-muted"># Upload with built-in validation</span>
                <div className="text-dark-success">python3 validate_sheet_upload.py upload batch.json</div>
              </div>
              <div>
                <span className="text-dark-muted"># Post-upload verification</span>
                <div className="text-dark-success">python3 validate_sheet_upload.py post-check batch.json --expected-start-row 85</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
