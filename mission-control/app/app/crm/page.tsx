"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Loader2,
  Trash2,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface Note {
  text: string;
  date: string;
}

interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  stage: Stage;
  value: number;
  currency: string;
  lastTouch: string;
  nextAction: string;
  nextActionDate: string;
  source: string;
  notes: Note[];
  tags: string[];
  createdAt: string;
}

const STAGES = ["Lead", "Qualified", "Proposal", "Negotiation", "Won", "Lost"] as const;
type Stage = (typeof STAGES)[number];

const STAGE_COLORS: Record<Stage, string> = {
  Lead: "border-dark-muted/40",
  Qualified: "border-cm-purple/40",
  Proposal: "border-dark-warn/40",
  Negotiation: "border-cm-purple-mid/40",
  Won: "border-dark-success/40",
  Lost: "border-dark-danger/40",
};

const STAGE_HEADER_COLORS: Record<Stage, string> = {
  Lead: "text-dark-muted",
  Qualified: "text-cm-purple",
  Proposal: "text-dark-warn",
  Negotiation: "text-cm-purple-mid",
  Won: "text-dark-success",
  Lost: "text-dark-danger",
};

// ── Helpers ────────────────────────────────────────────────────────

function fmtCurrency(v: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isThisMonth(iso: string) {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

const BLANK_FORM = {
  name: "",
  email: "",
  phone: "",
  company: "",
  stage: "Lead" as Stage,
  value: 0,
  currency: "USD",
  source: "",
  tags: "",
  nextAction: "",
  nextActionDate: "",
};

// ── Component ──────────────────────────────────────────────────────

export default function CRMPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [newNote, setNewNote] = useState("");

  // ── Data loading ───────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crm");
      if (res.ok) setContacts(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Filtered contacts ──────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = contacts;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name?.toLowerCase().includes(q) ||
          c.email?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q)
      );
    }
    if (tagFilter) list = list.filter((c) => c.tags?.includes(tagFilter));
    return list;
  }, [contacts, search, tagFilter]);

  // ── All unique tags ────────────────────────────────────────────

  const allTags = useMemo(() => {
    const s = new Set<string>();
    contacts.forEach((c) => c.tags?.forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [contacts]);

  // ── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const active = contacts.filter((c) => !["Won", "Lost"].includes(c.stage));
    const pipelineValue = active.reduce((sum, c) => sum + (c.value || 0), 0);
    const wonThisMonth = contacts.filter((c) => c.stage === "Won" && isThisMonth(c.lastTouch));
    const wonCount = wonThisMonth.length;
    const wonValue = wonThisMonth.reduce((sum, c) => sum + (c.value || 0), 0);
    const closedCount = contacts.filter((c) => c.stage === "Won" || c.stage === "Lost").length;
    const wonTotal = contacts.filter((c) => c.stage === "Won").length;
    const convRate = closedCount > 0 ? Math.round((wonTotal / closedCount) * 100) : 0;
    return { total: contacts.length, pipelineValue, wonCount, wonValue, convRate };
  }, [contacts]);

  // ── CRUD ───────────────────────────────────────────────────────

  async function addContact() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        value: Number(form.value) || 0,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      };
      const res = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        setForm(BLANK_FORM);
        setShowAdd(false);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function moveStage(contact: Contact, dir: -1 | 1) {
    const idx = STAGES.indexOf(contact.stage);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= STAGES.length) return;
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contact.id, stage: STAGES[newIdx] }),
    });
    if (res.ok) await load();
  }

  async function saveEdit() {
    if (!selected) return;
    setSaving(true);
    try {
      const body = { ...editForm, id: selected.id };
      const res = await fetch("/api/crm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) {
        setSelected(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!selected || !newNote.trim()) return;
    const notes = [...(selected.notes || []), { text: newNote.trim(), date: new Date().toISOString() }];
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, notes }),
    });
    if (res.ok) {
      setNewNote("");
      const updated = await res.json();
      setSelected(updated);
      setEditForm(updated);
      await load();
    }
  }

  async function deleteContact(id: string) {
    if (!confirm("Delete this contact?")) return;
    const res = await fetch("/api/crm", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (res.ok) {
      setSelected(null);
      await load();
    }
  }

  async function addTag(tag: string) {
    if (!selected || !tag.trim()) return;
    const tags = [...new Set([...(selected.tags || []), tag.trim()])];
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, tags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setEditForm(updated);
      await load();
    }
  }

  async function removeTag(tag: string) {
    if (!selected) return;
    const tags = (selected.tags || []).filter((t) => t !== tag);
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, tags }),
    });
    if (res.ok) {
      const updated = await res.json();
      setSelected(updated);
      setEditForm(updated);
      await load();
    }
  }

  function openDetail(c: Contact) {
    setSelected(c);
    setEditForm({ ...c });
    setNewNote("");
  }

  // ── Render ─────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-cm-purple" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cm-purple/15 rounded-lg">
              <Users className="w-5 h-5 text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl text-dark-text font-bold tracking-tight">CRM Pipeline</h1>
              <p className="text-sm text-dark-muted">Manage contacts, deals, and pipeline stages</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAdd ? "Cancel" : "Add Contact"}
          </button>
        </div>
      </div>

      {/* Quick-Add Form */}
      {showAdd && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <h2 className="text-dark-text font-bold mb-4">New Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <select
              value={form.stage}
              onChange={(e) => setForm({ ...form, stage: e.target.value as Stage })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              placeholder="Deal Value"
              type="number"
              value={form.value || ""}
              onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Currency (USD)"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Source (e.g. referral, LinkedIn)"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Tags (comma-separated)"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <input
              placeholder="Next Action"
              value={form.nextAction}
              onChange={(e) => setForm({ ...form, nextAction: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
            <input
              placeholder="Next Action Date"
              type="date"
              value={form.nextActionDate}
              onChange={(e) => setForm({ ...form, nextActionDate: e.target.value })}
              className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm placeholder:text-dark-muted"
            />
          </div>
          <button
            onClick={addContact}
            disabled={saving || !form.name.trim()}
            className="mt-4 px-6 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add Contact"}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-dark-muted text-xs uppercase tracking-wide">Total Contacts</p>
          <p className="text-2xl font-bold text-dark-text mt-1">{stats.total}</p>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-dark-muted text-xs uppercase tracking-wide">Pipeline Value</p>
          <p className="text-2xl font-bold text-dark-text mt-1">{fmtCurrency(stats.pipelineValue)}</p>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-dark-muted text-xs uppercase tracking-wide">Won This Month</p>
          <p className="text-2xl font-bold text-dark-success mt-1">{stats.wonCount} <span className="text-sm text-dark-muted">({fmtCurrency(stats.wonValue)})</span></p>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-dark-muted text-xs uppercase tracking-wide">Conversion Rate</p>
          <p className="text-2xl font-bold text-dark-text mt-1">{stats.convRate}%</p>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-muted" />
          <input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-dark-panel border border-dark-border rounded-lg text-dark-text text-sm placeholder:text-dark-muted"
          />
        </div>
        {allTags.length > 0 && (
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="bg-dark-panel border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
          >
            <option value="">All Tags</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageContacts = filtered.filter((c) => c.stage === stage);
          return (
            <div key={stage} className={`bg-dark-panel border-t-2 ${STAGE_COLORS[stage]} border border-dark-border rounded-xl overflow-hidden`}>
              <div className="p-3 border-b border-dark-border">
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold ${STAGE_HEADER_COLORS[stage]}`}>{stage}</h3>
                  <span className="text-xs text-dark-muted bg-dark-panel2 px-2 py-0.5 rounded-full">{stageContacts.length}</span>
                </div>
              </div>
              <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                {stageContacts.length === 0 && (
                  <p className="text-xs text-dark-muted text-center py-4">No contacts</p>
                )}
                {stageContacts.map((c) => (
                  <div
                    key={c.id}
                    className="bg-dark-panel2 border border-dark-border rounded-lg p-3 cursor-pointer hover:border-cm-purple/40 transition-colors"
                    onClick={() => openDetail(c)}
                  >
                    <p className="text-sm font-medium text-dark-text truncate">{c.name}</p>
                    {c.company && <p className="text-xs text-dark-muted truncate">{c.company}</p>}
                    {c.value > 0 && <p className="text-xs font-medium text-cm-purple mt-1">{fmtCurrency(c.value, c.currency)}</p>}
                    {c.nextAction && (
                      <p className="text-xs text-dark-muted mt-1 truncate">Next: {c.nextAction}</p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-dark-muted">{fmtDate(c.lastTouch)}</span>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveStage(c, -1); }}
                          disabled={STAGES.indexOf(c.stage) === 0}
                          className="p-0.5 rounded hover:bg-dark-panel disabled:opacity-20 text-dark-muted"
                          title="Move left"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveStage(c, 1); }}
                          disabled={STAGES.indexOf(c.stage) === STAGES.length - 1}
                          className="p-0.5 rounded hover:bg-dark-panel disabled:opacity-20 text-dark-muted"
                          title="Move right"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail / Edit Panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div
            className="bg-dark-panel border border-dark-border rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg text-dark-text font-bold">{selected.name}</h2>
              <button onClick={() => setSelected(null)} className="text-dark-muted hover:text-dark-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted">Name</label>
                  <input
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Company</label>
                  <input
                    value={editForm.company || ""}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted">Email</label>
                  <input
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Phone</label>
                  <input
                    value={editForm.phone || ""}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-dark-muted">Stage</label>
                  <select
                    value={editForm.stage || "Lead"}
                    onChange={(e) => setEditForm({ ...editForm, stage: e.target.value as Stage })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  >
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Deal Value</label>
                  <input
                    type="number"
                    value={editForm.value || ""}
                    onChange={(e) => setEditForm({ ...editForm, value: Number(e.target.value) })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Currency</label>
                  <input
                    value={editForm.currency || "USD"}
                    onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-dark-muted">Source</label>
                  <input
                    value={editForm.source || ""}
                    onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-dark-muted">Next Action Date</label>
                  <input
                    type="date"
                    value={editForm.nextActionDate || ""}
                    onChange={(e) => setEditForm({ ...editForm, nextActionDate: e.target.value })}
                    className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-dark-muted">Next Action</label>
                <input
                  value={editForm.nextAction || ""}
                  onChange={(e) => setEditForm({ ...editForm, nextAction: e.target.value })}
                  className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-sm"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs text-dark-muted">Tags</label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(selected.tags || []).map((tag) => (
                    <span key={tag} className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-dark-danger"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <input
                    placeholder="Add tag..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && e.currentTarget.value.trim()) {
                        addTag(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                    className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5 text-dark-text text-xs placeholder:text-dark-muted"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs text-dark-muted">Notes</label>
                <div className="mt-1 space-y-2 max-h-40 overflow-y-auto">
                  {(selected.notes || []).map((n, i) => (
                    <div key={i} className="bg-dark-panel2 border border-dark-border rounded-lg p-2">
                      <p className="text-xs text-dark-text">{n.text}</p>
                      <p className="text-[10px] text-dark-muted mt-1">{fmtDate(n.date)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text text-xs placeholder:text-dark-muted resize-y"
                    rows={2}
                  />
                  <button
                    onClick={addNote}
                    disabled={!newNote.trim()}
                    className="px-3 py-1 bg-cm-purple text-white rounded-lg text-xs hover:bg-cm-purple/80 disabled:opacity-50 self-end"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-dark-border">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => deleteContact(selected.id)}
                className="flex items-center gap-2 px-4 py-2 bg-dark-danger/15 text-dark-danger rounded-lg hover:bg-dark-danger/25 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
