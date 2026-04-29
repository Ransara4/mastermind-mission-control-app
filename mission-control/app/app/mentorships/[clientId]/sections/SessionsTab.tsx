"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  Plus,
  X,
  Video,
  DollarSign,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Session, Payment, typeColor, statusColor, methodLabel, formatDate } from "./types";

// -- Edit Session Modal --

interface EditSessionModalProps {
  session: Session;
  clientId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function EditSessionModal({ session: s, clientId, onClose, onSaved }: EditSessionModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(s.date);
  const [type, setType] = useState(s.type);
  const [duration, setDuration] = useState(String(s.duration_minutes));
  const [status, setStatus] = useState(s.status);
  const [zoomUrl, setZoomUrl] = useState(s.zoom_recording_url ?? "");
  const [internalVideoUrl, setInternalVideoUrl] = useState(s.internal_video_url ?? "");
  const [goals, setGoals] = useState(s.session_goals ?? "");
  const [summary, setSummary] = useState(s.ai_summary ?? "");
  const [keyPoints, setKeyPoints] = useState((s.key_points ?? []).join("\n"));
  const [joeFollowUps, setJoeFollowUps] = useState((s.joe_follow_ups ?? []).join("\n"));
  const [clientFollowUps, setClientFollowUps] = useState((s.client_follow_ups ?? []).join("\n"));

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/mentorships/${clientId}/sessions/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          duration_minutes: Number(duration),
          hours_logged: parseFloat((parseFloat(duration) / 60).toFixed(2)),
          status,
          zoom_recording_url: zoomUrl || null,
          internal_video_url: internalVideoUrl || null,
          session_goals: goals,
          ai_summary: summary || null,
          key_points: keyPoints.split("\n").map((l) => l.trim()).filter(Boolean),
          joe_follow_ups: joeFollowUps.split("\n").map((l) => l.trim()).filter(Boolean),
          client_follow_ups: clientFollowUps.split("\n").map((l) => l.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/50 w-full max-w-4xl h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-t-2xl flex-shrink-0">
          <h2 className="text-base font-semibold text-dark-text">Edit Session #{s.session_number}</h2>
          <button onClick={onClose} className="text-dark-muted hover:text-dark-text"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as Session["type"])}
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple">
                {["zoom", "whatsapp", "in-person", "phone", "async", "prep", "admin"].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value as Session["status"])}
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple">
                <option value="scheduled">scheduled</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Minutes</label>
              <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)}
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Hours</label>
              <div className="w-full bg-dark-panel2/50 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-muted select-none">
                {isNaN(parseFloat(duration)) ? "—" : (parseFloat(duration) / 60).toFixed(2)}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Published Video Link <span className="font-normal">(sent to client)</span></label>
              <input type="url" value={zoomUrl} onChange={(e) => setZoomUrl(e.target.value)} placeholder="https://zoom.us/rec/..."
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dark-muted mb-1">Internal Video Link <span className="font-normal">(Descript, internal only)</span></label>
              <input type="url" value={internalVideoUrl} onChange={(e) => setInternalVideoUrl(e.target.value)} placeholder="https://share.descript.com/..."
                className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Session Goals</label>
            <textarea value={goals} onChange={(e) => setGoals(e.target.value)} rows={6} placeholder="What did we want to accomplish this session?"
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">AI Summary</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={5}
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Key Points <span className="font-normal text-dark-muted">(one per line)</span></label>
            <textarea value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} rows={4}
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Joe&apos;s Follow-ups <span className="font-normal text-dark-muted">(one per line)</span></label>
            <textarea value={joeFollowUps} onChange={(e) => setJoeFollowUps(e.target.value)} rows={4}
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-dark-muted mb-1">Client Follow-ups <span className="font-normal text-dark-muted">(one per line)</span></label>
            <textarea value={clientFollowUps} onChange={(e) => setClientFollowUps(e.target.value)} rows={4}
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-4 py-3">
              <AlertCircle size={15} />{error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple-mid disabled:opacity-50 text-sm font-semibold transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Expandable Session Card --

interface ExpandableSessionProps {
  session: Session;
  clientId: string;
  onUpdated: () => void;
}

export function ExpandableSession({ session: s, clientId, onUpdated }: ExpandableSessionProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <button
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-cm-purple/15 text-cm-purple text-sm font-bold flex-shrink-0">
            #{s.session_number}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-dark-text">
                {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor(s.type)}`}>{s.type}</span>
              <span className="text-xs text-dark-muted">{s.hours_logged.toFixed(1)} hrs</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{s.status}</span>
              {(s.joe_follow_ups?.length ?? 0) > 0 && (
                <span className="text-xs text-dark-muted">
                  {s.joe_follow_ups_done?.length ?? 0}/{s.joe_follow_ups.length} Joe tasks done
                </span>
              )}
            </div>
            {s.ai_summary && !open && (
              <p className="text-xs text-dark-muted mt-1 truncate">{s.ai_summary.slice(0, 100)}{s.ai_summary.length > 100 ? "..." : ""}</p>
            )}
          </div>
        </button>
        <button
          onClick={() => setEditing(true)}
          className="flex-shrink-0 px-2.5 py-1.5 text-xs font-semibold text-dark-muted bg-dark-panel2 border border-dark-border rounded-lg hover:text-dark-text transition-colors"
        >
          Edit
        </button>
        <button onClick={() => setOpen(!open)} className="flex-shrink-0 text-dark-muted">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-dark-border space-y-3">
          {s.ai_summary && (
            <p className="text-sm text-dark-muted leading-relaxed pt-3">{s.ai_summary}</p>
          )}
          {s.key_points && s.key_points.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">Key Points</p>
              <ul className="space-y-1">
                {s.key_points.map((kp, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-dark-muted">
                    <span className="text-cm-purple flex-shrink-0 mt-0.5">&#x2022;</span>{kp}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {s.joe_follow_ups && s.joe_follow_ups.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">Joe&apos;s Follow-ups</p>
              <ul className="space-y-1">
                {s.joe_follow_ups.map((item, i) => {
                  const done = s.joe_follow_ups_done?.includes(item);
                  return (
                    <li key={i} className={`flex items-start gap-2 text-sm ${done ? "line-through text-dark-muted" : "text-dark-text"}`}>
                      {done ? <CheckCircle2 size={14} className="text-dark-success flex-shrink-0 mt-0.5" /> : <Circle size={14} className="text-dark-muted flex-shrink-0 mt-0.5" />}
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {s.client_follow_ups && s.client_follow_ups.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">Client Follow-ups</p>
              <ul className="space-y-1">
                {s.client_follow_ups.map((item, i) => {
                  const done = s.client_follow_ups_done?.includes(item);
                  return (
                    <li key={i} className={`flex items-start gap-2 text-sm ${done ? "line-through text-dark-muted" : "text-dark-text"}`}>
                      {done ? <CheckCircle2 size={14} className="text-dark-success flex-shrink-0 mt-0.5" /> : <Circle size={14} className="text-dark-muted flex-shrink-0 mt-0.5" />}
                      {item}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          {(s.zoom_recording_url || s.internal_video_url) && (
            <div className="flex items-center gap-4">
              {s.zoom_recording_url && (
                <a href={s.zoom_recording_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-cm-purple hover:text-[#5b4fa8] font-medium">
                  <Video size={13} />Published Recording
                </a>
              )}
              {s.internal_video_url && (
                <a href={s.internal_video_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-dark-muted hover:text-dark-text font-medium">
                  <Video size={13} />Internal (Descript)
                </a>
              )}
            </div>
          )}
          <div className="pt-1">
            <Link href={`/app/mentorships/${clientId}/sessions/${s.id}/wrap-up`}
              className="text-xs text-cm-purple hover:text-[#5b4fa8] font-medium">
              Open wrap-up page &rarr;
            </Link>
          </div>
        </div>
      )}

      {editing && (
        <EditSessionModal
          session={s}
          clientId={clientId}
          onClose={() => setEditing(false)}
          onSaved={onUpdated}
        />
      )}
    </div>
  );
}

// -- Outstanding Follow-ups --

interface OutstandingFollowUpsProps {
  sessions: Session[];
}

export function OutstandingFollowUps({ sessions }: OutstandingFollowUpsProps) {
  const joeItems: { session: Session; item: string }[] = [];
  const clientItems: { session: Session; item: string }[] = [];

  [...sessions]
    .filter((s) => s.status === "completed")
    .sort((a, b) => b.date.localeCompare(a.date))
    .forEach((s) => {
      (s.joe_follow_ups || []).forEach((item) => {
        if (!(s.joe_follow_ups_done || []).includes(item)) {
          joeItems.push({ session: s, item });
        }
      });
      (s.client_follow_ups || []).forEach((item) => {
        if (!(s.client_follow_ups_done || []).includes(item)) {
          clientItems.push({ session: s, item });
        }
      });
    });

  if (joeItems.length === 0 && clientItems.length === 0) return null;

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4">Outstanding Follow-ups</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {joeItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-cm-purple mb-2">Joe&apos;s Open Items ({joeItems.length})</p>
            <ul className="space-y-2">
              {joeItems.map(({ session: s, item }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Circle size={13} className="text-dark-muted flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-dark-text">{item}</p>
                    <p className="text-xs text-dark-muted">Session #{s.session_number} &bull; {formatDate(s.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        {clientItems.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-dark-warn mb-2">Client Open Items ({clientItems.length})</p>
            <ul className="space-y-2">
              {clientItems.map(({ session: s, item }, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Circle size={13} className="text-dark-muted flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-sm text-dark-text">{item}</p>
                    <p className="text-xs text-dark-muted">Session #{s.session_number} &bull; {formatDate(s.date)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// -- Sessions Tab --

interface SessionsTabProps {
  sessions: Session[];
  payments: Payment[];
  clientId: string;
  totalPayments: number;
  totalHoursPaid: number;
  onLogSession: () => void;
  onAddPayment: () => void;
  onUpdated: () => void;
}

export function SessionsTab({
  sessions,
  payments,
  clientId,
  totalPayments,
  totalHoursPaid,
  onLogSession,
  onAddPayment,
  onUpdated,
}: SessionsTabProps) {
  return (
    <div className="space-y-6">

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Sessions</h2>
          <button
            onClick={onLogSession}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-semibold transition-colors"
          >
            <Plus size={15} />Log Session
          </button>
        </div>
        {sessions.length === 0 ? (
          <div className="bg-dark-panel rounded-xl border border-dark-border p-12 flex flex-col items-center gap-3 text-dark-muted">
            <Video size={40} />
            <p className="text-sm">No sessions yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...sessions].sort((a, b) => b.date.localeCompare(a.date)).map((s) => (
              <ExpandableSession key={s.id} session={s} clientId={clientId} onUpdated={onUpdated} />
            ))}
          </div>
        )}
      </div>

      {/* Outstanding Follow-ups */}
      <OutstandingFollowUps sessions={sessions} />

      {/* Payment History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Payment History</h2>
          <button
            onClick={onAddPayment}
            className="flex items-center gap-1.5 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] text-sm font-semibold transition-colors"
          >
            <Plus size={15} />Add Payment
          </button>
        </div>
        {payments.length === 0 ? (
          <div className="bg-dark-panel rounded-xl border border-dark-border p-8 flex flex-col items-center gap-2 text-dark-muted">
            <DollarSign size={32} />
            <p className="text-sm">No payments recorded</p>
          </div>
        ) : (
          <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-cm-purple/10 text-left">
                    <th className="px-4 py-3 font-semibold text-dark-text">Date</th>
                    <th className="px-4 py-3 font-semibold text-dark-text">Amount</th>
                    <th className="px-4 py-3 font-semibold text-dark-text">Hours</th>
                    <th className="px-4 py-3 font-semibold text-dark-text">Method</th>
                    <th className="px-4 py-3 font-semibold text-dark-text">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-dark-panel2/50">
                      <td className="px-4 py-3 text-dark-text">{formatDate(p.date)}</td>
                      <td className="px-4 py-3 font-medium text-dark-text">${p.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-dark-text">{p.hours_purchased}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-cm-purple/15 text-cm-purple font-medium">
                          {methodLabel(p.method)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-muted max-w-[200px] truncate">{p.notes || "-"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-cm-purple/8 font-semibold">
                    <td className="px-4 py-3 text-dark-text">Totals</td>
                    <td className="px-4 py-3 text-dark-text">${totalPayments.toLocaleString()}</td>
                    <td className="px-4 py-3 text-dark-text">{totalHoursPaid}</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
