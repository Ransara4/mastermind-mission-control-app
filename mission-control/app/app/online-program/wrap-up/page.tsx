"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useCelebration } from "@/components/CelebrationBurst";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  Lock,
  Clock,
  ChevronDown,
  ChevronRight,
  Save,
  ExternalLink,
  FileText,
  FolderOpen,
  Play,
  Pause,
  RotateCcw,
  Send,
  Plus,
  X,
} from "lucide-react";

// -- Types --

interface PipelineStatus {
  [key: string]: boolean;
}

interface SessionData {
  session_number: number;
  cohort: string;
  title: string;
  date: string | null;
  descript_link: string | null;
  zoom_meeting_id: string | null;
  zoom_recording_url: string | null;
  youtube_id: string | null;
  youtube_url: string | null;
  transcript_file: string | null;
  transcript_summary: string | null;
  chat_highlights: string | null;
  pdf_path: string | null;
  wix_cms_id: string | null;
  whatsapp_sent: boolean;
  notion_card_created: boolean;
  tech_requirements: string | null;
  tech_requirements_output: string | null;
  tech_requirements_pdf_path: string | null;
  tech_requirements_wa_sent: boolean;
  member_requests: string | null;
  reel_clips: string | null;
  next_session_plan: string | null;
  notion_sm_record_id?: string | null;
  questions_saved?: { count: number; matched: number; unmatched: number; timestamp: string } | null;
  pipeline_status: PipelineStatus;
}

interface ApiResponse {
  session_number: number;
  data: SessionData;
  transcript: string;
  available_sessions: number[];
}

interface RunStepResult {
  step: number;
  status: "success" | "error" | "skipped";
  message: string;
  data?: SessionData;
}

// -- Stage definitions --

interface StageDefinition {
  stageNumber: number;
  name: string;
  statusKeys: string[];
  type: "automated" | "manual" | "approval";
  runStep?: number | string;
  subStage?: string;
  alwaysAccessible?: boolean;
}

const STAGES: StageDefinition[] = [
  { stageNumber: 1, name: "Download Zoom Recording", statusKeys: ["step_1_download"], type: "automated", runStep: 1 },
  { stageNumber: 2, name: "Upload to YouTube", statusKeys: ["step_2_youtube"], type: "automated", runStep: 2 },
  { stageNumber: 3, name: "Descript Import + Transcript", statusKeys: ["step_3_descript_manual", "step_4_transcript_pasted"], type: "manual" },
  { stageNumber: 4, name: "Analyze Chat", statusKeys: ["step_5_chat_analyzed"], type: "automated", runStep: 4 },
  { stageNumber: 19, name: "Extract Reel Clips", statusKeys: ["step_4b_reel_clips"], type: "automated", runStep: "4b" },
  { stageNumber: 20, name: "Save Questions to DB", statusKeys: ["step_4c_questions_saved"], type: "automated" },
  { stageNumber: 5, name: "Summarize Transcript", statusKeys: ["step_6_transcript_summarized"], type: "automated", runStep: 5 },
  { stageNumber: 6, name: "Editorial Review", statusKeys: ["step_7_mc_reviewed"], type: "approval" },
  { stageNumber: 7, name: "Push to Wix CMS", statusKeys: ["step_8_wix_cms"], type: "automated", runStep: 7 },
  { stageNumber: 9, name: "Build Follow-up PDF", statusKeys: ["step_10_pdf_built"], type: "automated", runStep: 9 },
  { stageNumber: 10, name: "PDF Approval", statusKeys: ["step_11_pdf_approved"], type: "approval" },
  { stageNumber: 11, name: "Member Requests & Follow-ups", statusKeys: ["step_12_member_requests"], type: "manual" },
  { stageNumber: 12, name: "WhatsApp Group Update", statusKeys: ["step_13_whatsapp"], type: "automated", runStep: 12 },
  { stageNumber: 13, name: "Notion SM Content Card", statusKeys: ["step_14_notion_card"], type: "automated", runStep: 13 },
  { stageNumber: 14, name: "Plan Next Session", statusKeys: ["step_16_next_session_plan"], type: "manual", alwaysAccessible: true },
  { stageNumber: 15, name: "Tech Requirements Input", statusKeys: ["step_15_tech_requirements"], type: "manual" },
  { stageNumber: 16, name: "Tech Requirements Output", statusKeys: ["step_15b_tech_output_generated"], type: "automated", runStep: "15b" },
  { stageNumber: 17, name: "Tech Requirements PDF", statusKeys: ["step_15c_tech_pdf_built"], type: "automated", runStep: "15c" },
  { stageNumber: 18, name: "Send Tech Reqs to Participants", statusKeys: ["step_15d_tech_wa_sent"], type: "approval", runStep: "15d" },
];


function isStageComplete(stage: StageDefinition, pipeline: PipelineStatus): boolean {
  return stage.statusKeys.every((k) => pipeline[k]);
}

function getStageState(
  stageIndex: number,
  stages: StageDefinition[],
  pipeline: PipelineStatus
): "done" | "current" | "locked" {
  if (isStageComplete(stages[stageIndex], pipeline)) return "done";
  if (stages[stageIndex].alwaysAccessible) return "current";
  for (let i = 0; i < stageIndex; i++) {
    if (!isStageComplete(stages[i], pipeline)) return "locked";
  }
  return "current";
}

function parseChatHighlights(raw: string | null): Record<string, string[]> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string[]>;
    }
  } catch {
    // not JSON
  }
  return null;
}

function formatHighlightsAsText(parsed: Record<string, string[]>): string {
  const lines: string[] = [];
  for (const [section, items] of Object.entries(parsed)) {
    const label = section.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    lines.push(`## ${label}`);
    const arr = Array.isArray(items) ? items : [items];
    for (const item of arr) {
      lines.push(`- ${String(item)}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? match[1] : null;
}

// -- New Session Modal --

function NewSessionModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (num: number) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const zoomIdRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/online-program/wrap-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: titleRef.current?.value?.trim() || "",
          zoom_meeting_id: zoomIdRef.current?.value?.trim() || "",
          date: dateRef.current?.value?.trim() || "",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      onCreated(data.session_number);
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-bold tracking-tight text-dark-text">New Online Program Session</h2>
          <button type="button" onClick={onClose} className="text-dark-muted hover:text-dark-muted">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Session Title</label>
            <input
              ref={titleRef}
              type="text"
              placeholder="e.g. Cohort 1, Session 2: Business Automation Online Program"
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Date <span className="text-dark-muted font-normal">(optional)</span>
              </label>
              <input
                ref={dateRef}
                type="date"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Zoom Meeting ID <span className="text-dark-muted font-normal">(optional)</span>
              </label>
              <input
                ref={zoomIdRef}
                type="text"
                placeholder="87654321"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-border">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            type="button"
            disabled={creating}
            className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-semibold transition-colors"
          >
            {creating ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {creating ? "Creating..." : "Create Session"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Session Panel --

function SessionPanel({
  sessionNum,
  defaultExpanded,
}: {
  sessionNum: number;
  defaultExpanded: boolean;
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [transcript, setTranscript] = useState("");
  const [panelExpanded, setPanelExpanded] = useState(defaultExpanded);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Refs for uncontrolled textareas/inputs (prevents scroll-to-top on keystroke)
  const descriptLinkRef = useRef<HTMLInputElement>(null);
  const transcriptRef = useRef<HTMLTextAreaElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const highlightsRef = useRef<HTMLTextAreaElement>(null);
  const techReqsRef = useRef<HTMLTextAreaElement>(null);
  const nextPlanRef = useRef<HTMLTextAreaElement>(null);
  const memberRequestsRef = useRef<HTMLTextAreaElement>(null);
  const youtubeUrlRef = useRef<HTMLInputElement>(null);
  const descriptLinkEditRef = useRef<HTMLInputElement>(null);
  const editReviewSummaryRef = useRef<HTMLTextAreaElement>(null);
  const editReviewHighlightsRef = useRef<HTMLTextAreaElement>(null);
  const reelClipsRef = useRef<HTMLTextAreaElement>(null);
  const dataLoadedRef = useRef(false);

  // UI state
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<Record<string, "idle" | "success" | "error">>({});
  const [expandedStages, setExpandedStages] = useState<Set<number>>(new Set());
  const [testMode, setTestMode] = useState(false);
  const [testModeInfoOpen, setTestModeInfoOpen] = useState(false);
  const [testSteps, setTestSteps] = useState<Record<string, boolean>>({
    zoom: false, youtube: false, chat: true, transcript: true, wix: true,
    pdf: true, notion: true, techOutput: true, techPdf: true,
  });
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelinePaused, setPipelinePaused] = useState(false);
  const [pipelinePausedAt, setPipelinePausedAt] = useState<number | null>(null);
  const [runningStep, setRunningStep] = useState<number | null>(null);
  const [stepResults, setStepResults] = useState<Record<number, "success" | "error" | "skipped">>({});
  const [triggerCelebration, CelebrationLayer] = useCelebration();
  const celebratedRef = useRef(false);

  // Zoom recording state
  const [zoomRecording, setZoomRecording] = useState<{
    directory: string;
    files: string[];
    matched: string | null;
    matched_path: string | null;
  } | null>(null);
  const [openingFinder, setOpeningFinder] = useState(false);

  useEffect(() => {
    if (!sessionData) return;
    const pl = sessionData.pipeline_status || {};
    const allDone = STAGES.every((s) => isStageComplete(s, pl));
    if (allDone && !celebratedRef.current) {
      celebratedRef.current = true;
      const cx = typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const cy = typeof window !== "undefined" ? window.innerHeight / 2 : 400;
      triggerCelebration({ clientX: cx, clientY: cy });
      setTimeout(() => triggerCelebration({ clientX: cx * 0.3, clientY: cy * 0.4 }), 300);
      setTimeout(() => triggerCelebration({ clientX: cx * 1.7, clientY: cy * 0.5 }), 500);
    }
    if (!allDone) celebratedRef.current = false;
  }, [sessionData, triggerCelebration]);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    dataLoadedRef.current = false;
    try {
      const res = await fetch(`/api/online-program/wrap-up?session=${sessionNum}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data: ApiResponse = await res.json();
      setSessionData(data.data);
      setTranscript(data.transcript);
      const pl = data.data.pipeline_status;
      for (let i = 0; i < STAGES.length; i++) {
        if (!isStageComplete(STAGES[i], pl)) {
          setExpandedStages(new Set([STAGES[i].stageNumber]));
          break;
        }
      }
      // Fetch zoom recording info
      try {
        const cohortNum = (data.data.cohort || "Cohort 1").replace(/\D/g, "") || "1";
        const zoomRes = await fetch(`/api/online-program/wrap-up/zoom-recording?session=${data.data.session_number}&cohort=${cohortNum}`);
        if (zoomRes.ok) setZoomRecording(await zoomRes.json());
      } catch { /* zoom info is non-critical */ }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [sessionNum]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // Populate refs ONCE when sessionData first arrives
  useEffect(() => {
    if (!sessionData || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    if (descriptLinkRef.current) descriptLinkRef.current.value = sessionData.descript_link || "";
    if (transcriptRef.current) transcriptRef.current.value = transcript;
    if (summaryRef.current) summaryRef.current.value = sessionData.transcript_summary || "";
    if (highlightsRef.current) highlightsRef.current.value = sessionData.chat_highlights || "";
    if (techReqsRef.current) techReqsRef.current.value = sessionData.tech_requirements || "";
    if (nextPlanRef.current) nextPlanRef.current.value = sessionData.next_session_plan || "";
    if (youtubeUrlRef.current) youtubeUrlRef.current.value = sessionData.youtube_url || "";
    if (descriptLinkEditRef.current) descriptLinkEditRef.current.value = sessionData.descript_link || "";
    if (editReviewSummaryRef.current) editReviewSummaryRef.current.value = sessionData.transcript_summary || "";
    if (editReviewHighlightsRef.current) editReviewHighlightsRef.current.value = sessionData.chat_highlights || "";
    if (reelClipsRef.current) reelClipsRef.current.value = sessionData.reel_clips || "";
    if (memberRequestsRef.current) {
      if (sessionData.member_requests) {
        memberRequestsRef.current.value = sessionData.member_requests;
      } else {
        const parts: string[] = [];
        if (sessionData.chat_highlights) {
          const parsed = parseChatHighlights(sessionData.chat_highlights);
          if (parsed) {
            parts.push("## From Chat\n\n" + formatHighlightsAsText(parsed));
          } else {
            parts.push("## From Chat\n\n" + sessionData.chat_highlights);
          }
        }
        if (transcript) {
          const transcriptLines = transcript.split("\n");
          const extracted: string[] = [];
          for (const line of transcriptLines) {
            const stripped = line.replace(/^\d+:\d+:\d+\s+/, "").replace(/^\d+:\d+\s+/, "").trim();
            if (stripped.length < 20) continue;
            if (stripped.endsWith("?")) extracted.push(`- ${stripped}`);
            else if (/\b(follow[- ]?up|action item|i['']ll send|make sure to|i['']ll share|look into|i['']ll look)\b/i.test(stripped)) extracted.push(`- ${stripped}`);
          }
          if (extracted.length > 0) parts.push("## From Transcript\n\n" + extracted.slice(0, 25).join("\n"));
        }
        memberRequestsRef.current.value = parts.join("\n\n").trim();
      }
    }
  }, [sessionData, transcript]);

  function setSaveStatusFor(key: string, status: "idle" | "success" | "error") {
    setSaveStatus((prev) => ({ ...prev, [key]: status }));
    if (status !== "idle") setTimeout(() => setSaveStatus((prev) => ({ ...prev, [key]: "idle" })), 3000);
  }

  async function patchSession(body: Record<string, unknown>, statusKey: string): Promise<boolean> {
    setSaving(true);
    try {
      const res = await fetch(`/api/online-program/wrap-up?session=${sessionNum}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Save failed");
      const result = await res.json();
      setSessionData(result.data);
      // Keep transcript React state in sync so inner component remounts preserve the value
      if (typeof body.transcript === "string") {
        setTranscript(body.transcript);
      }
      setSaveStatusFor(statusKey, "success");
      return true;
    } catch {
      setSaveStatusFor(statusKey, "error");
      return false;
    } finally {
      setSaving(false);
    }
  }

  const stepToTestKey: Record<string, string> = {
    "1": "zoom", "2": "youtube", "4": "chat", "5": "transcript",
    "7": "wix", "9": "pdf", "13": "notion", "15b": "techOutput", "15c": "techPdf",
  };

  async function runStep(step: number | string): Promise<RunStepResult | null> {
    try {
      // 15b uses its own dedicated endpoint (Claude CLI inline)
      if (String(step) === "15b") {
        const res = await fetch("/api/online-program/wrap-up/generate-tech-output", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionNum }),
        });
        const result = await res.json();
        if (result.data) setSessionData(result.data as SessionData);
        return { step: 16, status: result.status === "success" ? "success" : "error", message: result.message || result.status, data: result.data };
      }
      const testKey = stepToTestKey[String(step)];
      const forceRerun = testMode && !!testKey && !!testSteps[testKey];
      const res = await fetch("/api/online-program/wrap-up/run", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, session: sessionNum, testMode, forceRerun }),
      });
      const result: RunStepResult = await res.json();
      if (result.data) setSessionData(result.data as SessionData);
      return result;
    } catch { return null; }
  }

  async function runPipeline(pipelineOverride?: Record<string, boolean>) {
    setPipelineRunning(true); setPipelinePaused(false); setPipelinePausedAt(null); setStepResults({});
    // Merge current state with any override — never un-mark completed steps
    const pl: Record<string, boolean> = { ...(sessionData?.pipeline_status || {}), ...(pipelineOverride || {}) };
    for (const stage of STAGES) {
      if (isStageComplete(stage, pl)) { if (stage.runStep) setStepResults((p) => ({ ...p, [stage.stageNumber]: "skipped" })); continue; }
      if (stage.type === "manual" || stage.type === "approval") {
        setPipelinePaused(true); setPipelinePausedAt(stage.stageNumber); setPipelineRunning(false);
        setExpandedStages((p) => { const n = new Set(p); n.add(stage.stageNumber); return n; });
        return;
      }
      if (stage.runStep) {
        setRunningStep(stage.stageNumber);
        const result = await runStep(stage.runStep);
        if (result) {
          setStepResults((p) => ({ ...p, [stage.stageNumber]: result.status === "success" || result.status === "skipped" ? "success" : "error" }));
          if (result.status === "error") { setRunningStep(null); setPipelineRunning(false); return; }
          if (result.data) Object.assign(pl, result.data.pipeline_status);
        } else {
          setStepResults((p) => ({ ...p, [stage.stageNumber]: "error" })); setRunningStep(null); setPipelineRunning(false); return;
        }
      }
    }
    setRunningStep(null); setPipelineRunning(false);
  }

  const toggleStage = useCallback((stageNum: number, e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const scrollY = window.scrollY;
    setExpandedStages((p) => { const n = new Set(p); if (n.has(stageNum)) n.delete(stageNum); else n.add(stageNum); return n; });
    requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: "instant" }));
  }, []);

  if (loading) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center gap-3">
        <Loader2 className="animate-spin text-cm-purple" size={20} />
        <span className="text-sm text-dark-muted">Loading Session {sessionNum}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center gap-2 text-dark-danger">
        <AlertCircle size={20} /><span>{error}</span>
      </div>
    );
  }

  if (!sessionData) return null;

  const pipeline = sessionData.pipeline_status;
  const pipelineSteps = Object.entries(pipeline);
  const completedSteps = pipelineSteps.filter(([, v]) => v).length;
  const totalSteps = pipelineSteps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allDone = STAGES.every((s) => isStageComplete(s, pipeline));

  function Badge({ label, color }: { label: string; color: "amber" | "green" | "indigo" }) {
    const c = color === "amber" ? "bg-dark-warn/10 text-dark-warn border-dark-warn/30" : color === "green" ? "bg-dark-success/10 text-dark-success border-dark-success/30" : "bg-cm-purple/10 text-cm-purple border-cm-purple/30";
    return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c}`}>{label}</span>;
  }

  function SaveIndicator({ statusKey }: { statusKey: string }) {
    const s = saveStatus[statusKey];
    if (s === "success") return <span className="flex items-center gap-1 text-sm text-dark-success"><CheckCircle2 size={15} /> Saved</span>;
    if (s === "error") return <span className="flex items-center gap-1 text-sm text-dark-danger"><AlertCircle size={15} /> Failed</span>;
    return null;
  }

  function RunStepButton({ stage }: { stage: StageDefinition }) {
    if (!stage.runStep) return null;
    const r = runningStep === stage.stageNumber;
    return (
      <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setRunningStep(stage.stageNumber); const result = await runStep(stage.runStep!); if (result) setStepResults((p) => ({ ...p, [stage.stageNumber]: result.status === "success" || result.status === "skipped" ? "success" : "error" })); setRunningStep(null); }} disabled={r || pipelineRunning} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-dark-muted border border-dark-border rounded-lg hover:bg-dark-bg disabled:opacity-50 transition-colors">
        {r ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Run this step
      </button>
    );
  }

  function MarkDoneCheckbox({ stage }: { stage: StageDefinition }) {
    const done = isStageComplete(stage, pipeline);
    return (
      <label className="flex items-center gap-2 text-xs text-dark-muted cursor-pointer select-none">
        <input type="checkbox" checked={done} onChange={async (e) => { e.stopPropagation(); const b: Record<string, boolean> = {}; for (const k of stage.statusKeys) b[k] = !done; const extra: Record<string, unknown> = {}; if (stage.stageNumber === 3 && !done && transcriptRef.current?.value) { extra.transcript = transcriptRef.current.value; extra.descript_link = descriptLinkRef.current?.value || ""; } await patchSession({ pipeline_status: b, ...extra }, `mark-${stage.stageNumber}`); if (stage.stageNumber === 16 && !done) { setRunningStep(17); const r = await runStep("15c"); if (r) setStepResults((p) => ({ ...p, [17]: r.status === "success" ? "success" : "error" })); setRunningStep(null); } }} disabled={saving} className="rounded border-dark-border" />
        {done ? "Done" : "Mark as done"}
      </label>
    );
  }

  function StageCard({ stage, stageIndex }: { stage: StageDefinition; stageIndex: number }) {
    const state = getStageState(stageIndex, STAGES, pipeline);
    const isExpanded = expandedStages.has(stage.stageNumber);
    const isRunningThis = runningStep === stage.stageNumber;
    const stepResult = stepResults[stage.stageNumber];
    const bc = state === "done" ? "border-l-green-500" : state === "current" ? "border-l-indigo-500" : "border-l-slate-200";
    const sc = state === "current" ? "shadow-md" : "";
    return (
      <div className={`bg-dark-panel border border-dark-border rounded-xl border-l-4 ${bc} ${sc} ${state === "locked" ? "opacity-60" : ""}`}>
        {pipelinePaused && pipelinePausedAt === stage.stageNumber && (
          <div className="bg-dark-warn/10 border-b border-dark-warn/30 px-4 py-2 flex items-center gap-2 text-sm text-dark-warn font-medium"><Pause size={14} /> Paused &mdash; complete this step to continue the pipeline</div>
        )}
        <div role="button" tabIndex={0} onClick={(e) => toggleStage(stage.stageNumber, e)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleStage(stage.stageNumber); } }} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-bg transition-colors text-left cursor-pointer select-none">
          <span className="w-7 h-7 rounded-full bg-cm-purple text-white text-xs font-bold flex items-center justify-center shrink-0">{stageIndex + 1}</span>
          <span className="flex-1 text-sm font-semibold text-dark-text">{stage.name}</span>
          {isRunningThis && <Loader2 size={16} className="animate-spin text-cm-purple shrink-0" />}
          {!isRunningThis && stepResult === "success" && <CheckCircle2 size={16} className="text-dark-success shrink-0" />}
          {!isRunningThis && stepResult === "error" && <AlertCircle size={16} className="text-dark-danger shrink-0" />}
          {stage.type === "manual" && <Badge label="Manual Step" color="amber" />}
          {stage.type === "approval" && <Badge label="Approval Gate" color="green" />}
          {state === "done" && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-dark-success/20 text-dark-success">Done</span>}
          {state === "done" && <CheckCircle2 size={18} className="text-dark-success shrink-0" />}
          {state === "current" && !isRunningThis && <Clock size={18} className="text-dark-warn shrink-0" />}
          {state === "locked" && <Lock size={18} className="text-dark-muted shrink-0" />}
          {isExpanded ? <ChevronDown size={16} className="text-dark-muted shrink-0" /> : <ChevronRight size={16} className="text-dark-muted shrink-0" />}
        </div>
        {isExpanded && (
          <div className="px-5 pb-5 border-t border-dark-border pt-4">
            <StageBody stage={stage} />
            {stage.type === "automated" && <div className="flex items-center gap-4 mt-4 pt-3 border-t border-dark-border"><RunStepButton stage={stage} /><MarkDoneCheckbox stage={stage} /></div>}
          </div>
        )}
      </div>
    );
  }

  function StageBody({ stage }: { stage: StageDefinition }) {
    switch (stage.stageNumber) {
      case 1: return (<div className="space-y-3 text-sm text-dark-text"><div className="flex gap-2"><span className="text-dark-muted w-36 shrink-0">Zoom Meeting ID:</span> <span className="font-mono">{sessionData!.zoom_meeting_id || "Not set"}</span></div><div className="flex gap-2"><span className="text-dark-muted w-36 shrink-0">Recording URL:</span>{sessionData!.zoom_recording_url ? <a href={sessionData!.zoom_recording_url} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1"><ExternalLink size={13} /> Link</a> : <span className="text-dark-muted">Not available</span>}</div>{sessionData!.date && <div className="flex gap-2"><span className="text-dark-muted w-36 shrink-0">Date:</span> {sessionData!.date}</div>}{zoomRecording && (<div className="mt-2 pt-3 border-t border-dark-border space-y-2"><div className="flex gap-2"><span className="text-dark-muted w-36 shrink-0">Local folder:</span><span className="font-mono text-xs bg-cm-purple/10 text-cm-purple px-2 py-0.5 rounded">~/Documents/Zoom/online-program/</span></div>{zoomRecording.matched ? (<div className="flex gap-2 items-start"><span className="text-dark-muted w-36 shrink-0">Recording file:</span><div className="flex flex-col gap-1.5"><span className="font-mono text-xs bg-dark-success/10 text-dark-success px-2 py-0.5 rounded border border-dark-success/30">{zoomRecording.matched}</span></div></div>) : (<div className="flex gap-2"><span className="text-dark-muted w-36 shrink-0">Recording file:</span><span className="text-dark-warn text-xs">No matching recording found for this session</span></div>)}<button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setOpeningFinder(true); try { await fetch(`/api/online-program/wrap-up/zoom-recording?session=${sessionNum}`, { method: "POST" }); } finally { setTimeout(() => setOpeningFinder(false), 1500); } }} disabled={openingFinder} className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/15/80 disabled:opacity-50 text-xs font-medium transition-colors">{openingFinder ? <Loader2 size={12} className="animate-spin" /> : <FolderOpen size={12} />} {openingFinder ? "Opening..." : "Open in Finder"}</button></div>)}</div>);
      case 2: return (<div className="space-y-3 text-sm text-dark-text">{sessionData!.youtube_url && <a href={sessionData!.youtube_url} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1"><ExternalLink size={13} /> {sessionData!.youtube_url}</a>}{sessionData!.youtube_id && <div className="flex gap-2"><span className="text-dark-muted">YouTube ID:</span> <span className="font-mono">{sessionData!.youtube_id}</span></div>}<div className="pt-2 border-t border-dark-border"><label className="block text-sm font-medium text-dark-text mb-1">YouTube URL</label><div className="flex items-center gap-2"><input ref={youtubeUrlRef} type="url" defaultValue={sessionData!.youtube_url || ""} placeholder="https://www.youtube.com/watch?v=..." className="flex-1 border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text" /><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); const u = youtubeUrlRef.current?.value || ""; const id = extractYouTubeId(u); patchSession({ youtube_url: u || null, youtube_id: id, pipeline_status: u ? { step_2_youtube: true } : {} }, "stage2-yt"); }} disabled={saving} className="flex items-center gap-1.5 px-3 py-2 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><SaveIndicator statusKey="stage2-yt" /></div></div></div>);
      case 3: return (<div className="space-y-4"><div><label className="block text-sm font-medium text-dark-text mb-1">Descript Link</label><input ref={descriptLinkRef} type="url" defaultValue={sessionData!.descript_link || ""} placeholder="https://web.descript.com/..." className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text" /></div><div><label className="block text-sm font-medium text-dark-text mb-1">Transcript</label><textarea ref={transcriptRef} defaultValue={transcript} rows={15} className="w-full font-mono text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="Paste the transcript here..." /></div><div className="flex items-center gap-3"><button type="button" onClick={() => patchSession({ descript_link: descriptLinkRef.current?.value || "", transcript: transcriptRef.current?.value || "", pipeline_status: { step_3_descript_manual: true, step_4_transcript_pasted: true } }, "stage3")} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} Mark Complete</button><SaveIndicator statusKey="stage3" /></div></div>);
      case 19: return (<div className="space-y-3"><div><label className="block text-sm font-medium text-dark-text mb-1">Reel &amp; Story Clips — Underlord Prompts</label><textarea ref={reelClipsRef} defaultValue={sessionData!.reel_clips || ""} rows={24} className="w-full font-mono text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="Run this step to extract the best 30-60 second clips from the transcript as Descript Underlord prompts..." /><p className="text-xs text-dark-muted mt-1">AI-extracted clips from the transcript — edit freely. These feed into the Notion card editing notes.</p></div><div className="flex items-center gap-3"><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ reel_clips: reelClipsRef.current?.value || "" }, "stage19"); }} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save edits</button><SaveIndicator statusKey="stage19" /></div></div>);
      case 20: {
        const qs = sessionData!.questions_saved;
        return (
          <div className="space-y-3">
            {qs && qs.count > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-dark-success bg-dark-success/10 border border-dark-success/30 rounded-lg px-4 py-3">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span className="font-semibold">{qs.count} question{qs.count !== 1 ? "s" : ""} saved to the database</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="bg-dark-bg rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-dark-text">{qs.count}</div>
                    <div className="text-xs text-dark-muted mt-0.5">Total</div>
                  </div>
                  <div className="bg-dark-success/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-dark-success">{qs.matched}</div>
                    <div className="text-xs text-dark-muted mt-0.5">Matched to participant</div>
                  </div>
                  <div className={`rounded-lg p-3 text-center ${qs.unmatched > 0 ? "bg-dark-warn/10" : "bg-dark-bg"}`}>
                    <div className={`text-2xl font-bold ${qs.unmatched > 0 ? "text-dark-warn" : "text-dark-muted"}`}>{qs.unmatched}</div>
                    <div className="text-xs text-dark-muted mt-0.5">Unmatched</div>
                  </div>
                </div>
                {qs.unmatched > 0 && (
                  <p className="text-xs text-dark-warn bg-dark-warn/10 border border-dark-warn/30 rounded px-3 py-2">
                    {qs.unmatched} question{qs.unmatched !== 1 ? "s" : ""} could not be matched to a participant — assign them manually in the Questions page.
                  </p>
                )}
                <div className="flex items-center gap-3 pt-1">
                  <a href="/app/online-program/questions" className="flex items-center gap-1.5 text-sm text-cm-purple hover:underline">
                    <ExternalLink size={13} /> View all questions
                  </a>
                  <span className="text-xs text-dark-muted">
                    Saved {new Date(qs.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-dark-muted">No questions saved yet. Run chat analysis first, then re-run the wrap-up script to populate questions.</p>
                <p className="text-xs text-dark-muted font-mono">scripts/save-questions.js</p>
              </div>
            )}
          </div>
        );
      }
      case 4: return (<div className="space-y-4"><div><label className="block text-sm font-medium text-dark-text mb-1">Chat Highlights (Markdown)</label><textarea ref={highlightsRef} defaultValue={sessionData!.chat_highlights || ""} rows={14} className="w-full font-mono text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="## Key Topics..." /><div className="flex items-center gap-3 mt-2"><button type="button" onClick={() => patchSession({ chat_highlights: highlightsRef.current?.value || "", pipeline_status: { step_5_chat_analyzed: true } }, "stage4")} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><SaveIndicator statusKey="stage4" /></div></div></div>);
      case 5: return (<div className="space-y-4"><div><label className="block text-sm font-medium text-dark-text mb-1">Transcript Summary (Markdown)</label><textarea ref={summaryRef} defaultValue={sessionData!.transcript_summary || ""} rows={16} className="w-full font-mono text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="## Session Summary..." /><div className="flex items-center gap-3 mt-2"><button type="button" onClick={() => patchSession({ transcript_summary: summaryRef.current?.value || "", pipeline_status: { step_6_transcript_summarized: true } }, "stage5")} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><SaveIndicator statusKey="stage5" /></div></div></div>);
      case 6: return (<div className="space-y-4"><div><label className="block text-sm font-medium text-dark-text mb-1">Transcription Summary</label><textarea ref={editReviewSummaryRef} defaultValue={sessionData!.transcript_summary || ""} rows={8} className="w-full text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="AI-generated summary..." /></div><div><label className="block text-sm font-medium text-dark-text mb-1">Chat Highlights</label><textarea ref={editReviewHighlightsRef} defaultValue={sessionData!.chat_highlights || ""} rows={6} className="w-full text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="Key highlights..." /></div><div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-dark-text mb-1">Descript Link</label><div className="flex items-center gap-2"><input ref={descriptLinkEditRef} type="url" defaultValue={sessionData!.descript_link || ""} placeholder="https://web.descript.com/..." className="flex-1 border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text" /><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ descript_link: descriptLinkEditRef.current?.value || "" }, "stage6-descript"); }} disabled={saving} className="flex items-center gap-1 px-2 py-2 bg-dark-panel2 text-dark-muted rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-xs font-medium transition-colors"><Save size={12} /></button><SaveIndicator statusKey="stage6-descript" /></div></div><div><label className="block text-sm font-medium text-dark-text mb-1">YouTube Link</label>{sessionData!.youtube_url ? <a href={sessionData!.youtube_url} target="_blank" rel="noopener noreferrer" className="text-sm text-cm-purple hover:underline truncate flex items-center gap-1"><ExternalLink size={13} /> {sessionData!.youtube_url}</a> : <span className="text-sm text-dark-muted">Not uploaded yet</span>}</div></div><div className="flex items-center gap-3 pt-2 border-t border-dark-border"><button type="button" onClick={() => patchSession({ transcript_summary: editReviewSummaryRef.current?.value || "", chat_highlights: editReviewHighlightsRef.current?.value || "", descript_link: descriptLinkEditRef.current?.value || "" }, "stage6draft")} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save Draft</button><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (pipeline.step_7_mc_reviewed) { await patchSession({ pipeline_status: { step_7_mc_reviewed: false } }, "stage6approve"); } else { await patchSession({ transcript_summary: editReviewSummaryRef.current?.value || "", chat_highlights: editReviewHighlightsRef.current?.value || "", descript_link: descriptLinkEditRef.current?.value || "", pipeline_status: { step_7_mc_reviewed: true } }, "stage6approve"); runPipeline({ ...pipeline, step_7_mc_reviewed: true }); } }} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${pipeline.step_7_mc_reviewed ? "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2" : "bg-cm-purple text-white hover:bg-cm-purple/80"}`}>{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {pipeline.step_7_mc_reviewed ? "Approved ✓ (click to undo)" : "Approve & Continue"}</button><SaveIndicator statusKey="stage6draft" /><SaveIndicator statusKey="stage6approve" /></div></div>);
      case 7: return (<div className="space-y-3">{pipeline.step_8_wix_cms ? <div className="text-sm text-dark-text"><span className="text-dark-muted">Wix CMS ID:</span> <span className="font-mono">{sessionData!.wix_cms_id || "Set"}</span></div> : <p className="text-sm text-dark-muted">Wix CMS push has not been run yet.</p>}<p className="text-xs text-dark-muted bg-dark-bg rounded p-2">Wix CMS also serves as the cohort session record.</p></div>);
      case 9: return pipeline.step_10_pdf_built ? (<div className="space-y-2 text-sm text-dark-text">{sessionData!.pdf_path && <a href={`/api/online-program/wrap-up/pdf?path=${encodeURIComponent(sessionData!.pdf_path)}`} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1.5"><FileText size={14} /> View PDF</a>}</div>) : <p className="text-sm text-dark-muted">PDF has not been built yet.</p>;
      case 10: return (<div className="space-y-3">{sessionData!.pdf_path && <a href={`/api/online-program/wrap-up/pdf?path=${encodeURIComponent(sessionData!.pdf_path)}`} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1.5 text-sm"><FileText size={14} /> View PDF</a>}<button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (pipeline.step_11_pdf_approved) { await patchSession({ pipeline_status: { step_11_pdf_approved: false } }, "stage10"); } else { await patchSession({ pipeline_status: { step_11_pdf_approved: true } }, "stage10"); runPipeline({ ...pipeline, step_11_pdf_approved: true }); } }} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${pipeline.step_11_pdf_approved ? "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2" : "bg-cm-purple text-white hover:bg-cm-purple/80"}`}>{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {pipeline.step_11_pdf_approved ? "Approved ✓ (click to undo)" : "Approve PDF & Continue"}</button><label className="flex items-center gap-2 cursor-pointer mt-1"><input type="checkbox" checked={!!pipeline.step_11_pdf_approved} onChange={async (e) => { e.stopPropagation(); if (e.target.checked) { await patchSession({ pipeline_status: { step_11_pdf_approved: true } }, "stage10"); runPipeline({ ...pipeline, step_11_pdf_approved: true }); } else { patchSession({ pipeline_status: { step_11_pdf_approved: false } }, "stage10"); } }} disabled={saving} className="rounded border-dark-border" /><span className="text-xs text-dark-muted">Already sent — mark as done and continue pipeline</span></label><SaveIndicator statusKey="stage10" /></div>);
      case 11: return (<div className="space-y-3"><div><label className="block text-sm font-medium text-dark-text mb-1">Member Requests &amp; Follow-ups (Markdown)</label><textarea ref={memberRequestsRef} defaultValue={sessionData!.member_requests || ""} rows={12} className="w-full font-mono text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="## Questions..." /><p className="text-xs text-dark-muted mt-1">Pulled from transcript and chat analysis — edit freely. This feeds into the follow-up PDF.</p></div><div className="flex items-center gap-3"><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await patchSession({ member_requests: memberRequestsRef.current?.value || "", pipeline_status: { step_12_member_requests: true } }, "stage11"); }} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save &amp; Mark Complete</button><SaveIndicator statusKey="stage11" /></div></div>);
      case 12: return pipeline.step_13_whatsapp ? <div className="text-sm text-dark-success flex items-center gap-2"><CheckCircle2 size={16} /> Sent</div> : <div className="space-y-2"><p className="text-sm text-dark-muted">WhatsApp message has not been sent yet.</p><p className="text-xs text-dark-muted">WA Group: <span className="font-mono">120363419872999426@g.us</span></p></div>;
      case 13: return pipeline.step_14_notion_card ? <div className="text-sm text-dark-text"><span className="text-dark-muted">Notion SM Record ID:</span> <span className="font-mono">{sessionData!.notion_sm_record_id || "Created"}</span></div> : <div className="space-y-2"><p className="text-sm text-dark-muted">Notion card has not been created yet.</p><p className="text-xs text-dark-muted">Requires SM Content Database connection to hostOpenclaw integration</p></div>;
      case 14: return (<div className="space-y-3"><textarea ref={nextPlanRef} defaultValue={sessionData!.next_session_plan || ""} rows={5} className="w-full text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent resize-y text-dark-text bg-dark-panel2" placeholder="Plan for next session..." /><div className="flex items-center gap-3"><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ next_session_plan: nextPlanRef.current?.value || "" }, "stage14-save"); }} disabled={saving} className="flex items-center gap-2 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save</button><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ next_session_plan: nextPlanRef.current?.value || "", pipeline_status: { step_16_next_session_plan: !pipeline.step_16_next_session_plan } }, "stage14"); }} disabled={saving} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${pipeline.step_16_next_session_plan ? "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2" : "bg-cm-purple text-white hover:bg-cm-purple/80"}`}>{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {pipeline.step_16_next_session_plan ? "Done ✓ (click to undo)" : "Mark Complete"}</button><SaveIndicator statusKey="stage14-save" /><SaveIndicator statusKey="stage14" /></div></div>);
      case 15: return (<div className="space-y-3"><label className="block text-sm font-medium text-dark-text">What do participants need to set up before next session?</label><textarea ref={techReqsRef} defaultValue={sessionData!.tech_requirements || ""} rows={5} style={{ resize: "vertical" }} className="w-full text-sm border border-dark-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text bg-dark-panel2" placeholder="e.g. Install Zapier, create a free account at..." /><div className="flex items-center gap-3"><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ tech_requirements: techReqsRef.current?.value || "", pipeline_status: { step_15_tech_requirements: true } }, "stage15a"); }} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-medium transition-colors">{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save</button><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); await patchSession({ tech_requirements: techReqsRef.current?.value || "", pipeline_status: { step_15_tech_requirements: true } }, "stage15a"); setRunningStep(16); const r = await runStep("15b"); if (r) setStepResults((p) => ({ ...p, [16]: r.status === "success" ? "success" : "error" })); setRunningStep(null); }} disabled={saving || runningStep === 16 || !(techReqsRef.current?.value?.trim())} className="flex items-center gap-2 px-4 py-2 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 disabled:opacity-50 text-sm font-medium transition-colors">{runningStep === 16 ? <Loader2 size={14} className="animate-spin" /> : <ChevronRight size={14} />}{runningStep === 16 ? "Generating..." : "Generate Output"}</button><SaveIndicator statusKey="stage15a" /></div></div>);
      case 16: return (<div className="space-y-3">{pipeline.step_15b_tech_output_generated && sessionData!.tech_requirements_output ? <div className="space-y-2 text-sm text-dark-text"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-dark-success" /><span>Output generated</span></div><pre className="text-xs font-mono whitespace-pre-wrap bg-dark-bg rounded-lg p-3 max-h-[200px] overflow-y-auto">{sessionData!.tech_requirements_output}</pre><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setRunningStep(16); const r = await runStep("15b"); if (r) setStepResults((p) => ({ ...p, [16]: r.status === "success" ? "success" : "error" })); setRunningStep(null); }} disabled={runningStep === 16} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-dark-muted border border-dark-border rounded-lg hover:bg-dark-bg disabled:opacity-50 transition-colors">{runningStep === 16 ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Regenerate</button></div> : <p className="text-sm text-dark-muted">Tech Requirements output has not been generated yet. Complete step 15a first.</p>}</div>);
      case 17: return (<div className="space-y-3">{pipeline.step_15c_tech_pdf_built && sessionData!.tech_requirements_pdf_path ? <div className="space-y-2 text-sm text-dark-text"><div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-dark-success" /><span>PDF built</span></div><a href={`/api/online-program/wrap-up/pdf?path=${encodeURIComponent(sessionData!.tech_requirements_pdf_path)}`} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1.5"><FileText size={14} /> View PDF</a><button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); setRunningStep(17); const r = await runStep("15c"); if (r) setStepResults((p) => ({ ...p, [17]: r.status === "success" ? "success" : "error" })); setRunningStep(null); }} disabled={runningStep === 17} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-dark-muted border border-dark-border rounded-lg hover:bg-dark-bg disabled:opacity-50 transition-colors">{runningStep === 17 ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />} Regenerate</button></div> : <p className="text-sm text-dark-muted">Tech Requirements PDF has not been built yet. Complete step 15b first.</p>}</div>);
      case 18: { const isSent = pipeline.step_15d_tech_wa_sent || sessionData!.tech_requirements_wa_sent; return (<div className="space-y-3">{sessionData!.tech_requirements_pdf_path && <a href={`/api/online-program/wrap-up/pdf?path=${encodeURIComponent(sessionData!.tech_requirements_pdf_path)}`} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline flex items-center gap-1.5 text-sm"><FileText size={14} /> View Tech Requirements PDF</a>}{isSent ? <div className="flex items-center gap-3"><div className="text-sm text-dark-success flex items-center gap-2"><CheckCircle2 size={16} /> Sent to participants</div><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); patchSession({ pipeline_status: { step_15d_tech_wa_sent: false } }, "stage18"); }} disabled={saving} className="text-xs text-dark-muted hover:text-dark-muted underline transition-colors">undo</button></div> : <button type="button" onClick={async (e) => { e.preventDefault(); e.stopPropagation(); if (testMode) return; setRunningStep(18); const r = await runStep("15d"); if (r) setStepResults((p) => ({ ...p, [18]: r.status === "success" ? "success" : "error" })); setRunningStep(null); }} disabled={testMode || runningStep === 18 || !sessionData!.tech_requirements_pdf_path} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${testMode ? "bg-dark-panel2 text-dark-muted cursor-not-allowed" : "bg-cm-purple text-white hover:bg-cm-purple/80 disabled:opacity-50"}`}>{runningStep === 18 ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} {testMode ? "Send to Participants (TEST — will not send)" : "Send to Participants"}</button>}<SaveIndicator statusKey="stage18" /></div>); }
      default: return <p className="text-sm text-dark-muted">No content defined for this stage.</p>;
    }
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
      <CelebrationLayer />

      {/* Session header — click anywhere to collapse/expand the steps */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setPanelExpanded(!panelExpanded)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPanelExpanded(!panelExpanded); } }}
        className="px-6 py-5 cursor-pointer hover:bg-dark-bg transition-colors select-none"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <ChevronDown
              size={18}
              className={`text-dark-muted shrink-0 mt-1 transition-transform duration-200 ${panelExpanded ? "" : "-rotate-90"}`}
            />
            <div className="min-w-0">
              <h2 className="text-xl font-bold tracking-tight text-dark-text">{sessionData.title}</h2>
              <p className="text-sm text-dark-muted mt-0.5">
                {sessionData.cohort} &middot; Session {sessionData.session_number}
                {sessionData.date && ` \u00B7 ${sessionData.date}`}
              </p>
            </div>
          </div>
          {/* Buttons — stop propagation so they don't toggle the panel */}
          <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={testMode} onChange={() => { const n = !testMode; setTestMode(n); if (n) setTestModeInfoOpen(true); }} className="sr-only peer" />
                <div className={`w-9 h-5 rounded-full transition-colors ${testMode ? "bg-dark-warn" : "bg-dark-panel2"} peer-focus:ring-2 peer-focus:ring-cm-purple after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-dark-panel after:rounded-full after:h-4 after:w-4 after:transition-all ${testMode ? "after:translate-x-full" : ""}`} />
              </label>
              <span className={`text-sm font-medium ${testMode ? "text-dark-warn" : "text-dark-muted"}`}>Test Mode</span>
            </div>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!panelExpanded) setPanelExpanded(true); runPipeline(); }}
              disabled={pipelineRunning}
              className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-sm font-bold transition-colors shadow-sm"
            >
              {pipelineRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Pipeline
            </button>
          </div>
        </div>
        {/* Progress bar — stop propagation so clicking it doesn't collapse */}
        <div className="flex items-center gap-3 mt-4 ml-7" onClick={(e) => e.stopPropagation()}>
          <div className="flex-1 bg-dark-panel2 rounded-full h-2.5">
            <div className="bg-cm-purple h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="text-sm font-medium text-dark-muted whitespace-nowrap">
            {completedSteps} / {totalSteps} steps ({progressPct}%)
          </span>
          {allDone && (
            <span className="text-xs font-semibold text-dark-success bg-dark-success/10 border border-dark-success/30 px-2 py-0.5 rounded-full">
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Expanded content — stages list */}
      {panelExpanded && (
        <div className="border-t border-dark-border px-6 pb-6 pt-4 space-y-3">
          {testMode && testModeInfoOpen && (
            <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-4 mb-2 text-sm text-dark-warn">
              <p className="font-semibold mb-2">Test Mode &mdash; select which steps to force re-run:</p>
              <div className="space-y-1.5">
                {([["zoom","Zoom Download"],["youtube","YouTube Upload"],["chat","Chat Analysis"],["transcript","Transcript Summary"],["wix","Wix CMS Push"],["pdf","Follow-up PDF"],["notion","Notion SM Card"],["techOutput","Tech Requirements Output"],["techPdf","Tech Requirements PDF"]] as [string,string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={testSteps[key]} onChange={() => setTestSteps((p) => ({ ...p, [key]: !p[key] }))} className="rounded border-dark-border focus:ring-cm-purple" />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-dark-warn mt-2 italic">WhatsApp sends are always skipped in test mode regardless of settings.</p>
            </div>
          )}
          {/* Transcript */}
          <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
            <div role="button" tabIndex={0} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTranscriptOpen(!transcriptOpen); }} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setTranscriptOpen(!transcriptOpen); } }} className="w-full flex items-center justify-between px-5 py-3 hover:bg-dark-bg transition-colors cursor-pointer select-none">
              <div className="flex items-center gap-2"><FileText size={16} className="text-cm-purple" /><span className="text-sm font-semibold text-dark-text">Full Transcript</span><span className="text-xs text-dark-muted ml-1">{transcript.split("\n").length} lines</span></div>
              {transcriptOpen ? <ChevronDown size={16} className="text-dark-muted" /> : <ChevronRight size={16} className="text-dark-muted" />}
            </div>
            {transcriptOpen && <div className="px-5 pb-5 border-t border-dark-border pt-3"><pre className="text-xs text-dark-muted font-mono whitespace-pre-wrap bg-dark-bg rounded-lg p-4 max-h-[400px] overflow-y-auto">{transcript || "No transcript available."}</pre></div>}
          </div>
          {/* Stage cards */}
          {STAGES.map((stage, i) => <StageCard key={stage.stageNumber} stage={stage} stageIndex={i} />)}
        </div>
      )}
    </div>
  );
}

// -- Main Page --

export default function SessionWrapUpPage() {
  const [allSessions, setAllSessions] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);

  useEffect(() => {
    fetch("/api/online-program/wrap-up")
      .then((r) => r.json())
      .then((data) => {
        setAllSessions(data.available_sessions || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-cm-purple" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">Session Wrap-Up Pipeline</h1>
        <button
          onClick={() => setShowNewSessionModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus size={16} /> New Session
        </button>
      </div>

      {showNewSessionModal && (
        <NewSessionModal
          onClose={() => setShowNewSessionModal(false)}
          onCreated={(num) => {
            setAllSessions((prev) => [num, ...prev]);
            setShowNewSessionModal(false);
          }}
        />
      )}

      {allSessions.length === 0 ? (
        <div className="text-center py-16 text-dark-muted">
          <p className="text-lg font-medium">No sessions yet.</p>
          <p className="text-sm mt-1">Click &ldquo;New Session&rdquo; to get started.</p>
        </div>
      ) : (
        allSessions.map((num, i) => (
          <SessionPanel key={num} sessionNum={num} defaultExpanded={i === 0} />
        ))
      )}
    </div>
  );
}
