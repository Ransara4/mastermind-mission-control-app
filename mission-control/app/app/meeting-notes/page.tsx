"use client";

import { useState, useEffect, useCallback } from "react";
import { Mic, Plus, ChevronDown, ChevronRight, Trash2, RefreshCw, Search } from "lucide-react";

interface ActionItem {
  task: string;
  owner: string;
  dueDate: string;
}

interface Session {
  id: string;
  clientName: string;
  date: string;
  duration: number;
  audioFile: string;
  transcript: string;
  keyDecisions: string[];
  actionItems: ActionItem[];
  followUps: string[];
  hoursUsed: number;
  hoursRemaining: number;
  rawTranscript: string;
  createdAt: string;
}

export default function MeetingNotesPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Session | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    clientName: "",
    audioFile: "",
    packageHours: 0,
    date: new Date().toISOString().split("T")[0],
    duration: 60,
    keyDecisions: "",
    actionItems: "",
    followUps: "",
    hoursUsed: 0,
  });

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/meeting-notes");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSave = async () => {
    const decisions = form.keyDecisions
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const items: ActionItem[] = form.actionItems
      .split("\n")
      .map((line) => {
        const parts = line.split("|").map((s) => s.trim());
        return { task: parts[0] || "", owner: parts[1] || "", dueDate: parts[2] || "" };
      })
      .filter((a) => a.task);
    const followUps = form.followUps
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const body = {
      clientName: form.clientName,
      date: form.date,
      duration: form.duration,
      audioFile: form.audioFile,
      transcript: "",
      keyDecisions: decisions,
      actionItems: items,
      followUps,
      hoursUsed: form.hoursUsed,
      hoursRemaining: Math.max(0, form.packageHours - form.hoursUsed),
      rawTranscript: "",
    };

    await fetch("/api/meeting-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setShowForm(false);
    setForm({
      clientName: "",
      audioFile: "",
      packageHours: 0,
      date: new Date().toISOString().split("T")[0],
      duration: 60,
      keyDecisions: "",
      actionItems: "",
      followUps: "",
      hoursUsed: 0,
    });
    fetchSessions();
  };

  const handleDelete = async (id: string) => {
    await fetch("/api/meeting-notes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (selected?.id === id) setSelected(null);
    fetchSessions();
  };

  const filtered = sessions.filter(
    (s) =>
      !search || s.clientName?.toLowerCase().includes(search.toLowerCase())
  );

  const uniqueClients = new Set(sessions.map((s) => s.clientName));
  const totalActionItems = sessions.reduce(
    (sum, s) => sum + (s.actionItems?.length || 0),
    0
  );
  const now = new Date();
  const thisMonth = sessions.filter((s) => {
    const d = new Date(s.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const hoursThisMonth = thisMonth.reduce((sum, s) => sum + (s.hoursUsed || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <p className="text-dark-muted">Loading meeting notes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <p className="text-dark-danger">Error: {error}</p>
          <button onClick={fetchSessions} className="mt-2 text-cm-purple hover:underline text-sm">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-cm-purple/15 rounded-lg p-3">
            <Mic className="w-6 h-6 text-cm-purple" />
          </div>
          <div>
            <h1 className="text-xl text-dark-text font-bold tracking-tight">Meeting Notes</h1>
            <p className="text-dark-muted text-sm">AI session recorder for client meetings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSessions}
            className="p-2 rounded-lg border border-dark-border text-dark-muted hover:text-dark-text"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setShowForm(true); setSelected(null); }}
            className="flex items-center gap-2 bg-cm-purple text-white rounded-lg px-4 py-2 hover:bg-cm-purple/80 text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> New Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: sessions.length },
          { label: "Total Clients", value: uniqueClients.size },
          { label: "Hours This Month", value: hoursThisMonth.toFixed(1) },
          { label: "Action Items", value: totalActionItems },
        ].map((stat) => (
          <div key={stat.label} className="bg-dark-panel border border-dark-border rounded-xl p-4">
            <p className="text-dark-muted text-xs uppercase tracking-wide">{stat.label}</p>
            <p className="text-2xl font-bold text-dark-text mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Session list */}
        <div className="lg:col-span-1 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
            <input
              type="text"
              placeholder="Search by client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-panel border border-dark-border rounded-lg pl-10 pr-3 py-2 text-dark-text text-sm placeholder:text-dark-muted focus:outline-none focus:border-cm-purple"
            />
          </div>
          {filtered.length === 0 && (
            <p className="text-dark-muted text-sm text-center py-4">No sessions found</p>
          )}
          {filtered
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelected(s); setShowForm(false); }}
                className={`w-full text-left bg-dark-panel border rounded-xl p-4 transition-colors ${
                  selected?.id === s.id
                    ? "border-cm-purple"
                    : "border-dark-border hover:border-dark-muted"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-dark-text font-medium text-sm">{s.clientName}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="text-dark-muted hover:text-dark-danger p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-dark-muted text-xs mt-1">
                  {new Date(s.date).toLocaleDateString()} · {s.duration} min
                </p>
                <p className="text-dark-muted text-xs mt-0.5">
                  {s.actionItems?.length || 0} action items · {s.hoursUsed || 0}h used
                </p>
              </button>
            ))}
        </div>

        {/* Right: Detail or form */}
        <div className="lg:col-span-2">
          {showForm ? (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-4">
              <h2 className="text-dark-text font-bold tracking-tight">New Session</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Client Name</label>
                  <input
                    type="text"
                    value={form.clientName}
                    onChange={(e) => setForm({ ...form, clientName: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Audio File Path</label>
                  <input
                    type="text"
                    placeholder="/path/to/recording.m4a"
                    value={form.audioFile}
                    onChange={(e) => setForm({ ...form, audioFile: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Date</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Duration (min)</label>
                  <input
                    type="number"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Package Hours Total</label>
                  <input
                    type="number"
                    value={form.packageHours}
                    onChange={(e) => setForm({ ...form, packageHours: Number(e.target.value) })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Hours Used</label>
                  <input
                    type="number"
                    step="0.5"
                    value={form.hoursUsed}
                    onChange={(e) => setForm({ ...form, hoursUsed: Number(e.target.value) })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                  />
                </div>
              </div>

              <div>
                <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Key Decisions (one per line)</label>
                <textarea
                  value={form.keyDecisions}
                  onChange={(e) => setForm({ ...form, keyDecisions: e.target.value })}
                  rows={3}
                  className="resize-y w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                />
              </div>

              <div>
                <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">
                  Action Items (format: task | owner | due date — one per line)
                </label>
                <textarea
                  value={form.actionItems}
                  onChange={(e) => setForm({ ...form, actionItems: e.target.value })}
                  rows={3}
                  className="resize-y w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                />
              </div>

              <div>
                <label className="text-dark-muted text-xs uppercase tracking-wide block mb-1">Follow-ups (one per line)</label>
                <textarea
                  value={form.followUps}
                  onChange={(e) => setForm({ ...form, followUps: e.target.value })}
                  rows={3}
                  className="resize-y w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="bg-cm-purple text-white rounded-lg px-6 py-2 hover:bg-cm-purple/80 text-sm font-medium"
                >
                  Save Session
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="border border-dark-border text-dark-muted rounded-lg px-4 py-2 hover:text-dark-text text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : selected ? (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-dark-text font-bold tracking-tight text-lg">{selected.clientName}</h2>
                  <p className="text-dark-muted text-sm">
                    {new Date(selected.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    · {selected.duration} min
                  </p>
                </div>
              </div>

              {/* Hours progress */}
              {(selected.hoursUsed > 0 || selected.hoursRemaining > 0) && (
                <div>
                  <p className="text-dark-muted text-xs uppercase tracking-wide mb-2">Hours Tracking</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 bg-dark-panel2 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-cm-purple h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            ((selected.hoursUsed || 0) /
                              ((selected.hoursUsed || 0) + (selected.hoursRemaining || 1))) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-dark-text text-sm font-medium whitespace-nowrap">
                      {selected.hoursUsed}h used · {selected.hoursRemaining}h left
                    </span>
                  </div>
                </div>
              )}

              {/* Key Decisions */}
              {selected.keyDecisions?.length > 0 && (
                <div>
                  <p className="text-dark-muted text-xs uppercase tracking-wide mb-2">Key Decisions</p>
                  <ul className="space-y-1">
                    {selected.keyDecisions.map((d, i) => (
                      <li key={i} className="text-dark-text text-sm flex items-start gap-2">
                        <span className="text-cm-purple mt-0.5">•</span> {d}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {selected.actionItems?.length > 0 && (
                <div>
                  <p className="text-dark-muted text-xs uppercase tracking-wide mb-2">Action Items</p>
                  <ul className="space-y-2">
                    {selected.actionItems.map((a, i) => (
                      <li
                        key={i}
                        className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border border-dark-border rounded" />
                          <span className="text-dark-text text-sm">{a.task}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-dark-muted">
                          {a.owner && <span>{a.owner}</span>}
                          {a.dueDate && <span>{a.dueDate}</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-ups */}
              {selected.followUps?.length > 0 && (
                <div>
                  <p className="text-dark-muted text-xs uppercase tracking-wide mb-2">Follow-ups</p>
                  <ul className="space-y-1">
                    {selected.followUps.map((f, i) => (
                      <li key={i} className="text-dark-text text-sm flex items-start gap-2">
                        <span className="text-cm-purple mt-0.5">•</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Raw Transcript */}
              {selected.rawTranscript && (
                <div>
                  <button
                    onClick={() => setTranscriptOpen(!transcriptOpen)}
                    className="flex items-center gap-2 text-dark-muted text-xs uppercase tracking-wide hover:text-dark-text"
                  >
                    {transcriptOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    Raw Transcript
                  </button>
                  {transcriptOpen && (
                    <pre className="mt-2 bg-dark-panel2 border border-dark-border rounded-lg p-3 text-dark-text text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {selected.rawTranscript}
                    </pre>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-12 text-center">
              <Mic className="w-10 h-10 text-dark-muted mx-auto mb-3" />
              <p className="text-dark-muted text-sm">Select a session or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
