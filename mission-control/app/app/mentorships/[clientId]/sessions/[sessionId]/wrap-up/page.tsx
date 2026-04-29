"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCelebration } from "@/components/CelebrationBurst";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  Video,
  FileText,
  Clock,
  Send,
  RefreshCw,
  Trash2,
  Plus,
  Check,
  AlertCircle,
  Download,
} from "lucide-react";

// -- Helpers --

function cleanText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function renderParagraphs(text: string, className?: string) {
  const cleaned = cleanText(text);
  if (!cleaned) return null;
  return (
    <div className={className}>
      {cleaned.split("\n\n").map((para, i) => (
        <p key={i}>
          {para.split("\n").map((line, j, arr) => (
            <span key={j}>
              {line}
              {j < arr.length - 1 && <br />}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}

// -- Types --

interface PipelineStatus {
  [key: string]: boolean;
}

interface SessionData {
  id: string;
  client_id: string;
  session_number: number;
  date: string;
  type: string;
  duration_minutes: number;
  actual_duration_minutes?: number;
  booked_duration_minutes?: number;
  hours_logged: number;
  zoom_recording_url: string | null;
  zoom_recording_url_with_pwd?: string | null;
  zoom_recording_password?: string | null;
  zoom_download_mp4?: string | null;
  zoom_download_m4a?: string | null;
  transcript_file: string | null;
  transcript_raw: string | null;
  ai_summary: string | null;
  key_points: string[];
  follow_ups: string[];
  client_follow_ups?: string[];
  joe_follow_ups?: string[];
  profile_notes: string;
  next_session_notes?: string;
  pdf_path: string | null;
  pdf_sent: boolean;
  whatsapp_sent: boolean;
  pipeline_status: Record<string, boolean>;
}

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  whatsapp_jid?: string;
  photo_url?: string | null;
  hours_purchased?: number;
  hours_used?: number;
  hours_remaining?: number;
}

interface StageDefinition {
  id: number;
  name: string;
  statusKey: string;
  type: "automated" | "manual" | "approval";
  description: string;
}

// -- Stage Definitions --

const STAGES: StageDefinition[] = [
  {
    id: 1,
    name: "Recording Detected",
    statusKey: "step_1_recording_detected",
    type: "automated",
    description: "Zoom recording found and matched to client",
  },
  {
    id: 2,
    name: "Transcript Extracted",
    statusKey: "step_2_transcript_extracted",
    type: "automated",
    description: "Audio transcribed and saved",
  },
  {
    id: 3,
    name: "AI Summary",
    statusKey: "step_3_summary_viewed",
    type: "automated",
    description: "AI-generated summary of key points and follow-ups",
  },
  {
    id: 4,
    name: "Hours Logged",
    statusKey: "step_4_hours_logged",
    type: "automated",
    description: "Session duration recorded from call length",
  },
  {
    id: 5,
    name: "Client Profile Updated",
    statusKey: "step_5_profile_updated",
    type: "automated",
    description: "Profile notes saved to client record",
  },
  {
    id: 6,
    name: "Review & Approve To-Dos",
    statusKey: "step_6_todos_approved",
    type: "approval" as const,
    description: "Review and finalize action items before generating the PDF",
  },
  {
    id: 7,
    name: "Review & Send PDF",
    statusKey: "step_7_pdf_built",
    type: "approval" as const,
    description: "Review PDF, request changes, then approve to send to client",
  },
  {
    id: 8,
    name: "Plan Next Session",
    statusKey: "step_10_next_planned",
    type: "manual",
    description: "Note what to cover in the next session",
  },
];

function typeBadgeClass(t: "automated" | "manual" | "approval"): string {
  switch (t) {
    case "automated":
      return "bg-cm-purple/15 text-cm-purple";
    case "manual":
      return "bg-orange-500/20 text-orange-300";
    case "approval":
      return "bg-cm-pink/15 text-[#9b5b5e]";
  }
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// -- To-Do Item Component --

function TodoItem({
  text,
  checked,
  onCheck,
  onDelete,
}: {
  text: string;
  checked: boolean;
  onCheck: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-start gap-2 py-2 border-b border-cm-purple/15 last:border-0 group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onCheck}
        className="mt-0.5 accent-[#7C69C7]"
      />
      <span
        className={`flex-1 text-sm ${
          checked ? "line-through text-dark-muted" : "text-dark-text"
        }`}
      >
        {cleanText(text)}
      </span>
      <button
        onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-muted hover:text-dark-danger"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// -- Transcript Editor --

function TranscriptEditor({
  sessionId, clientId, initialText, onSaved
}: {
  sessionId: string; clientId: string; initialText: string;
  onSaved: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript_raw: text }),
      });
      onSaved(text);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={20}
        className="w-full text-xs font-mono border border-dark-border rounded-lg p-3 focus:ring-1 focus:ring-cm-purple outline-none resize-y bg-dark-panel2/30 leading-relaxed"
        placeholder="Transcript content..."
      />
      <div className="flex items-center gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-xs bg-cm-purple text-white px-4 py-1.5 rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 flex items-center gap-1.5"
        >
          {saving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</> : saved ? <><Check className="w-3 h-3" /> Saved</> : 'Save Transcript'}
        </button>
        <span className="text-xs text-dark-muted">{text.split('\n').length} lines</span>
      </div>
    </div>
  );
}

// -- Main Page --

export default function WrapUpPage() {
  const params = useParams<{ clientId: string; sessionId: string }>();
  const { clientId, sessionId } = params;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [client, setClient] = useState<ClientData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineStatus>({});
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [runningAction, setRunningAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [sendResult, setSendResult] = useState<{ wa_sent: boolean; email_sent: boolean; wa_error?: string; email_error?: string } | null>(null);

  // Step-specific state
  const [hoursInput, setHoursInput] = useState("");
  const [nextPlan, setNextPlan] = useState("");
  const [pdfFeedback, setPdfFeedback] = useState("");

  // To-do state
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [addingJoeTodo, setAddingJoeTodo] = useState(false);
  const [addingClientTodo, setAddingClientTodo] = useState(false);
  const [newJoeTodoText, setNewJoeTodoText] = useState("");
  const [newClientTodoText, setNewClientTodoText] = useState("");

  const [triggerCelebration, CelebrationLayer] = useCelebration();

  // Load checkbox state from DB (authoritative), fall back to localStorage
  useEffect(() => {
    if (!session) return;
    const checked: Record<string, boolean> = {};
    const joeDone = (session as any).joe_follow_ups_done || [];
    const clientDone = (session as any).client_follow_ups_done || [];
    (session.joe_follow_ups || []).forEach((text: string, i: number) => {
      if (joeDone.includes(text)) checked[`joe-${i}`] = true;
    });
    const clientSrc = session.client_follow_ups || session.follow_ups || [];
    clientSrc.forEach((text: string, i: number) => {
      if (clientDone.includes(text)) checked[`client-${i}`] = true;
    });
    setCheckedItems(checked);
  }, [session?.id]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/mentorships/${clientId}/sessions/${sessionId}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setSession(data.session);
      setHoursInput(String(data.session.hours_logged || ""));
      setNextPlan(data.session.next_session_notes || "");

      if (data.client) {
        setClient(data.client);
      }

      // Build pipeline with auto-marks
      const p = data.session.pipeline_status || {};
      if (data.session && !p.step_1_recording_detected)
        p.step_1_recording_detected = true;
      if (data.session.transcript_file && !p.step_2_transcript_extracted)
        p.step_2_transcript_extracted = true;
      if (data.session.ai_summary && !p.step_3_summary_viewed)
        p.step_3_summary_viewed = true;
      if ((data.session.hours_logged || 0) > 0 && !p.step_4_hours_logged)
        p.step_4_hours_logged = true;
      if (data.session.pdf_path && !p.step_7_pdf_built)
        p.step_7_pdf_built = true;
      if ((data.session.whatsapp_sent || data.session.pdf_sent) && !p.step_9_pdf_sent)
        p.step_9_pdf_sent = true;
      setPipeline(p);

      // Auto-expand first incomplete step
      const firstIncomplete = STAGES.find((s) => !p[s.statusKey]);
      if (firstIncomplete) {
        setExpandedStep(firstIncomplete.id);
      }
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  }, [clientId, sessionId]);

  const fetchClient = useCallback(async () => {
    try {
      const res = await fetch(`/api/mentorships/${clientId}`);
      if (res.ok) {
        const data = await res.json();
        setClient(data.client);
      }
    } catch {
      // Non-critical
    }
  }, [clientId]);

  useEffect(() => {
    fetchData();
    fetchClient();
  }, [fetchData, fetchClient]);

  // Celebration when all done
  useEffect(() => {
    if (!session) return;
    const allDone = STAGES.every((s) => pipeline[s.statusKey]);
    if (allDone) {
      const cx =
        typeof window !== "undefined" ? window.innerWidth / 2 : 500;
      const cy =
        typeof window !== "undefined" ? window.innerHeight / 2 : 400;
      triggerCelebration({ clientX: cx, clientY: cy });
      setTimeout(
        () => triggerCelebration({ clientX: cx * 0.3, clientY: cy * 0.4 }),
        300
      );
      setTimeout(
        () => triggerCelebration({ clientX: cx * 1.7, clientY: cy * 0.5 }),
        500
      );
    }
  }, [pipeline, session, triggerCelebration]);

  // -- Actions --

  async function updatePipeline(newPipeline: PipelineStatus) {
    setPipeline(newPipeline);
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipeline_status: newPipeline }),
      });
    } catch {
      fetchData();
    }
  }

  async function markStepDone(statusKey: string) {
    const updated = { ...pipeline, [statusKey]: true };
    await updatePipeline(updated);
  }

  function toggleStep(stepId: number) {
    setExpandedStep(expandedStep === stepId ? null : stepId);
  }

  async function toggleCheck(key: string, itemText: string, listType: "joe" | "client") {
    const newChecked = !checkedItems[key];
    setCheckedItems((prev) => ({ ...prev, [key]: newChecked }));

    const joeDone: string[] = (session as any)?.joe_follow_ups_done || [];
    const clientDone: string[] = (session as any)?.client_follow_ups_done || [];

    let update: Record<string, string[]>;
    if (listType === "joe") {
      update = {
        joe_follow_ups_done: newChecked
          ? [...joeDone, itemText]
          : joeDone.filter((t) => t !== itemText),
      };
    } else {
      update = {
        client_follow_ups_done: newChecked
          ? [...clientDone, itemText]
          : clientDone.filter((t) => t !== itemText),
      };
    }

    await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });

    setSession((prev: any) => prev ? { ...prev, ...update } : prev);
  }

  async function handleAdjustHours() {
    const hours = parseFloat(hoursInput);
    if (isNaN(hours) || hours <= 0) return;
    setRunningAction("step_4_hours_logged");
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours_logged: hours,
          duration_minutes: Math.round(hours * 60),
        }),
      });
      await markStepDone("step_4_hours_logged");
      await fetchData();
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  async function handleRegenerateSummary() {
    setRunningAction("step_3_summary_viewed");
    setActionError(null);
    try {
      const res = await fetch(
        `/api/mentorships/${clientId}/sessions/${sessionId}/summarize`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await fetchData();
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  async function handleUpdateProfile() {
    setRunningAction("step_5_profile_updated");
    setActionError(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: session?.profile_notes || "" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await markStepDone("step_5_profile_updated");
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  async function handleApproveTodos() {
    // Mark step 6 done
    const updated = { ...pipeline, step_6_todos_approved: true };
    setPipeline(updated);
    await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipeline_status: updated }),
    });

    // Auto-expand step 7 (Build PDF)
    setExpandedStep(7);

    // Immediately trigger PDF generation
    setRunningAction("pdf");
    try {
      const res = await fetch(
        `/api/mentorships/${clientId}/sessions/${sessionId}/pdf`,
        { method: "POST" }
      );
      if (res.ok) {
        // Reload session to get updated pdf_path
        await fetchData();
        const pdfUpdated = { ...updated, step_7_pdf_built: true };
        setPipeline(pdfUpdated);
        await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pipeline_status: pdfUpdated }),
        });
      }
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setRunningAction(null);
    }
  }

  async function handleRegeneratePdf() {
    setRunningAction("step_8_pdf_approved");
    setActionError(null);
    try {
      const res = await fetch(
        `/api/mentorships/${clientId}/sessions/${sessionId}/pdf`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feedback: pdfFeedback || undefined }),
        }
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Failed" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      await fetchData();
      setPdfFeedback("");
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  async function handleApproveAndSend() {
    setRunningAction("step_7_pdf_built");
    setActionError(null);
    setSendResult(null);
    try {
      const res = await fetch(
        `/api/mentorships/${clientId}/sessions/${sessionId}/send-pdf`,
        { method: "POST" }
      );
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setSendResult(body);
      // Mark pipeline done
      const updated = {
        ...pipeline,
        step_7_pdf_built: true,
        step_8_pdf_approved: true,
        step_9_pdf_sent: true,
      };
      await updatePipeline(updated);
      await fetchData();
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  async function handleSaveNextSession() {
    setRunningAction("step_10_next_planned");
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next_session_notes: nextPlan }),
      });
      await markStepDone("step_10_next_planned");
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    } finally {
      setRunningAction(null);
    }
  }

  // To-do management
  async function addJoeTodo() {
    if (!newJoeTodoText.trim() || !session) return;
    const scrollY = window.scrollY;
    const updated = [...(session.joe_follow_ups || []), newJoeTodoText.trim()];
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joe_follow_ups: updated }),
      });
      setNewJoeTodoText("");
      setAddingJoeTodo(false);
      await fetchData();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    }
  }

  async function deleteJoeTodo(index: number) {
    if (!session) return;
    const scrollY = window.scrollY;
    const updated = (session.joe_follow_ups || []).filter(
      (_, i) => i !== index
    );
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joe_follow_ups: updated }),
      });
      await fetchData();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    }
  }

  async function addClientTodo() {
    if (!newClientTodoText.trim() || !session) return;
    const scrollY = window.scrollY;
    const source = session.client_follow_ups || session.follow_ups || [];
    const updated = [...source, newClientTodoText.trim()];
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_follow_ups: updated }),
      });
      setNewClientTodoText("");
      setAddingClientTodo(false);
      await fetchData();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    }
  }

  async function deleteClientTodo(index: number) {
    if (!session) return;
    const scrollY = window.scrollY;
    const source = session.client_follow_ups || session.follow_ups || [];
    const updated = source.filter((_, i) => i !== index);
    try {
      await fetch(`/api/mentorships/${clientId}/sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_follow_ups: updated }),
      });
      await fetchData();
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior }));
    } catch (err) {
      setActionError(String(err instanceof Error ? err.message : err));
    }
  }

  // -- Step Content Renderers --

  function renderStepContent(stage: StageDefinition) {
    if (!session) return null;
    const isRunning = runningAction === stage.statusKey;
    const isDone = pipeline[stage.statusKey];
    const clientName = client?.name || clientId;

    switch (stage.statusKey) {
      case "step_1_recording_detected":
        return (
          <div className="space-y-3">
            <p className="text-sm text-dark-muted">
              Matched to{" "}
              <span className="font-semibold text-dark-text">
                {clientName}
              </span>{" "}
              via calendar
            </p>
            {session.zoom_recording_url && (
              <a
                href={session.zoom_recording_url_with_pwd || session.zoom_recording_url || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/15 text-sm font-medium transition-colors"
              >
                <Video className="w-4 h-4" />
                View Recording
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            {!isDone && (
              <button
                onClick={() => markStepDone("step_1_recording_detected")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Mark Done
              </button>
            )}
          </div>
        );

      case "step_2_transcript_extracted": {
        const fileName = session.transcript_file ? session.transcript_file.split("/").pop() : null;
        return (
          <div className="space-y-3">
            {fileName && (
              <p className="text-xs text-dark-muted font-mono bg-dark-bg rounded px-2 py-1">{fileName}</p>
            )}
            <TranscriptEditor
              sessionId={sessionId}
              clientId={clientId}
              initialText={cleanText(session.transcript_raw) || ''}
              onSaved={(newText) => {
                setSession(prev => prev ? { ...prev, transcript_raw: newText } : prev);
              }}
            />
            {!isDone && (
              <button onClick={() => markStepDone("step_2_transcript_extracted")} className="text-xs bg-cm-purple text-white px-3 py-1.5 rounded-lg hover:bg-[#5b4fa8]">
                Mark Done
              </button>
            )}
          </div>
        );
      }

      case "step_3_summary_viewed":
        return (
          <div className="space-y-3">
            {session.ai_summary ? (
              <>
                <div className="bg-dark-panel border border-cm-purple/20 rounded-lg p-4">
                  {renderParagraphs(
                    session.ai_summary,
                    "text-sm text-dark-text leading-relaxed space-y-2"
                  )}
                </div>
                {session.key_points && session.key_points.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-dark-text mb-1.5 uppercase tracking-wide">
                      Key Points
                    </h4>
                    <ol className="space-y-1.5">
                      {session.key_points.map((point, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-dark-muted"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-cm-purple/15 text-cm-purple text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <span>{cleanText(point)}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-dark-muted">
                No summary generated yet.
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegenerateSummary}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/15 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate Summary
              </button>
              {!isDone && (
                <button
                  onClick={() => markStepDone("step_3_summary_viewed")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Done
                </button>
              )}
            </div>
          </div>
        );

      case "step_4_hours_logged":
        return (
          <div className="space-y-3">
            <p className="text-sm text-dark-muted">
              {session.actual_duration_minutes || session.duration_minutes}{" "}
              minutes ({session.hours_logged} hour
              {session.hours_logged !== 1 ? "s" : ""} logged)
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={hoursInput}
                onChange={(e) => setHoursInput(e.target.value)}
                step={0.25}
                min={0.25}
                className="w-20 border border-dark-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cm-purple text-dark-text"
              />
              <button
                onClick={handleAdjustHours}
                disabled={
                  isRunning || !hoursInput || parseFloat(hoursInput) <= 0
                }
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Save
              </button>
            </div>
            {!isDone && (
              <button
                onClick={() => markStepDone("step_4_hours_logged")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-medium transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
                Mark Done
              </button>
            )}
          </div>
        );

      case "step_5_profile_updated":
        return (
          <div className="space-y-3">
            {session.profile_notes ? (
              <div className="bg-dark-bg rounded-lg p-3 max-h-48 overflow-y-auto">
                {renderParagraphs(
                  session.profile_notes,
                  "text-sm text-dark-text space-y-2"
                )}
              </div>
            ) : (
              <p className="text-sm text-dark-muted">
                No profile notes available.
              </p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={handleUpdateProfile}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isRunning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Run Update
              </button>
              {isDone && (
                <span className="flex items-center gap-1 text-sm text-dark-success">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Updated
                </span>
              )}
              {!isDone && (
                <button
                  onClick={() => markStepDone("step_5_profile_updated")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Mark Done
                </button>
              )}
            </div>
          </div>
        );

      case "step_6_todos_approved": {
        const joeTodos = session.joe_follow_ups || [];
        const clientTodos = session.client_follow_ups || session.follow_ups || [];
        return (
          <div className="space-y-4">
            <p className="text-sm text-dark-muted">
              Review the action items below. Once approved, the follow-up PDF will be generated automatically with these items included.
            </p>

            {/* Joe's to-dos preview */}
            <div className="border-l-2 border-cm-purple pl-3 space-y-1">
              <p className="text-xs font-semibold text-cm-purple uppercase tracking-wide mb-2">Your Action Items</p>
              {joeTodos.length === 0 ? (
                <p className="text-xs text-dark-muted italic">No action items yet</p>
              ) : (
                joeTodos.map((todo, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-dark-muted text-xs mt-0.5">&rarr;</span>
                    <p className="text-sm text-dark-text">{todo}</p>
                  </div>
                ))
              )}
            </div>

            {/* Client's to-dos preview */}
            <div className="border-l-2 border-cm-pink pl-3 space-y-1">
              <p className="text-xs font-semibold text-[#9b5b5e] uppercase tracking-wide mb-2">{clientName}&apos;s Action Items</p>
              {clientTodos.length === 0 ? (
                <p className="text-xs text-dark-muted italic">No action items yet</p>
              ) : (
                clientTodos.map((todo, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-dark-muted text-xs mt-0.5">&rarr;</span>
                    <p className="text-sm text-dark-text">{todo}</p>
                  </div>
                ))
              )}
            </div>

            <p className="text-xs text-dark-muted bg-dark-bg rounded-lg px-3 py-2">
              Note: You can still edit to-dos on the right panel after approving. The PDF will always use the latest saved version.
            </p>

            {!pipeline.step_6_todos_approved && (
              <button
                onClick={handleApproveTodos}
                className="w-full bg-cm-purple text-white py-2.5 rounded-xl font-medium hover:bg-[#5b4fa8] transition-colors flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Approve To-Dos &amp; Generate PDF
              </button>
            )}

            {pipeline.step_6_todos_approved && (
              <div className="flex items-center gap-2 text-dark-success text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                To-dos approved. PDF generation triggered.
              </div>
            )}
          </div>
        );
      }

      case "step_7_pdf_built":
        return (
          <div className="space-y-3">
            {session.pdf_path && (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm text-dark-success">
                  <CheckCircle2 className="w-4 h-4" />
                  PDF ready
                </span>
                <a
                  href={`/api/mentorships/${clientId}/sessions/${sessionId}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/15 text-sm font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View PDF
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}

            {/* Feedback + Regenerate */}
            <div>
              <textarea
                value={pdfFeedback}
                onChange={(e) => setPdfFeedback(e.target.value)}
                rows={2}
                placeholder="Describe any changes needed, then hit Regenerate..."
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cm-purple text-dark-text resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRegeneratePdf}
                disabled={runningAction === "step_8_pdf_approved"}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple/15 text-cm-purple rounded-lg hover:bg-cm-purple/15 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {runningAction === "step_8_pdf_approved" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate
              </button>

              {!pipeline.step_9_pdf_sent && (
                <button
                  onClick={handleApproveAndSend}
                  disabled={runningAction === "step_7_pdf_built" || !session.pdf_path}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 text-sm font-medium transition-colors"
                >
                  {runningAction === "step_7_pdf_built" ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> Approve &amp; Send</>
                  )}
                </button>
              )}
            </div>

            {/* Send result */}
            {sendResult && (
              <div className="space-y-1.5 mt-2">
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${sendResult.wa_sent ? 'bg-dark-success/10 text-dark-success' : 'bg-dark-warn/10 text-dark-warn'}`}>
                  {sendResult.wa_sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {sendResult.wa_sent ? 'Sent via WhatsApp' : `WhatsApp failed${sendResult.wa_error ? ': wacli unavailable' : ''}`}
                </div>
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${sendResult.email_sent ? 'bg-dark-success/10 text-dark-success' : 'bg-dark-warn/10 text-dark-warn'}`}>
                  {sendResult.email_sent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                  {sendResult.email_sent ? `Emailed to ${client?.email || 'client'}` : 'Email failed'}
                </div>
              </div>
            )}

            {pipeline.step_9_pdf_sent && !sendResult && (
              <div className="flex items-center gap-2 text-sm text-dark-success bg-dark-success/10 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4" />
                Sent to client
              </div>
            )}
          </div>
        );

      case "step_10_next_planned":
        return (
          <div className="space-y-3">
            <textarea
              value={nextPlan}
              onChange={(e) => setNextPlan(e.target.value)}
              rows={4}
              placeholder="What to cover next session..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cm-purple text-dark-text resize-none"
            />
            <button
              onClick={handleSaveNextSession}
              disabled={isRunning || !nextPlan.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {isRunning ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              Save & Complete
            </button>
          </div>
        );

      default:
        return null;
    }
  }

  // -- Loading / Error states --

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-cm-purple" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-dark-danger">{error || "Session not found"}</p>
        <Link
          href={`/app/mentorships/${clientId}`}
          className="text-cm-purple hover:text-[#5b4fa8] text-sm"
        >
          Back to Client
        </Link>
      </div>
    );
  }

  const completedCount = STAGES.filter((s) => pipeline[s.statusKey]).length;
  const clientName = client?.name || clientId;
  const joeTodos = session.joe_follow_ups || [];
  const clientTodos = session.client_follow_ups || session.follow_ups || [];

  return (
    <div className="space-y-6 pb-12">
      <CelebrationLayer />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-2xl p-6 md:p-8">
        <Link
          href={`/app/mentorships/${clientId}`}
          className="inline-flex items-center gap-1.5 text-cm-purple hover:text-[#5b4fa8] text-sm mb-4"
        >
          <ArrowLeft size={16} />
          Back to {clientName}
        </Link>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">
              Session {session.session_number} Wrap-up
            </h1>
            <p className="text-sm text-dark-muted mt-1">
              {formatShortDate(session.date)} with {clientName}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-dark-panel/70 rounded-full text-xs text-dark-muted">
              <Clock className="w-3 h-3 text-cm-purple" />
              {session.actual_duration_minutes || session.duration_minutes} min
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-dark-panel/70 rounded-full text-xs text-dark-muted">
              {session.hours_logged} hr logged
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-dark-panel/70 rounded-full text-xs text-dark-muted capitalize">
              {session.type}
            </span>
            {session.zoom_recording_url && (
              <a
                href={session.zoom_recording_url_with_pwd || session.zoom_recording_url || ""}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-cm-purple/15 rounded-full text-xs text-cm-purple hover:bg-cm-purple/15 transition-colors"
              >
                <Video className="w-3 h-3" />
                Recording
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-4 py-3">
          <AlertCircle size={16} />
          {actionError}
          <button
            onClick={() => setActionError(null)}
            className="ml-auto text-red-400 hover:text-dark-danger"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 50/50 Split Layout */}
      <div className="flex gap-6 items-start">
        {/* LEFT: Pipeline Accordion */}
        <div className="w-1/2 space-y-3">
          {/* Progress bar */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-dark-muted font-medium">
                {completedCount} of {STAGES.length} complete
              </span>
              <span className="font-medium text-cm-purple">
                {Math.round((completedCount / STAGES.length) * 100)}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-cm-purple/12 rounded-full overflow-hidden">
              <div
                className="h-full bg-cm-purple rounded-full transition-all duration-500"
                style={{
                  width: `${(completedCount / STAGES.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Accordion items */}
          {STAGES.map((stage) => {
            const isDone = pipeline[stage.statusKey];
            const isExpanded = expandedStep === stage.id;

            return (
              <div
                key={stage.id}
                className="border border-dark-border rounded-xl overflow-hidden"
              >
                {/* Header row */}
                <button
                  onClick={() => toggleStep(stage.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-cm-purple/10 transition-colors"
                >
                  {isDone ? (
                    <CheckCircle2 className="text-dark-success w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Circle className="text-dark-muted w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left text-sm font-medium text-dark-text">
                    {stage.name}
                  </span>
                  {isDone ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-dark-success/20 text-dark-success font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Completed
                    </span>
                  ) : (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${typeBadgeClass(stage.type)}`}>
                      {stage.type === "automated" ? "Auto" : stage.type === "manual" ? "Manual" : "Review"}
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-dark-muted" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-dark-muted" />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-dark-border bg-dark-panel2/50">
                    <div className="pt-3">
                      {renderStepContent(stage)}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* All done indicator */}
          {completedCount === STAGES.length && (
            <div className="bg-dark-success/10 border border-dark-success/30 rounded-xl p-4 text-center">
              <CheckCircle2
                size={28}
                className="text-dark-success mx-auto mb-2"
              />
              <p className="text-sm font-bold text-dark-text">All Done</p>
              <p className="text-xs text-dark-muted">
                Session {session.session_number} wrap-up complete
              </p>
            </div>
          )}
        </div>

        {/* RIGHT: Session Details + To-Do Lists */}
        <div className="w-1/2 space-y-4">
          {/* Session Details Card */}
          {(session.zoom_download_mp4 || session.zoom_download_m4a || session.transcript_file || (client?.hours_purchased && client.hours_purchased > 0)) && (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
              <h3 className="text-sm font-semibold text-cm-purple mb-3">Session Details</h3>
              <div className="space-y-2.5 text-sm">
                {/* Recording Downloads */}
                {(session.zoom_download_mp4 || session.zoom_download_m4a) && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-dark-muted uppercase tracking-wide">Downloads</span>
                    <div className="flex flex-wrap gap-2">
                      {session.zoom_download_mp4 && (
                        <a
                          href={session.zoom_download_mp4}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-cm-purple transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          MP4
                        </a>
                      )}
                      {session.zoom_download_m4a && (
                        <a
                          href={session.zoom_download_m4a}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm text-dark-muted hover:text-cm-purple transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Audio
                        </a>
                      )}
                    </div>
                  </div>
                )}
                {/* Transcript File */}
                {session.transcript_file && (
                  <div className="flex items-start gap-2 pt-1 border-t border-cm-purple/15">
                    <FileText className="w-3.5 h-3.5 text-cm-purple flex-shrink-0 mt-0.5" />
                    <span className="text-xs text-dark-muted break-all font-mono">
                      {session.transcript_file.split("/").pop() || session.transcript_file}
                    </span>
                  </div>
                )}
                {/* Hours Balance */}
                {client?.hours_purchased && client.hours_purchased > 0 && (
                  <div className="pt-1 border-t border-cm-purple/15">
                    <div className="flex justify-between text-xs text-dark-muted mb-1">
                      <span>Hours Used</span>
                      <span>
                        {(client.hours_used || 0).toFixed(1)} / {client.hours_purchased} hrs
                      </span>
                    </div>
                    <div className="w-full h-2 bg-cm-purple/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cm-purple rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round(((client.hours_used || 0) / client.hours_purchased) * 100))}%` }}
                      />
                    </div>
                    <p className="text-xs text-dark-muted mt-1">
                      {(client.hours_remaining || 0).toFixed(1)} hrs remaining
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Your To-Dos (Joe) */}
          <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cm-purple/15">
              <div className="w-1 h-6 bg-cm-purple rounded-full" />
              <h3 className="text-sm font-bold text-dark-text flex-1">
                Your To-Dos
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cm-purple/15 text-cm-purple font-medium">
                {joeTodos.length}
              </span>
            </div>
            <div className="px-4 py-2">
              {joeTodos.length === 0 && !addingJoeTodo && (
                <p className="text-sm text-dark-muted py-2">
                  No to-dos yet.
                </p>
              )}
              {joeTodos.map((item, i) => (
                <TodoItem
                  key={`joe-${i}`}
                  text={item}
                  checked={checkedItems[`joe-${i}`] || false}
                  onCheck={() => toggleCheck(`joe-${i}`, item, "joe")}
                  onDelete={() => deleteJoeTodo(i)}
                />
              ))}
              {addingJoeTodo ? (
                <div className="flex gap-2 mt-2 mb-2">
                  <input
                    value={newJoeTodoText}
                    onChange={(e) => setNewJoeTodoText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addJoeTodo();
                    }}
                    placeholder="New to-do..."
                    className="flex-1 text-sm border rounded-lg px-2 py-1 border-dark-border focus:ring-1 focus:ring-cm-purple outline-none"
                    autoFocus
                  />
                  <button
                    onClick={addJoeTodo}
                    className="text-sm bg-cm-purple text-white px-3 py-1 rounded-lg hover:bg-[#5b4fa8] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setAddingJoeTodo(false);
                      setNewJoeTodoText("");
                    }}
                    className="text-sm text-dark-muted px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingJoeTodo(true)}
                  className="flex items-center gap-1.5 text-sm text-cm-purple hover:text-[#5b4fa8] py-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to-do
                </button>
              )}
            </div>
          </div>

          {/* Client To-Dos */}
          <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-cm-purple/15">
              <div className="w-1 h-6 bg-cm-pink rounded-full" />
              <h3 className="text-sm font-bold text-dark-text flex-1">
                {client?.name
                  ? `${client.name.split(" ")[0]}'s To-Dos`
                  : "Client To-Dos"}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cm-pink/15 text-[#9b5b5e] font-medium">
                {clientTodos.length}
              </span>
            </div>
            <div className="px-4 py-2">
              {clientTodos.length === 0 && !addingClientTodo && (
                <p className="text-sm text-dark-muted py-2">
                  No to-dos yet.
                </p>
              )}
              {clientTodos.map((item, i) => (
                <TodoItem
                  key={`client-${i}`}
                  text={item}
                  checked={checkedItems[`client-${i}`] || false}
                  onCheck={() => toggleCheck(`client-${i}`, item, "client")}
                  onDelete={() => deleteClientTodo(i)}
                />
              ))}
              {addingClientTodo ? (
                <div className="flex gap-2 mt-2 mb-2">
                  <input
                    value={newClientTodoText}
                    onChange={(e) => setNewClientTodoText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addClientTodo();
                    }}
                    placeholder="New to-do..."
                    className="flex-1 text-sm border rounded-lg px-2 py-1 border-dark-border focus:ring-1 focus:ring-cm-purple outline-none"
                    autoFocus
                  />
                  <button
                    onClick={addClientTodo}
                    className="text-sm bg-cm-purple text-white px-3 py-1 rounded-lg hover:bg-[#5b4fa8] transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setAddingClientTodo(false);
                      setNewClientTodoText("");
                    }}
                    className="text-sm text-dark-muted px-2"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingClientTodo(true)}
                  className="flex items-center gap-1.5 text-sm text-cm-purple hover:text-[#5b4fa8] py-2 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to-do
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
