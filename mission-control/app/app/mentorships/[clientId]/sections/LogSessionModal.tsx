"use client";

import React, { useState, useRef } from "react";
import { Loader2, AlertCircle, Plus, X } from "lucide-react";

interface LogSessionModalProps {
  clientId: string;
  onClose: () => void;
  onCreated: () => void;
}

export function LogSessionModal({ clientId, onClose, onCreated }: LogSessionModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const durationRef = useRef<HTMLInputElement>(null);
  const preparationRef = useRef<HTMLTextAreaElement>(null);
  const goalsRef = useRef<HTMLTextAreaElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const zoomUrlRef = useRef<HTMLInputElement>(null);
  const internalVideoUrlRef = useRef<HTMLInputElement>(null);

  // Default start time = current Bali time (GMT+8)
  const baliNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" }));
  const baliTimeDefault = `${String(baliNow.getHours()).padStart(2, "0")}:${String(baliNow.getMinutes()).padStart(2, "0")}`;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      const durationMinutes = parseInt(durationRef.current?.value || "60", 10);
      const res = await fetch(`/api/mentorships/${clientId}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateRef.current?.value || new Date().toISOString().split("T")[0],
          start_time_bali: startTimeRef.current?.value || baliTimeDefault,
          type: typeRef.current?.value || "zoom",
          duration_minutes: durationMinutes,
          hours_logged: durationMinutes / 60,
          session_preparation: preparationRef.current?.value || "",
          session_goals: goalsRef.current?.value || "",
          profile_notes: notesRef.current?.value || "",
          zoom_recording_url: zoomUrlRef.current?.value || null,
          internal_video_url: internalVideoUrlRef.current?.value || null,
          status: "completed",
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      onCreated();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-t-2xl flex-shrink-0">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Log Session</h2>
          <button onClick={onClose} className="text-dark-muted hover:text-dark-text"><X size={20} /></button>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Date</label>
              <input ref={dateRef} type="date" defaultValue={new Date().toISOString().split("T")[0]}
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Start Time <span className="text-dark-muted font-normal">(Bali)</span></label>
              <input ref={startTimeRef} type="time" defaultValue={baliTimeDefault}
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Type</label>
              <select ref={typeRef} defaultValue="zoom"
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2">
                <option value="zoom">Zoom</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="in-person">In Person</option>
                <option value="phone">Phone</option>
                <option value="async">Async</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Duration (minutes)</label>
            <input ref={durationRef} type="number" defaultValue={60} min={5} step={5}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Session Preparation</label>
            <textarea ref={preparationRef} rows={3} placeholder="What was prepared before the session..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2 resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Session Goals</label>
            <textarea ref={goalsRef} rows={3} placeholder="Goals and intended outcomes for this session..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2 resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Notes</label>
            <textarea ref={notesRef} rows={3} placeholder="Session notes..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2 resize-y" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              Published Video Link <span className="text-dark-muted font-normal">(sent to client)</span>
            </label>
            <input ref={zoomUrlRef} type="url" placeholder="https://zoom.us/rec/..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              Internal Video Link <span className="text-dark-muted font-normal">(Descript, internal only)</span>
            </label>
            <input ref={internalVideoUrlRef} type="url" placeholder="https://share.descript.com/..."
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text bg-dark-panel2" />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-3 py-2">
              <AlertCircle size={16} />{error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-border flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors">Cancel</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple-mid disabled:opacity-50 text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? "Saving..." : "Log Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
