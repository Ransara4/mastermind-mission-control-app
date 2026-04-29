"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Clock,
  DollarSign,
  Plus,
  X,
  Loader2,
  TrendingUp,
  ChevronRight,
  Pencil,
  MessageCircle,
} from "lucide-react";

/* -- Types (mirrors mentorships-db.ts Client after computeClientStats) -- */

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo_url: string | null;
  linkedin_url: string;
  website: string;
  bio: string;
  focus_areas: string[];
  hourly_rate: number;
  hours_purchased: number;
  hours_used: number;
  hours_remaining: number;
  total_paid: number;
  status: "active" | "inactive" | "completed";
  start_date: string;
  notes: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  whatsapp_jid?: string;
  last_session_date?: string | null;
}

/* -- Currency Formatter ------------------------------------------------- */

const fmtCurrency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/* -- WhatsApp Number Formatter ------------------------------------------ */

function formatWANumber(jid: string | undefined, phone: string | undefined): string | null {
  if (!jid && !phone) return null;
  const raw = jid ? jid.replace('@s.whatsapp.net', '') : phone?.replace(/\D/g, '') || '';
  if (raw.length === 11 && raw.startsWith('1')) {
    return `+1 (${raw.slice(1,4)}) ${raw.slice(4,7)}-${raw.slice(7)}`;
  }
  return '+' + raw;
}

/* -- Avatar ------------------------------------------------------------- */

function Avatar({ name, photoUrl, size = 48 }: { name: string; photoUrl: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0 bg-cm-purple/15 text-cm-purple"
      style={{ width: s, height: s, fontSize: size < 32 ? "10px" : size < 48 ? "14px" : "20px" }}
    >
      {initials || "?"}
    </div>
  );
}

/* -- Stat Card ---------------------------------------------------------- */

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: "purple" | "pink";
}) {
  const iconColor = accent === "pink" ? "text-cm-pink" : "text-cm-purple";
  const iconBg = accent === "pink" ? "bg-cm-pink/15" : "bg-cm-purple/15";
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5 flex items-center gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-sm text-dark-muted font-medium">{label}</p>
        <p className="text-2xl font-bold text-dark-text">{value}</p>
      </div>
    </div>
  );
}

/* -- Status Badge ------------------------------------------------------- */

function StatusBadge({ status }: { status: Client["status"] }) {
  const styles = {
    active: "bg-cm-purple/15 text-cm-purple",
    inactive: "bg-dark-panel2 text-dark-muted",
    completed: "bg-dark-success/20 text-dark-success",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status]}`}>
      {status}
    </span>
  );
}

/* -- Hours Remaining Color ---------------------------------------------- */

function hoursRemainingColor(hrs: number): string {
  if (hrs <= 0) return "text-dark-danger";
  if (hrs < 1) return "text-orange-500";
  return "text-cm-purple";
}

/* -- Format Date -------------------------------------------------------- */

function formatSessionDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "No sessions yet";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "No sessions yet";
  }
}

/* -- Add Client Modal --------------------------------------------------- */

function AddClientModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    hourly_rate: 150,
    hours_purchased: 0,
    notes: "",
    linkedin_url: "",
    website: "",
    focus_areas: "",
  });

  const set = (field: string, value: string | number) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        ...form,
        focus_areas: form.focus_areas
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const res = await fetch("/api/mentorships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create client");
      }
      onCreated();
      onClose();
      setForm({
        name: "",
        email: "",
        phone: "",
        hourly_rate: 150,
        hours_purchased: 0,
        notes: "",
        linkedin_url: "",
        website: "",
        focus_areas: "",
      });
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const inputClass =
    "w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-lg overflow-hidden">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel border-b border-dark-border">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text flex items-center gap-2">
            <Plus size={18} className="text-cm-purple" />
            Add Client
          </h2>
          <button onClick={onClose} className="text-dark-muted hover:text-dark-text transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="text-sm text-dark-danger bg-dark-danger/10 border border-dark-danger/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
              Name *
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={inputClass}
              placeholder="Client name"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
                placeholder="email@example.com"
                type="email"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className={inputClass}
                placeholder="+1 555 123 4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
                Hourly Rate ($)
              </label>
              <input
                value={form.hourly_rate}
                onChange={(e) => set("hourly_rate", Number(e.target.value))}
                className={inputClass}
                type="number"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
                Hours Purchased
              </label>
              <input
                value={form.hours_purchased}
                onChange={(e) => set("hours_purchased", Number(e.target.value))}
                className={inputClass}
                type="number"
                min={0}
                step={0.5}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
              LinkedIn URL
            </label>
            <input
              value={form.linkedin_url}
              onChange={(e) => set("linkedin_url", e.target.value)}
              className={inputClass}
              placeholder="https://linkedin.com/in/..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
              Website
            </label>
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              className={inputClass}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
              Focus Areas
            </label>
            <textarea
              value={form.focus_areas}
              onChange={(e) => set("focus_areas", e.target.value)}
              className={`${inputClass} resize-none h-20`}
              placeholder="Comma-separated: leadership, sales strategy, hiring"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-dark-muted mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className={`${inputClass} resize-none h-20`}
              placeholder="Internal notes about this client..."
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-dark-muted hover:text-dark-text transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-cm-purple text-white hover:bg-[#5b4fa8] disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {saving ? "Creating..." : "Create Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* -- Main Page ---------------------------------------------------------- */

export default function MentorshipsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/mentorships");
      if (!res.ok) throw new Error("Failed to load clients");
      const data = await res.json();
      setClients(data.clients || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const activeClients = clients.filter((c) => c.status === "active");
  const totalHoursSold = clients.reduce((sum, c) => sum + c.hours_purchased, 0);
  const totalHoursUsed = clients.reduce((sum, c) => sum + c.hours_used, 0);
  const totalRevenue = clients.reduce((sum, c) => sum + c.total_paid, 0);

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Hero section */}
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel px-8 py-8 border-b border-dark-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-dark-text flex items-center gap-3">
              <GraduationCap size={32} className="text-cm-purple" />
              Mentorships
            </h1>
            <p className="text-dark-muted mt-1">1:1 client sessions, hours, and progress</p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-cm-purple text-white hover:bg-[#5b4fa8] transition-colors flex items-center gap-2 shadow-sm"
          >
            <Plus size={16} />
            Add Client
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-cm-purple" />
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-dark-danger mb-4">{error}</p>
            <button
              onClick={fetchClients}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-cm-purple text-white hover:bg-[#5b4fa8] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Content */}
        {!loading && !error && (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Active Clients" value={activeClients.length} accent="purple" />
              <StatCard icon={Clock} label="Hours Sold" value={totalHoursSold} accent="purple" />
              <StatCard icon={TrendingUp} label="Hours Used" value={totalHoursUsed} accent="pink" />
              <StatCard icon={DollarSign} label="Total Revenue" value={fmtCurrency.format(totalRevenue)} accent="purple" />
            </div>

            {/* Clients Table */}
            {clients.length === 0 ? (
              /* Empty state */
              <div className="bg-dark-panel rounded-xl border border-dark-border flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl bg-cm-purple/15 flex items-center justify-center mb-6">
                  <GraduationCap size={40} className="text-cm-purple" />
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-dark-text mb-2">No clients yet</h2>
                <p className="text-dark-muted mb-6 max-w-sm">
                  Add your first mentorship client to start tracking sessions, hours, and progress.
                </p>
                <button
                  onClick={() => setModalOpen(true)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-lg bg-cm-purple text-white hover:bg-[#5b4fa8] transition-colors flex items-center gap-2"
                >
                  <Plus size={16} />
                  Add Client
                </button>
              </div>
            ) : (
              <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden shadow-sm">
                <table className="w-full">
                  <thead>
                    <tr className="bg-cm-purple/12">
                      <th className="w-16 px-4 py-3" />
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        WhatsApp
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Paid
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Hours Used
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Hours Remaining
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Last Session
                      </th>
                      <th className="w-24 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-cm-purple">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cm-purple-light">
                    {clients.map((client) => {
                      const progressPct =
                        client.hours_purchased > 0
                          ? Math.min((client.hours_used / client.hours_purchased) * 100, 100)
                          : 0;

                      return (
                        <tr
                          key={client.id}
                          onClick={() => router.push(`/app/mentorships/${client.id}`)}
                          className="hover:bg-cm-purple/8 cursor-pointer transition-colors"
                        >
                          {/* Avatar */}
                          <td className="px-4 py-3">
                            <Avatar name={client.name} photoUrl={client.photo_url} size={40} />
                          </td>

                          {/* Client name + email */}
                          <td className="px-4 py-3">
                            <div className="font-semibold text-dark-text text-sm">{client.name}</div>
                            {client.email && (
                              <div className="text-xs text-dark-muted mt-0.5">{client.email}</div>
                            )}
                          </td>

                          {/* WhatsApp */}
                          <td className="px-4 py-3">
                            {(() => {
                              const waNum = formatWANumber(client.whatsapp_jid, client.phone);
                              if (!waNum) return <span className="text-dark-muted">-</span>;
                              return (
                                <div className="flex items-center gap-1.5">
                                  <MessageCircle size={14} className="text-dark-success flex-shrink-0" />
                                  <span className="text-sm text-dark-text">{waNum}</span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Status badge */}
                          <td className="px-4 py-3">
                            <StatusBadge status={client.status} />
                          </td>

                          {/* Paid */}
                          <td className="px-4 py-3 text-sm font-semibold text-dark-text">
                            {fmtCurrency.format(client.total_paid)}
                          </td>

                          {/* Hours Used with progress bar */}
                          <td className="px-4 py-3">
                            <div className="text-sm text-dark-text">
                              {client.hours_used} / {client.hours_purchased} hrs
                            </div>
                            <div className="w-full h-[3px] bg-cm-purple/15 rounded-full overflow-hidden mt-1.5">
                              <div
                                className="h-full bg-cm-purple rounded-full transition-all duration-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </td>

                          {/* Hours Remaining */}
                          <td className="px-4 py-3">
                            <span className={`text-lg font-bold ${hoursRemainingColor(client.hours_remaining)}`}>
                              {client.hours_remaining} hrs
                            </span>
                          </td>

                          {/* Last Session */}
                          <td className="px-4 py-3">
                            <span className={`text-sm ${client.last_session_date ? "text-dark-text" : "text-dark-muted"}`}>
                              {formatSessionDate(client.last_session_date)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={`/app/mentorships/${client.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg hover:bg-cm-purple/15 text-dark-muted hover:text-cm-purple transition-colors"
                                title="View client"
                              >
                                <ChevronRight size={16} />
                              </Link>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: open edit modal when implemented
                                  router.push(`/app/mentorships/${client.id}`);
                                }}
                                className="p-1.5 rounded-lg hover:bg-cm-purple/15 text-dark-muted hover:text-cm-purple transition-colors"
                                title="Edit client"
                              >
                                <Pencil size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Client Modal */}
      <AddClientModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchClients}
      />
    </div>
  );
}
