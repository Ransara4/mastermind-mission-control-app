"use client";

import { useState, useEffect, useCallback } from "react";
import { Network, Plus, X, Trash2, Loader2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────── */

interface ParticipantRef {
  id: number;
  full_name: string;
  photo_url: string | null;
}

interface Connection {
  id: number;
  participant_a: ParticipantRef;
  participant_b: ParticipantRef;
  connection_type: "introduction" | "collaboration" | "referral" | "shared_interest";
  description: string | null;
  status: "active" | "pending" | "completed";
  created_at: string;
}

interface Participant {
  id: number;
  full_name: string;
  photo_url: string | null;
}

type ConnectionType = Connection["connection_type"];
type ConnectionStatus = Connection["status"];

/* ── Constants ─────────────────────────────────────────────────────── */

const TYPE_STYLES: Record<ConnectionType, string> = {
  introduction: "bg-violet-500/100/20 text-violet-300",
  collaboration: "bg-cm-purple/20 text-cm-purple",
  referral: "bg-dark-warn/20 text-dark-warn",
  shared_interest: "bg-pink-500/20 text-pink-300",
};

const TYPE_LABELS: Record<ConnectionType, string> = {
  introduction: "Introduction",
  collaboration: "Collaboration",
  referral: "Referral",
  shared_interest: "Shared Interest",
};

const STATUS_STYLES: Record<ConnectionStatus, string> = {
  active: "bg-dark-success/20 text-dark-success",
  pending: "bg-dark-warn/20 text-dark-warn",
  completed: "bg-dark-panel2 text-dark-muted",
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  active: "Active",
  pending: "Pending",
  completed: "Completed",
};

/* ── Avatar ────────────────────────────────────────────────────────── */

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colors = [
    "bg-violet-500/100/20 text-violet-300",
    "bg-cm-purple/100/20 text-indigo-300",
    "bg-pink-500/20 text-pink-300",
    "bg-cm-purple/20 text-cm-purple",
    "bg-dark-warn/20 text-dark-warn",
    "bg-sky-500/20 text-sky-300",
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const s = `${size}px`;

  if (photoUrl && !imgError) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        onError={() => setImgError(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: s, height: s }}
      />
    );
  }
  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold flex-shrink-0 ${colors[colorIdx]}`}
      style={{ width: s, height: s, fontSize: size < 32 ? "10px" : size < 48 ? "14px" : "20px" }}
    >
      {initials || "?"}
    </div>
  );
}

/* ── Format date ───────────────────────────────────────────────────── */

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── Page ──────────────────────────────────────────────────────────── */

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Form state
  const [formParticipantA, setFormParticipantA] = useState("");
  const [formParticipantB, setFormParticipantB] = useState("");
  const [formType, setFormType] = useState<ConnectionType>("introduction");
  const [formDescription, setFormDescription] = useState("");

  /* ── Data fetching ─────────────────────────────────────────────── */

  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/online-program/connections");
      if (res.ok) {
        const data = await res.json();
        setConnections(Array.isArray(data) ? data : data.connections ?? []);
      }
    } catch {
      // silently fail — API may not be ready yet
    }
  }, []);

  const fetchParticipants = useCallback(async () => {
    try {
      const res = await fetch("/api/online-program/participants");
      if (res.ok) {
        const data = await res.json();
        const raw: Participant[] = data.participants ?? [];
        // Deduplicate by id and sort by name
        const seen = new Set<number>();
        const unique = raw.filter((p) => {
          if (seen.has(p.id)) return false;
          seen.add(p.id);
          return true;
        });
        unique.sort((a, b) => a.full_name.localeCompare(b.full_name));
        setParticipants(unique);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchParticipants()]);
      setLoading(false);
    }
    load();
  }, [fetchConnections, fetchParticipants]);

  /* ── Form handlers ─────────────────────────────────────────────── */

  function resetForm() {
    setFormParticipantA("");
    setFormParticipantB("");
    setFormType("introduction");
    setFormDescription("");
  }

  async function handleSave() {
    if (!formParticipantA || !formParticipantB || formParticipantA === formParticipantB) return;
    setSaving(true);
    try {
      const res = await fetch("/api/online-program/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_a_id: Number(formParticipantA),
          participant_b_id: Number(formParticipantB),
          connection_type: formType,
          description: formDescription.trim() || null,
        }),
      });
      if (res.ok) {
        await fetchConnections();
        resetForm();
        setShowForm(false);
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/online-program/connections?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // silently fail
    } finally {
      setDeletingId(null);
    }
  }

  /* ── Render ────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-500/20 rounded-xl flex items-center justify-center">
            <Network size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-dark-text">Connections</h1>
            <p className="text-sm text-dark-muted">
              {connections.length} connection{connections.length !== 1 ? "s" : ""} made
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Add Connection"}
        </button>
      </div>

      {/* Add Connection Form */}
      {showForm && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">New Connection</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* From participant */}
            <div>
              <label className="block text-xs font-medium text-dark-muted mb-1">From</label>
              <select
                value={formParticipantA}
                onChange={(e) => setFormParticipantA(e.target.value)}
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-violet-400"
              >
                <option value="">Select participant...</option>
                {participants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                  </option>
                ))}
              </select>
            </div>

            {/* To participant */}
            <div>
              <label className="block text-xs font-medium text-dark-muted mb-1">To</label>
              <select
                value={formParticipantB}
                onChange={(e) => setFormParticipantB(e.target.value)}
                className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-violet-400"
              >
                <option value="">Select participant...</option>
                {participants
                  .filter((p) => String(p.id) !== formParticipantA)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.full_name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Connection type */}
          <div>
            <label className="block text-xs font-medium text-dark-muted mb-1">Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as ConnectionType)}
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-violet-400"
            >
              <option value="introduction">Introduction</option>
              <option value="collaboration">Collaboration</option>
              <option value="referral">Referral</option>
              <option value="shared_interest">Shared Interest</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-dark-muted mb-1">Description (optional)</label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows={2}
              placeholder="What was this connection about?"
              className="w-full border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-violet-400 resize-none"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving || !formParticipantA || !formParticipantB || formParticipantA === formParticipantB}
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Connection
            </button>
            <button
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-4 py-2 text-dark-muted hover:text-dark-text text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {connections.length === 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-violet-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Network size={28} className="text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-text mb-1">No connections yet</h3>
          <p className="text-sm text-dark-muted">Start making introductions!</p>
        </div>
      )}

      {/* Connection cards grid */}
      {connections.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="bg-dark-panel border border-dark-border rounded-xl p-5 hover:shadow-md transition-shadow group relative"
            >
              {/* Delete button */}
              <button
                onClick={() => handleDelete(conn.id)}
                disabled={deletingId === conn.id}
                className="absolute top-3 right-3 p-1.5 rounded-lg text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 opacity-0 group-hover:opacity-100 transition-all"
                title="Delete connection"
              >
                {deletingId === conn.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </button>

              {/* Participant avatars */}
              <div className="flex items-center gap-3 mb-3">
                <Avatar
                  name={conn.participant_a.full_name}
                  photoUrl={conn.participant_a.photo_url}
                  size={36}
                />
                <span className="text-dark-muted text-lg font-light select-none">&harr;</span>
                <Avatar
                  name={conn.participant_b.full_name}
                  photoUrl={conn.participant_b.photo_url}
                  size={36}
                />
              </div>

              {/* Names */}
              <p className="text-sm font-medium text-dark-text mb-2">
                {conn.participant_a.full_name}
                <span className="text-dark-muted mx-1">&amp;</span>
                {conn.participant_b.full_name}
              </p>

              {/* Badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[conn.connection_type]}`}
                >
                  {TYPE_LABELS[conn.connection_type]}
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[conn.status]}`}
                >
                  {STATUS_LABELS[conn.status]}
                </span>
              </div>

              {/* Description */}
              {conn.description && (
                <p className="text-xs text-dark-muted line-clamp-2 mb-2">{conn.description}</p>
              )}

              {/* Date */}
              <p className="text-xs text-dark-muted">{formatDate(conn.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
