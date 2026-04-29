"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, RefreshCw, Check, Clock, ExternalLink,
  Loader2, AlertCircle, ClipboardList, DollarSign,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface IntakeParticipant {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  photo_url: string | null;
  cohort_number: number | null;
  role: string | null;
  intake_id: number | null;
  plan_name: string | null;
  amount_cents: number | null;
  billing_status: string | null;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  intake_form_sent_at: string | null;
  intake_submitted_at: string | null;
  wa_status: string | null;
  wix_cms_id: string | null;
  calendar_added: number | null;
  intake_status: string | null;
  next_billing_date: string | null;
  intake_created_at: string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────

function Avatar({ name, photoUrl, size = 36 }: { name: string; photoUrl?: string | null; size?: number }) {
  const [imgError, setImgError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  if (photoUrl && !imgError) {
    return (
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-cm-purple/15 flex items-center justify-center flex-shrink-0 text-cm-purple font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

function formatDate(dt: string | null): string {
  if (!dt) return "";
  try {
    return new Date(dt).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "2-digit",
    });
  } catch {
    return dt.slice(0, 10);
  }
}

function formatAmount(cents: number | null): string {
  if (cents == null) return "—";
  return "$" + (cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 });
}

function PendingBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
      <Clock size={11} />
      Pending
    </span>
  );
}

function DoneBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
      <Check size={11} />
      {label ?? "Done"}
    </span>
  );
}

function BillingBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-dark-muted text-xs">—</span>;
  if (status === "active") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
        Active
      </span>
    );
  }
  if (status === "past_due") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-danger/20 text-dark-danger">
        Past Due
      </span>
    );
  }
  if (status === "canceled") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 text-dark-muted border border-dark-border">
        Canceled
      </span>
    );
  }
  if (status === "manual") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-cm-purple/15 text-cm-purple">
        Manual
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 text-dark-muted border border-dark-border capitalize">
      {status}
    </span>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4 flex items-center gap-3">
      <div className="bg-cm-purple/15 rounded-lg p-2 flex-shrink-0">{icon}</div>
      <div>
        <div className="text-2xl font-bold text-dark-text">{value}</div>
        <div className="text-xs text-dark-muted">{label}</div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export default function OnboardingPage() {
  const [participants, setParticipants] = useState<IntakeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [cohortFilter, setCohortFilter] = useState<number | "all">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/online-program/intake");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParticipants(data.participants ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleWaToggle = async (p: IntakeParticipant) => {
    if (!p.intake_id) return;
    if (p.wa_status === "added") return; // already done
    setTogglingId(p.intake_id);
    try {
      const res = await fetch("/api/online-program/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.intake_id, wa_status: "added" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Update local state optimistically
      setParticipants((prev) =>
        prev.map((x) =>
          x.intake_id === p.intake_id ? { ...x, wa_status: "added" } : x
        )
      );
    } catch (e: any) {
      alert("Failed to update WA status: " + e.message);
    } finally {
      setTogglingId(null);
    }
  };

  // ── Cohort filter ──────────────────────────────────────────────────
  const cohorts = Array.from(new Set(participants.map((p) => p.cohort_number).filter(Boolean))).sort() as number[];
  const filtered = cohortFilter === "all" ? participants : participants.filter((p) => p.cohort_number === cohortFilter);

  // ── Stats (based on filtered view) ────────────────────────────────
  const total = filtered.length;
  const totalMonthly = filtered.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const fullyOnboarded = filtered.filter((p) => p.intake_status === "complete").length;
  const awaitingForm = filtered.filter((p) => p.intake_form_sent_at && !p.intake_submitted_at).length;
  const formReceived = filtered.filter((p) => !!p.intake_submitted_at).length;

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-dark-muted">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading onboarding data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-dark-danger p-6">
        <AlertCircle size={18} />
        <span>{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-cm-purple/15 rounded-lg p-3">
              <ClipboardList size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text tracking-tight">Onboarding Pipeline</h1>
              <p className="text-sm text-dark-muted mt-0.5">
                Track each participant's intake status from payment to fully onboarded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={cohortFilter}
              onChange={(e) => setCohortFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
              className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple"
            >
              <option value="all">All Cohorts</option>
              {cohorts.map((c) => (
                <option key={c} value={c}>Cohort {c}</option>
              ))}
            </select>
            <button
              onClick={fetchData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted text-sm hover:text-dark-text hover:border-cm-purple/40 transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          <StatCard
            label="Total participants"
            value={total}
            icon={<Users size={16} className="text-cm-purple" />}
          />
          <StatCard
            label="Total Monthly"
            value={"$" + (totalMonthly / 100).toLocaleString("en-US")}
            icon={<DollarSign size={16} className="text-dark-success" />}
          />
          <StatCard
            label="Fully onboarded"
            value={fullyOnboarded}
            icon={<Check size={16} className="text-dark-success" />}
          />
          <StatCard
            label="Awaiting form"
            value={awaitingForm}
            icon={<Clock size={16} className="text-dark-warn" />}
          />
          <StatCard
            label="Form received"
            value={formReceived}
            icon={<ClipboardList size={16} className="text-cm-purple" />}
          />
        </div>
      </div>

      {/* Pipeline table */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-4 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">
                  Participant
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Payment
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Form Sent
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Form Received
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  WA Added
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Wix Live
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Calendar
                </th>
                <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  Billing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-dark-muted">
                    No participants found.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-dark-panel2/50 transition-colors">
                  {/* Participant */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={p.full_name} photoUrl={p.photo_url} size={36} />
                      <div className="min-w-0">
                        <div className="font-medium text-dark-text truncate">{p.full_name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {(p.plan_name || p.role === "facilitator") && (
                            <span className="text-xs text-dark-muted truncate">
                              {p.role === "facilitator" ? "Facilitator" : p.plan_name === "Unknown" ? "Guest" : p.plan_name}
                            </span>
                          )}
                          {p.amount_cents != null && (
                            <span className="text-xs text-cm-purple font-medium">
                              {formatAmount(p.amount_cents)}
                            </span>
                          )}
                          {p.cohort_number != null && (
                            <span className="text-xs bg-dark-panel2 border border-dark-border rounded-full px-1.5 py-0 text-dark-muted">
                              C{p.cohort_number}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Payment — always green (they paid to be in the system) */}
                  <td className="px-3 py-3 text-center">
                    <DoneBadge label="Paid" />
                  </td>

                  {/* Form Sent */}
                  <td className="px-3 py-3 text-center">
                    {p.intake_form_sent_at ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <DoneBadge />
                        <span className="text-xs text-dark-muted">{formatDate(p.intake_form_sent_at)}</span>
                      </div>
                    ) : (
                      <PendingBadge />
                    )}
                  </td>

                  {/* Form Received */}
                  <td className="px-3 py-3 text-center">
                    {p.intake_submitted_at ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <DoneBadge />
                        <span className="text-xs text-dark-muted">{formatDate(p.intake_submitted_at)}</span>
                      </div>
                    ) : (
                      <PendingBadge />
                    )}
                  </td>

                  {/* WA Added — clickable if pending */}
                  <td className="px-3 py-3 text-center">
                    {p.wa_status === "added" ? (
                      <DoneBadge label="Added" />
                    ) : togglingId === p.intake_id ? (
                      <Loader2 size={14} className="animate-spin text-dark-muted mx-auto" />
                    ) : (
                      <button
                        onClick={() => handleWaToggle(p)}
                        disabled={!p.intake_id}
                        title="Click to mark WA as added"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted hover:bg-dark-panel disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      >
                        <Clock size={11} />
                        Pending
                      </button>
                    )}
                  </td>

                  {/* Wix Live */}
                  <td className="px-3 py-3 text-center">
                    {p.wix_cms_id ? (
                      <a
                        href={`https://manage.wix.com/cms/${p.wix_cms_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted hover:bg-dark-panel transition-colors"
                        title="Open in Wix CMS"
                      >
                        <Check size={11} />
                        Live
                        <ExternalLink size={10} />
                      </a>
                    ) : (
                      <PendingBadge />
                    )}
                  </td>

                  {/* Calendar */}
                  <td className="px-3 py-3 text-center">
                    {p.calendar_added ? (
                      <DoneBadge label="Added" />
                    ) : (
                      <PendingBadge />
                    )}
                  </td>

                  {/* Billing */}
                  <td className="px-3 py-3 text-center">
                    <BillingBadge status={p.billing_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
