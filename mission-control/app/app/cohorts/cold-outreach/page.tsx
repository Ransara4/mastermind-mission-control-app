"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  ExternalLink,
  FileText,
  GitBranch,
  Loader2,
  Mail,
  Play,
  RefreshCw,
  Target,
  ThumbsDown,
  ThumbsUp,
  Users,
  XCircle,
  CheckCircle,
} from "lucide-react";
import {
  useColdOutreachData,
  type ICP,
} from "@/hooks/useColdOutreachData";

import { StatCard, Toast } from "./sections/SharedUI";
import { CreateIcpModal } from "./sections/CreateIcpModal";
import { IcpList } from "./sections/IcpList";
import { IcpTargetingProfile, type TrackDef } from "./sections/IcpTargetingProfile";
import { HookWriter } from "./sections/HookWriter";
import { BatchHistory } from "./sections/BatchHistory";
import { PipelineBackend } from "./sections/PipelineBackend";
import { Settings as SettingsIcon } from "lucide-react";

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
  const [activeTab, setActiveTab] = useState<"dashboard" | "pipeline" | "settings">("dashboard");
  const [sheetUrlInput, setSheetUrlInput] = useState("");
  const [editingSheetUrl, setEditingSheetUrl] = useState(false);
  const [savingSheetUrl, setSavingSheetUrl] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    fetch("/api/cold-outreach/icps")
      .then((r) => r.json())
      .then((d) => { if (d.tag_issues) setTagIssues(d.tag_issues); })
      .catch(() => {});
    // Load current sheet URL
    if (stats?.googleSheetUrl) {
      setSheetUrlInput(stats.googleSheetUrl);
    }
  }, [stats?.googleSheetUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading && icps.length > 0 && !selectedIcpId) {
      selectIcp(icps[0].id);
    }
  }, [loading, icps, selectedIcpId, selectIcp]);

  /* ── ICP edit state ─────────────────────────────────────────── */
  const [editName, setEditName] = useState("");
  const [editIcpTag, setEditIcpTag] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [savingIcp, setSavingIcp] = useState(false);
  const [savedIcp, setSavedIcp] = useState(false);
  const [saveIcpError, setSaveIcpError] = useState<string | null>(null);

  /* ── Hook writer edit state ─────────────────────────────────── */
  const [editCredibility, setEditCredibility] = useState("");
  const [editBannedWords, setEditBannedWords] = useState<string[]>([]);
  const [bannedWordInput, setBannedWordInput] = useState("");
  const [editPromptTemplate, setEditPromptTemplate] = useState("");
  const [savingHook, setSavingHook] = useState(false);
  const [savedHook, setSavedHook] = useState(false);
  const [saveHookError, setSaveHookError] = useState<string | null>(null);

  /* ── Target Profile ─────────────────────────────────────────── */
  const [editTargetProfile, setEditTargetProfile] = useState<Record<string, string>>({});
  const [newProfileKey, setNewProfileKey] = useState("");
  const [newProfileValue, setNewProfileValue] = useState("");

  /* ── Niche Categories ───────────────────────────────────────── */
  const [editNicheCategories, setEditNicheCategories] = useState<string[]>([]);
  const [nicheCategoryInput, setNicheCategoryInput] = useState("");

  /* ── Qualification Rules ────────────────────────────────────── */
  const [editMustHave, setEditMustHave] = useState<string[]>([]);
  const [mustHaveInput, setMustHaveInput] = useState("");
  const [editDisqualifyIf, setEditDisqualifyIf] = useState<string[]>([]);
  const [disqualifyIfInput, setDisqualifyIfInput] = useState("");

  /* ── Track Definitions ──────────────────────────────────────── */
  const [editTrackDefs, setEditTrackDefs] = useState<Record<string, TrackDef>>({});

  /* ── Format Rules & Subject Formula ────────────────────────── */
  const [editFormatRules, setEditFormatRules] = useState<Record<string, string>>({});
  const [newFormatKey, setNewFormatKey] = useState("");
  const [newFormatValue, setNewFormatValue] = useState("");
  const [editSubjectFormula, setEditSubjectFormula] = useState<Record<string, unknown>>({});

  /* ── Test Mode ──────────────────────────────────────────────── */
  const [testModeEnabled, setTestModeEnabled] = useState(false);

  /* ── Populate edit fields when ICP changes ──────────────────── */
  const populateFields = (icp: ICP) => {
    setEditName(icp.name);
    setEditIcpTag(icp.icp_tag || "");
    setEditDescription(icp.description);

    const tp = typeof icp.target_profile === "object" && icp.target_profile ? icp.target_profile : {};
    const tpStrings: Record<string, string> = {};
    for (const [k, v] of Object.entries(tp)) tpStrings[k] = String(v);
    setEditTargetProfile(tpStrings);

    setEditNicheCategories(Array.isArray(icp.niche_categories) ? [...icp.niche_categories] : []);

    const qr = icp.qualification_rules || { must_have: [], disqualify_if: [] };
    setEditMustHave(Array.isArray(qr.must_have) ? [...qr.must_have] : []);
    setEditDisqualifyIf(Array.isArray(qr.disqualify_if) ? [...qr.disqualify_if] : []);

    const td = typeof icp.track_definitions === "object" && icp.track_definitions ? icp.track_definitions : {};
    const tdClone: Record<string, TrackDef> = {};
    for (const [k, v] of Object.entries(td)) {
      tdClone[k] = { name: v.name || "", criteria: v.criteria || "", angle: (v as Record<string, string>).angle || (v as Record<string, string>).hook_angle || "" };
    }
    setEditTrackDefs(tdClone);

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

  const [prevIcpId, setPrevIcpId] = useState<string | null>(null);
  if (selectedIcp && selectedIcp.id !== prevIcpId) {
    setPrevIcpId(selectedIcp.id);
    populateFields(selectedIcp);
  }

  /* ── Save handlers ──────────────────────────────────────────── */
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

  /* ── Loading / Error states ─────────────────────────────────── */
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
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeTab === "settings"
              ? "bg-cm-purple text-white"
              : "text-dark-muted hover:bg-dark-panel2"
          }`}
        >
          <SettingsIcon size={16} />
          Settings
        </button>
      </div>

      {activeTab === "dashboard" && (
        <>
          {/* ── Primary Stats ────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Total Contacts" value={stats?.totalContacts ?? 0} icon={Users} />
            <StatCard label="Total Leads Found" value={stats?.totalLeadsFound ?? 0} icon={Users} />
            <StatCard label="Yeses to Send" value={stats?.yesesToSend ?? 0} icon={ThumbsUp} />
            <StatCard label="Not to Send" value={stats?.notToSend ?? 0} icon={ThumbsDown} />
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

          {/* ── Secondary Stats ──────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Active ICPs" value={stats?.activeIcps ?? 0} icon={Target} />
            <StatCard
              label="Last Pipeline Run"
              value={stats?.lastPipelineRun ? new Date(stats.lastPipelineRun).toLocaleDateString() : "Never"}
              icon={Clock}
            />
            <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-dark-muted">Google Sheet</span>
                <div className="p-1.5 rounded-lg bg-cm-purple/15">
                  <ExternalLink size={16} className="text-cm-purple" />
                </div>
              </div>
              {stats?.googleSheetUrl ? (
                <a
                  href={stats.googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-bold text-cm-purple hover:text-cm-purple-mid truncate block"
                  title="Click to open sheet"
                >
                  Open Sheet
                </a>
              ) : (
                <div>
                  <p className="text-lg font-bold text-dark-muted mb-2">Not configured</p>
                  <button
                    onClick={() => setActiveTab("settings")}
                    className="text-xs px-2 py-1 bg-cm-purple text-white rounded hover:bg-cm-purple/80"
                  >
                    Configure
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Actions ──────────────────────────────────────────── */}
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

          {/* ── Pipeline Status Toast ─────────────────────────────── */}
          {pipelineStatus === "running" && (
            <Toast type="info" message="Pipeline is running... This may take a moment." />
          )}
          {pipelineStatus === "success" && (
            <Toast type="success" message="Pipeline run queued successfully. Data will refresh shortly." />
          )}
          {pipelineStatus === "error" && (
            <Toast type="error" message={pipelineError || "Pipeline failed. Check logs for details."} />
          )}

          {/* ── Main Two-Column Layout ────────────────────────────── */}
          <div className="flex gap-6">
            <IcpList
              icps={icps}
              selectedIcpId={selectedIcpId}
              tagIssues={tagIssues}
              onSelect={selectIcp}
              onCreateClick={() => setShowCreateModal(true)}
            />

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
                  <IcpTargetingProfile
                    onSave={handleSaveIcp}
                    saving={savingIcp}
                    saved={savedIcp}
                    saveError={saveIcpError}
                    editName={editName}
                    setEditName={setEditName}
                    editIcpTag={editIcpTag}
                    setEditIcpTag={setEditIcpTag}
                    editDescription={editDescription}
                    setEditDescription={setEditDescription}
                    editTargetProfile={editTargetProfile}
                    setEditTargetProfile={setEditTargetProfile}
                    newProfileKey={newProfileKey}
                    setNewProfileKey={setNewProfileKey}
                    newProfileValue={newProfileValue}
                    setNewProfileValue={setNewProfileValue}
                    editNicheCategories={editNicheCategories}
                    setEditNicheCategories={setEditNicheCategories}
                    nicheCategoryInput={nicheCategoryInput}
                    setNicheCategoryInput={setNicheCategoryInput}
                    editMustHave={editMustHave}
                    setEditMustHave={setEditMustHave}
                    mustHaveInput={mustHaveInput}
                    setMustHaveInput={setMustHaveInput}
                    editDisqualifyIf={editDisqualifyIf}
                    setEditDisqualifyIf={setEditDisqualifyIf}
                    disqualifyIfInput={disqualifyIfInput}
                    setDisqualifyIfInput={setDisqualifyIfInput}
                    editTrackDefs={editTrackDefs}
                    setEditTrackDefs={setEditTrackDefs}
                  />

                  <HookWriter
                    selectedIcp={selectedIcp}
                    onSave={handleSaveHook}
                    saving={savingHook}
                    saved={savedHook}
                    saveError={saveHookError}
                    editCredibility={editCredibility}
                    setEditCredibility={setEditCredibility}
                    editBannedWords={editBannedWords}
                    setEditBannedWords={setEditBannedWords}
                    bannedWordInput={bannedWordInput}
                    setBannedWordInput={setBannedWordInput}
                    editPromptTemplate={editPromptTemplate}
                    setEditPromptTemplate={setEditPromptTemplate}
                    editFormatRules={editFormatRules}
                    setEditFormatRules={setEditFormatRules}
                    newFormatKey={newFormatKey}
                    setNewFormatKey={setNewFormatKey}
                    newFormatValue={newFormatValue}
                    setNewFormatValue={setNewFormatValue}
                    editSubjectFormula={editSubjectFormula}
                    setEditSubjectFormula={setEditSubjectFormula}
                  />
                </>
              )}
            </div>
          </div>

          {/* ── Upload Toast ─────────────────────────────────────── */}
          {uploadToast && (
            <Toast type={uploadToast.type} message={uploadToast.message} onDismiss={() => setUploadToast(null)} />
          )}

          {/* ── Batch History ─────────────────────────────────────── */}
          <BatchHistory
            batches={batches}
            selectedCampaignId={selectedCampaignId}
            uploadingBatchId={uploadingBatchId}
            onUpload={async (batchId, campaignId) => {
              const result = await uploadToInstantly(batchId, campaignId);
              setUploadToast({
                type: "success",
                message: `Uploaded ${result.uploaded} leads! View at app.instantly.ai`,
              });
              return result;
            }}
            onSelectCampaignError={(msg) => setUploadToast({ type: "error", message: msg })}
          />

          {/* ── Create ICP Modal ──────────────────────────────────── */}
          {showCreateModal && (
            <CreateIcpModal
              onClose={() => setShowCreateModal(false)}
              onCreate={createIcp}
            />
          )}
        </>
      )}

      {activeTab === "pipeline" && <PipelineBackend />}

      {activeTab === "settings" && (
        <div className="space-y-6">
          {/* Google Sheet Configuration */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-cm-purple/15">
                <ExternalLink size={18} className="text-cm-purple" />
              </div>
              <h3 className="text-base font-bold text-dark-text">Google Sheet Configuration</h3>
            </div>
            <p className="text-sm text-dark-muted mb-4">
              Configure the Google Sheet where prospects are appended. This is the source of truth for all leads.
            </p>

            {!stats?.googleSheetUrl && !editingSheetUrl ? (
              <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 text-center">
                <p className="text-sm text-dark-muted mb-4">
                  No Google Sheet connected. Add the sheet URL to get started.
                </p>
                <button
                  onClick={() => {
                    setEditingSheetUrl(true);
                    setSheetUrlInput("");
                  }}
                  className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium"
                >
                  Connect Google Sheet
                </button>
              </div>
            ) : editingSheetUrl ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-dark-text mb-2">
                    Google Sheets URL
                  </label>
                  <input
                    type="text"
                    value={sheetUrlInput}
                    onChange={(e) => setSheetUrlInput(e.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
                    className="w-full px-3 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
                  />
                  <p className="text-xs text-dark-muted mt-1">
                    Paste the full Google Sheets URL. Must start with https://docs.google.com/spreadsheets/
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      if (!sheetUrlInput.trim()) {
                        setEditingSheetUrl(false);
                        return;
                      }
                      setSavingSheetUrl(true);
                      try {
                        await updateSettings({ google_sheet_url: sheetUrlInput });
                        setEditingSheetUrl(false);
                        setTimeout(refresh, 500);
                      } catch (err) {
                        console.error("Failed to save sheet URL:", err);
                      } finally {
                        setSavingSheetUrl(false);
                      }
                    }}
                    disabled={savingSheetUrl || !sheetUrlInput.trim()}
                    className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium"
                  >
                    {savingSheetUrl ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setEditingSheetUrl(false);
                      if (stats?.googleSheetUrl) {
                        setSheetUrlInput(stats.googleSheetUrl);
                      }
                    }}
                    className="px-4 py-2 bg-dark-panel2 text-dark-text border border-dark-border rounded-lg hover:bg-dark-panel text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-dark-text mb-1">Connected Sheet</p>
                    <a
                      href={stats?.googleSheetUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-cm-purple hover:text-cm-purple-mid break-all"
                    >
                      {stats?.googleSheetUrl}
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      setEditingSheetUrl(true);
                      setSheetUrlInput(stats?.googleSheetUrl || "");
                    }}
                    className="px-3 py-1 text-xs bg-dark-panel border border-dark-border text-dark-text rounded hover:bg-dark-bg whitespace-nowrap"
                  >
                    Edit
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Additional Settings Info */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-base font-bold text-dark-text mb-4">Settings Info</h3>
            <div className="space-y-3 text-sm text-dark-muted">
              <div>
                <p className="font-semibold text-dark-text mb-1">Google Sheet Requirements</p>
                <p>Your Google Sheet must be accessible and have write permissions. The pipeline appends prospects with a 21-column structure.</p>
              </div>
              <div>
                <p className="font-semibold text-dark-text mb-1">API Keys</p>
                <p>Ensure the following API keys are configured in your environment: Google Sheets API, Hunter.io, Tavily, Claude API, and optionally Instantly.ai for campaign uploads.</p>
              </div>
              <div>
                <p className="font-semibold text-dark-text mb-1">Workspace Path</p>
                <p>This system uses <code className="bg-dark-panel2 px-1.5 py-0.5 rounded text-xs font-mono">GET_SORTED_WORKSPACE</code> environment variable for data storage.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
