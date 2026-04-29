"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, RefreshCw, Check, Clock, ExternalLink,
  Loader2, AlertCircle, ClipboardList, DollarSign,
  ChevronDown, ChevronRight, Settings2, Zap, Hand,
  Database, Mail, FileText, Globe, Calendar, MessageCircle,
  CheckCircle2, XCircle, CircleDot, X,
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
  payment_email_sent_at: string | null;
  airtable_record_id: string | null;
  payment_date: string | null;
  billing_interval: string | null;
  billing_interval_count: number | null;
  payment_method: string | null;
  package_months: number | null;
  cohort_start_date: string | null;
  manual_payment_note: string | null;
}

interface ProcessSubStep {
  id: string;
  name: string;
  description: string;
  details?: string;
}

interface ProcessStep {
  number: number;
  name: string;
  description: string;
  trigger: string;
  automation: string;
  cronJobId?: string;
  scripts: string[];
  status: string;
  lastRun?: string | null;
  nextRun?: string | null;
  lastError?: string | null;
  enabled?: boolean;
  schedule?: string | null;
  details?: string;
  subSteps?: ProcessSubStep[];
}

interface EmailTemplate {
  filename: string;
  name: string;
  trigger: string;
  subject: string;
  variables: string[];
  body: string;
}

interface CohortInfo {
  number: number;
  name: string;
  start_date: string;
  status: string;
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

function formatDateTime(dt: string | null | undefined): string {
  if (!dt) return "Never";
  try {
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", {
      month: "short", day: "numeric",
    }) + " " + d.toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit",
    });
  } catch {
    return dt.slice(0, 16);
  }
}

function timeAgo(dt: string | null | undefined): string {
  if (!dt) return "";
  try {
    const ms = Date.now() - new Date(dt).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
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

function AutomationBadge({ type }: { type: string }) {
  if (type === "cron") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cm-purple/15 text-cm-purple">
        <Zap size={10} /> Automated (Cron)
      </span>
    );
  }
  if (type === "automatic") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-success/15 text-dark-success">
        <Zap size={10} /> Automatic
      </span>
    );
  }
  if (type === "manual" || type === "none") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-dark-warn/15 text-dark-warn">
        <Hand size={10} /> Manual
      </span>
    );
  }
  return null;
}

function StatusIndicator({ status }: { status: string }) {
  if (status === "healthy" || status === "ok") {
    return <CheckCircle2 size={18} className="text-dark-success shrink-0" />;
  }
  if (status === "skipped") {
    return <XCircle size={18} className="text-dark-danger shrink-0" />;
  }
  if (status === "manual") {
    return <Hand size={18} className="text-dark-warn shrink-0" />;
  }
  return <CircleDot size={18} className="text-dark-muted shrink-0" />;
}

function stepIcon(stepNum: number) {
  switch (stepNum) {
    case 1: return <DollarSign size={14} />;
    case 2: return <Database size={14} />;
    case 3: return <Mail size={14} />;
    case 4: return <FileText size={14} />;
    case 5: return <ClipboardList size={14} />;
    case 6: return <FileText size={14} />;
    case 7: return <Globe size={14} />;
    case 8: return <Calendar size={14} />;
    case 9: return <MessageCircle size={14} />;
    case 10: return <CheckCircle2 size={14} />;
    default: return <CircleDot size={14} />;
  }
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

// ── Process Step Card ────────────────────────────────────────────────

function ProcessStepCard({
  step,
  isExpanded,
  onToggle,
}: {
  step: ProcessStep;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const borderColor =
    step.status === "healthy" || step.status === "ok"
      ? "border-l-green-500"
      : step.status === "skipped"
        ? "border-l-red-500"
        : step.status === "manual"
          ? "border-l-amber-500"
          : "border-l-slate-500";

  return (
    <div className={`bg-dark-panel border border-dark-border rounded-xl border-l-4 ${borderColor}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); }
        }}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-bg transition-colors text-left cursor-pointer select-none"
      >
        <span className="w-7 h-7 rounded-full bg-cm-purple text-white text-xs font-bold flex items-center justify-center shrink-0">
          {step.number}
        </span>
        <span className="flex-1 text-sm font-semibold text-dark-text">{step.name}</span>
        <AutomationBadge type={step.automation} />
        <StatusIndicator status={step.status} />
        {isExpanded
          ? <ChevronDown size={16} className="text-dark-muted shrink-0" />
          : <ChevronRight size={16} className="text-dark-muted shrink-0" />}
      </div>

      {isExpanded && (
        <div className="px-5 pb-5 border-t border-dark-border pt-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-dark-text leading-relaxed">{step.description}</p>

          {/* Trigger */}
          <div className="flex items-start gap-2">
            <span className="text-xs text-dark-muted w-20 shrink-0 pt-0.5">Trigger</span>
            <span className="text-sm text-dark-text">{step.trigger}</span>
          </div>

          {/* Scripts */}
          {step.scripts.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-dark-muted w-20 shrink-0 pt-0.5">Scripts</span>
              <div className="space-y-1">
                {step.scripts.map((s, i) => (
                  <span
                    key={i}
                    className="block font-mono text-xs bg-dark-panel2 border border-dark-border rounded px-2 py-1 text-dark-muted"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Details */}
          {step.details && (
            <div className="flex items-start gap-2">
              <span className="text-xs text-dark-muted w-20 shrink-0 pt-0.5">Details</span>
              <span className="text-sm text-dark-muted">{step.details}</span>
            </div>
          )}

          {/* Sub-steps */}
          {step.subSteps && step.subSteps.length > 0 && (
            <div className="space-y-2">
              {step.subSteps.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-dark-panel2 border border-dark-border rounded-lg p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-cm-purple/20 text-cm-purple text-[10px] font-bold flex items-center justify-center shrink-0">
                      {sub.id}
                    </span>
                    <span className="text-sm font-semibold text-dark-text">{sub.name}</span>
                  </div>
                  <p className="text-sm text-dark-text leading-relaxed ml-8">{sub.description}</p>
                  {sub.details && (
                    <p className="text-xs text-dark-muted mt-2 ml-8">{sub.details}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Cron job status */}
          {step.cronJobId && (
            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-dark-text uppercase tracking-wide">
                <Settings2 size={12} />
                Cron Job Status
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-dark-muted text-xs">Status:</span>
                  {step.status === "healthy" || step.status === "ok" ? (
                    <span className="text-dark-success text-xs font-medium">Healthy</span>
                  ) : step.status === "skipped" ? (
                    <span className="text-dark-danger text-xs font-medium">Failing</span>
                  ) : (
                    <span className="text-dark-muted text-xs font-medium capitalize">{step.status}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-dark-muted text-xs">Enabled:</span>
                  <span className={`text-xs font-medium ${step.enabled ? "text-dark-success" : "text-dark-danger"}`}>
                    {step.enabled ? "Yes" : "No"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-dark-muted text-xs">Schedule:</span>
                  <span className="text-dark-text text-xs font-mono">{step.schedule || "—"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-dark-muted text-xs">Last run:</span>
                  <span className="text-dark-text text-xs">
                    {formatDateTime(step.lastRun)}
                    {step.lastRun && (
                      <span className="text-dark-muted ml-1">({timeAgo(step.lastRun)})</span>
                    )}
                  </span>
                </div>
                {step.nextRun && (
                  <div className="flex items-center gap-2">
                    <span className="text-dark-muted text-xs">Next run:</span>
                    <span className="text-dark-text text-xs">{formatDateTime(step.nextRun)}</span>
                  </div>
                )}
              </div>
              {step.lastError && (
                <div className="flex items-start gap-2 text-sm text-dark-danger bg-dark-danger/10 rounded-lg px-3 py-2 mt-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span className="text-xs">{step.lastError}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Onboarding step definitions for participant detail ──────────────

interface ParticipantStep {
  number: number;
  name: string;
  description: string;
  isComplete: (p: IntakeParticipant) => boolean;
  completedAt: (p: IntakeParticipant) => string | null;
  patchOn: Record<string, unknown>;
  patchOff: Record<string, unknown>;
  readOnly?: boolean;
}

function getParticipantSteps(): ParticipantStep[] {
  return [
    {
      number: 1,
      name: "Payment Confirmed",
      description: "Payment received via Stripe, Wise, or other method",
      isComplete: (p) => !!p.intake_id && (!!p.payment_date || !!p.intake_created_at),
      completedAt: (p) => p.payment_date || p.intake_created_at,
      patchOn: { payment_date: "__NOW__" },
      patchOff: { payment_date: null },
    },
    {
      number: 2,
      name: "Welcome Email Sent",
      description: "Welcome email with intake form link sent to participant",
      isComplete: (p) => !!p.payment_email_sent_at,
      completedAt: (p) => p.payment_email_sent_at,
      patchOn: { payment_email_sent_at: "__NOW__" },
      patchOff: { payment_email_sent_at: null },
    },
    {
      number: 3,
      name: "Intake Form Sent",
      description: "Airtable intake form link recorded as sent",
      isComplete: (p) => !!p.intake_form_sent_at,
      completedAt: (p) => p.intake_form_sent_at,
      patchOn: { intake_form_sent_at: "__NOW__" },
      patchOff: { intake_form_sent_at: null },
    },
    {
      number: 4,
      name: "Intake Form Received",
      description: "Participant submitted the Airtable intake form with bio, photo, and details",
      isComplete: (p) => !!p.intake_submitted_at,
      completedAt: (p) => p.intake_submitted_at,
      patchOn: { intake_submitted_at: "__NOW__" },
      patchOff: { intake_submitted_at: null },
    },
    {
      number: 5,
      name: "Airtable Synced",
      description: "Participant data synced from Airtable to local database",
      isComplete: (p) => !!p.airtable_record_id,
      completedAt: () => null,
      patchOn: { airtable_record_id: "manual" },
      patchOff: { airtable_record_id: null },
    },
    {
      number: 6,
      name: "Wix CMS Entry",
      description: "Photo imported and profile created on the Wix website",
      isComplete: (p) => !!p.wix_cms_id,
      completedAt: () => null,
      patchOn: { wix_cms_id: "manual" },
      patchOff: { wix_cms_id: null },
    },
    {
      number: 7,
      name: "Google Calendar Added",
      description: "Email added as attendee to weekly mastermind session",
      isComplete: (p) => !!p.calendar_added,
      completedAt: () => null,
      patchOn: { calendar_added: 1 },
      patchOff: { calendar_added: 0 },
    },
    {
      number: 8,
      name: "WhatsApp Group Added",
      description: "Participant added to the WhatsApp group",
      isComplete: (p) => p.wa_status === "added",
      completedAt: () => null,
      patchOn: { wa_status: "added" },
      patchOff: { wa_status: "pending" },
    },
  ];
}

// Check if all prerequisite steps are complete (everything except "Fully Onboarded")
function allStepsComplete(p: IntakeParticipant): boolean {
  return getParticipantSteps().every((s) => s.isComplete(p));
}

// ── Participant Detail — Full Screen ─────────────────────────────────

function ParticipantDetail({
  participant,
  onClose,
  onUpdated,
}: {
  participant: IntakeParticipant;
  onClose: () => void;
  onUpdated: (updated: IntakeParticipant) => void;
}) {
  const [togglingStep, setTogglingStep] = useState<number | null>(null);
  const [lookingUpStripe, setLookingUpStripe] = useState(false);
  const [stripeChecked, setStripeChecked] = useState(false);
  const [stripeResult, setStripeResult] = useState<{ found: boolean; subscription?: any; customer?: any } | null>(null);
  const [manualPayOpen, setManualPayOpen] = useState(false);
  const [manualPayNote, setManualPayNote] = useState("");
  const [manualPayAmount, setManualPayAmount] = useState("");
  const [manualPayMethod, setManualPayMethod] = useState("wise");
  const p = participant;
  const steps = getParticipantSteps();

  const completedCount = steps.filter((s) => s.isComplete(p)).length;
  const isFullyOnboarded = p.intake_status === "complete";
  const shouldBeComplete = allStepsComplete(p);
  const totalSteps = steps.length + 1; // +1 for "Fully Onboarded"
  const displayCompleted = completedCount + (isFullyOnboarded ? 1 : 0);
  const progressPct = Math.round((displayCompleted / totalSteps) * 100);

  // Auto-mark as complete when all steps done
  useEffect(() => {
    if (shouldBeComplete && !isFullyOnboarded && p.intake_id) {
      handlePatch({ status: "complete" }).then((ok) => {
        if (ok) {
          const updated = { ...p, intake_status: "complete" };
          onUpdated(updated);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldBeComplete, isFullyOnboarded]);

  async function handlePatch(fields: Record<string, unknown>): Promise<boolean> {
    if (!p.intake_id) return false;
    try {
      const body: Record<string, unknown> = { id: p.intake_id };
      for (const [k, v] of Object.entries(fields)) {
        body[k] = v === "__NOW__" ? new Date().toISOString() : v;
      }
      const res = await fetch("/api/cohorts/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  const handleToggle = async (step: ParticipantStep) => {
    if (step.readOnly || !p.intake_id) return;
    const isDone = step.isComplete(p);
    const patch = isDone ? step.patchOff : step.patchOn;
    if (Object.keys(patch).length === 0) return;

    setTogglingStep(step.number);
    try {
      const body: Record<string, unknown> = { id: p.intake_id };
      for (const [k, v] of Object.entries(patch)) {
        body[k] = v === "__NOW__" ? new Date().toISOString() : v;
      }
      const res = await fetch("/api/cohorts/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const updated = { ...p };
      for (const [k, v] of Object.entries(patch)) {
        const val = v === "__NOW__" ? new Date().toISOString() : v;
        (updated as any)[k === "status" ? "intake_status" : k] = val;
      }

      // If unchecking a step, also unmark "fully onboarded"
      if (isDone && updated.intake_status === "complete") {
        await handlePatch({ status: "awaiting_form" });
        updated.intake_status = "awaiting_form";
      }

      onUpdated(updated);
    } catch (e: any) {
      alert("Failed to update: " + e.message);
    } finally {
      setTogglingStep(null);
    }
  };

  const handleFullyOnboardedToggle = async () => {
    if (!p.intake_id) return;
    setTogglingStep(99);
    try {
      const newStatus = isFullyOnboarded ? "awaiting_form" : "complete";
      const ok = await handlePatch({ status: newStatus });
      if (ok) {
        onUpdated({ ...p, intake_status: newStatus });
      }
    } finally {
      setTogglingStep(null);
    }
  };

  const handleStripeLookup = async (silent = false) => {
    if (!p.email) return;
    setLookingUpStripe(true);
    try {
      const res = await fetch(`/api/cohorts/stripe-lookup?email=${encodeURIComponent(p.email)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStripeChecked(true);
      setStripeResult(data);

      if (data.found && data.subscription) {
        const sub = data.subscription;
        const patchFields: Record<string, unknown> = {
          stripe_subscription_id: sub.id,
          plan_name: sub.plan_name,
          amount_cents: sub.amount_cents,
          billing_interval: sub.billing_interval,
          billing_interval_count: sub.billing_interval_count,
          payment_date: sub.created,
          next_billing_date: sub.current_period_end,
          billing_status: sub.status,
          payment_method: "stripe",
        };
        if (sub.package_months) patchFields.package_months = sub.package_months;

        const ok = await handlePatch(patchFields);
        if (ok) {
          const updated = { ...p };
          if (data.customer) {
            updated.stripe_customer_id = data.customer.id;
          }
          updated.stripe_subscription_id = sub.id;
          updated.plan_name = sub.plan_name;
          updated.amount_cents = sub.amount_cents;
          updated.billing_interval = sub.billing_interval;
          updated.billing_interval_count = sub.billing_interval_count;
          updated.payment_date = sub.created;
          updated.next_billing_date = sub.current_period_end;
          updated.billing_status = sub.status;
          updated.payment_method = "stripe";
          if (sub.package_months) updated.package_months = sub.package_months;
          onUpdated(updated);
        }
      } else if (!silent) {
        // No alert — the UI will show "No Stripe payment found"
      }
    } catch (e: any) {
      setStripeChecked(true);
      setStripeResult({ found: false });
      if (!silent) {
        // Error handled visually
      }
    } finally {
      setLookingUpStripe(false);
    }
  };

  const handleManualPayment = async () => {
    if (!p.intake_id) return;
    const cents = Math.round(parseFloat(manualPayAmount || "0") * 100);
    const patchFields: Record<string, unknown> = {
      payment_method: manualPayMethod,
      payment_date: new Date().toISOString(),
      amount_cents: cents || null,
      manual_payment_note: manualPayNote || null,
      billing_status: "manual",
    };
    const ok = await handlePatch(patchFields);
    if (ok) {
      const updated = { ...p, ...patchFields, intake_status: p.intake_status };
      onUpdated(updated as IntakeParticipant);
      setManualPayOpen(false);
      setManualPayNote("");
      setManualPayAmount("");
    }
  };

  function billingDescription(): string {
    if (!p.billing_interval) {
      if (p.billing_status === "one_time" || (p.payment_method === "stripe" && !p.billing_interval)) {
        return "One-time payment";
      }
      return "";
    }
    if (p.package_months && p.package_months > 1) {
      return `${p.package_months}-month package, billed ${p.billing_interval}ly`;
    }
    return `Month-to-month, billed ${p.billing_interval}ly`;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-dark-bg">
      {/* Header */}
      <div className="bg-dark-panel border-b border-dark-border px-8 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={onClose}
          className="text-dark-muted hover:text-dark-text transition-colors p-1.5 rounded-lg hover:bg-dark-panel2"
        >
          <X size={20} />
        </button>
        <Avatar name={p.full_name} photoUrl={p.photo_url} size={44} />
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-dark-text tracking-tight truncate">{p.full_name}</h2>
          <p className="text-sm text-dark-muted truncate">{p.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {p.cohort_number != null && (
            <span className="text-xs bg-dark-panel2 border border-dark-border rounded-full px-2.5 py-1 text-dark-muted">
              Cohort {p.cohort_number}
            </span>
          )}
          <BillingBadge status={p.billing_status} />
        </div>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">

          {/* Progress bar */}
          <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-dark-text">Onboarding Progress</span>
              <span className="text-sm text-dark-muted">
                {displayCompleted}/{totalSteps} steps ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-dark-panel2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${progressPct === 100 ? "bg-dark-success" : "bg-cm-purple"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Two-column layout: Steps + Payment details */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Left column — Steps */}
            <div className="lg:col-span-2 space-y-6">
              {/* No intake record warning */}
              {!p.intake_id && (
                <div className="flex items-start gap-3 text-sm text-dark-warn bg-dark-warn/10 border border-dark-warn/30 rounded-xl px-5 py-4">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">No intake record</div>
                    <div className="text-xs text-dark-muted mt-1">
                      This participant does not have an intake record yet. Steps cannot be toggled until one is created (via Stripe payment or manual entry).
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-dark-panel border border-dark-border rounded-xl">
                <div className="px-5 py-3 border-b border-dark-border">
                  <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wide">Onboarding Steps</h3>
                </div>
                <div className="divide-y divide-dark-border">
                  {steps.map((step) => {
                    const done = step.isComplete(p);
                    const completedDate = step.completedAt(p);
                    const isToggling = togglingStep === step.number;
                    const canToggle = !step.readOnly && !!p.intake_id;

                    // Step 1 — Payment — gets special treatment
                    if (step.number === 1) {
                      const hasPaid = done;
                      const paidViaStripe = p.payment_method === "stripe" && (!!p.stripe_subscription_id || !!p.payment_date);
                      const paidExternally = p.payment_method && p.payment_method !== "stripe" && hasPaid;

                      return (
                        <div key={step.number} className="px-5 py-4">
                          {/* Step header row */}
                          <div className="flex items-center gap-4 mb-3">
                            <input
                              type="checkbox"
                              checked={hasPaid}
                              disabled
                              className="w-5 h-5 rounded border-dark-border text-cm-purple focus:ring-cm-purple focus:ring-offset-0 disabled:opacity-70 shrink-0"
                            />
                            <span
                              className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                                hasPaid ? "bg-dark-success/20 text-dark-success" : "bg-dark-panel2 text-dark-muted"
                              }`}
                            >
                              1
                            </span>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium ${hasPaid ? "text-dark-muted line-through" : "text-dark-text"}`}>
                                {step.name}
                              </div>
                              <div className="text-xs text-dark-muted mt-0.5">{step.description}</div>
                            </div>
                            {hasPaid && completedDate && (
                              <span className="text-xs text-dark-muted shrink-0">{formatDate(completedDate)}</span>
                            )}
                            {hasPaid && !completedDate && (
                              <Check size={16} className="text-dark-success shrink-0" />
                            )}
                          </div>

                          {/* Payment detail area */}
                          <div className="ml-14 space-y-3">
                            {/* Stripe check */}
                            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-dark-text uppercase tracking-wide">Stripe Payment</span>
                                <button
                                  onClick={() => handleStripeLookup(false)}
                                  disabled={lookingUpStripe}
                                  className="flex items-center gap-1.5 text-xs text-cm-purple hover:text-cm-purple/80 disabled:opacity-50 transition-colors"
                                >
                                  {lookingUpStripe ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                  {stripeChecked ? "Re-check Stripe" : "Check Stripe"}
                                </button>
                              </div>

                              {paidViaStripe ? (
                                <div className="space-y-1.5">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 size={14} className="text-dark-success" />
                                    <span className="text-sm text-dark-success font-medium">Stripe payment found</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs ml-5">
                                    <div><span className="text-dark-muted">Plan:</span> <span className="text-dark-text">{p.plan_name || "—"}</span></div>
                                    <div><span className="text-dark-muted">Amount:</span> <span className="text-cm-purple font-medium">{formatAmount(p.amount_cents)}</span></div>
                                    <div><span className="text-dark-muted">Paid:</span> <span className="text-dark-text">{p.payment_date ? formatDate(p.payment_date) : "—"}</span></div>
                                    <div><span className="text-dark-muted">Next billing:</span> <span className="text-dark-text">{p.next_billing_date ? formatDate(p.next_billing_date) : "—"}</span></div>
                                    <div><span className="text-dark-muted">Cycle:</span> <span className="text-dark-text">{billingDescription() || "—"}</span></div>
                                  </div>
                                </div>
                              ) : stripeChecked && !lookingUpStripe ? (
                                <div className="flex items-center gap-2">
                                  <XCircle size={14} className="text-dark-warn" />
                                  <span className="text-sm text-dark-warn">No Stripe payment found for {p.email}</span>
                                </div>
                              ) : !lookingUpStripe ? (
                                <div className="text-xs text-dark-muted">Click &quot;Check Stripe&quot; to look up payment status</div>
                              ) : null}
                            </div>

                            {/* External payment */}
                            <div className="bg-dark-panel2 border border-dark-border rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={!!paidExternally || manualPayOpen}
                                    onChange={() => {
                                      if (paidExternally) {
                                        // Unchecking external payment
                                        handlePatch({ payment_method: null, billing_status: null, manual_payment_note: null }).then((ok) => {
                                          if (ok) onUpdated({ ...p, payment_method: null, billing_status: null, manual_payment_note: null });
                                        });
                                      } else {
                                        setManualPayOpen(!manualPayOpen);
                                      }
                                    }}
                                    disabled={paidViaStripe}
                                    className="w-4 h-4 rounded border-dark-border text-cm-purple focus:ring-cm-purple focus:ring-offset-0 disabled:opacity-50 cursor-pointer disabled:cursor-default"
                                  />
                                  <span className="text-xs font-semibold text-dark-text uppercase tracking-wide">Paid Externally</span>
                                </label>
                                {paidExternally && (
                                  <span className="text-xs text-dark-muted capitalize">{p.payment_method}</span>
                                )}
                              </div>

                              {paidExternally && !manualPayOpen && (
                                <div className="mt-2 ml-6 space-y-1 text-xs">
                                  <div><span className="text-dark-muted">Method:</span> <span className="text-dark-text capitalize">{p.payment_method}</span></div>
                                  <div><span className="text-dark-muted">Amount:</span> <span className="text-cm-purple font-medium">{formatAmount(p.amount_cents)}</span></div>
                                  {p.payment_date && <div><span className="text-dark-muted">Date:</span> <span className="text-dark-text">{formatDate(p.payment_date)}</span></div>}
                                  {p.manual_payment_note && <div><span className="text-dark-muted">Note:</span> <span className="text-dark-text">{p.manual_payment_note}</span></div>}
                                </div>
                              )}

                              {(manualPayOpen && !paidExternally) && (
                                <div className="mt-3 space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-xs text-dark-muted">Method</label>
                                      <select
                                        value={manualPayMethod}
                                        onChange={(e) => setManualPayMethod(e.target.value)}
                                        className="w-full mt-1 bg-dark-bg border border-dark-border text-dark-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                                      >
                                        <option value="wise">Wise</option>
                                        <option value="revolut">Revolut</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="cash">Cash</option>
                                        <option value="other">Other</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-dark-muted">Amount ($)</label>
                                      <input
                                        type="number"
                                        value={manualPayAmount}
                                        onChange={(e) => setManualPayAmount(e.target.value)}
                                        placeholder="3600"
                                        className="w-full mt-1 bg-dark-bg border border-dark-border text-dark-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-dark-muted">Note</label>
                                    <input
                                      type="text"
                                      value={manualPayNote}
                                      onChange={(e) => setManualPayNote(e.target.value)}
                                      placeholder="e.g. Wise transfer received March 29"
                                      className="w-full mt-1 bg-dark-bg border border-dark-border text-dark-text text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={handleManualPayment}
                                      disabled={!p.intake_id || !manualPayAmount}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-xs font-medium transition-colors"
                                    >
                                      Confirm Payment
                                    </button>
                                    <button
                                      onClick={() => setManualPayOpen(false)}
                                      className="px-2 py-1.5 text-dark-muted hover:text-dark-text text-xs transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }

                    // All other steps — standard checkbox row
                    return (
                      <label
                        key={step.number}
                        className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                          canToggle ? "cursor-pointer hover:bg-dark-panel2/50" : ""
                        }`}
                      >
                        {/* Checkbox */}
                        {isToggling ? (
                          <Loader2 size={18} className="animate-spin text-dark-muted shrink-0" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={done}
                            disabled={!canToggle}
                            onChange={() => canToggle && handleToggle(step)}
                            className="w-5 h-5 rounded border-dark-border text-cm-purple focus:ring-cm-purple focus:ring-offset-0 disabled:opacity-50 shrink-0 cursor-pointer disabled:cursor-default"
                          />
                        )}

                        {/* Step number badge */}
                        <span
                          className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                            done ? "bg-dark-success/20 text-dark-success" : "bg-dark-panel2 text-dark-muted"
                          }`}
                        >
                          {step.number}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${done ? "text-dark-muted line-through" : "text-dark-text"}`}>
                            {step.name}
                          </div>
                          <div className="text-xs text-dark-muted mt-0.5">{step.description}</div>
                        </div>

                        {/* Completed date */}
                        {done && completedDate && (
                          <span className="text-xs text-dark-muted shrink-0">{formatDate(completedDate)}</span>
                        )}
                        {done && !completedDate && (
                          <Check size={16} className="text-dark-success shrink-0" />
                        )}
                      </label>
                    );
                  })}

                  {/* Fully Onboarded — special final step */}
                  <label
                    className={`flex items-center gap-4 px-5 py-3.5 transition-colors ${
                      p.intake_id ? "cursor-pointer hover:bg-dark-panel2/50" : ""
                    } ${isFullyOnboarded ? "bg-dark-success/5" : ""}`}
                  >
                    {togglingStep === 99 ? (
                      <Loader2 size={18} className="animate-spin text-dark-muted shrink-0" />
                    ) : (
                      <input
                        type="checkbox"
                        checked={isFullyOnboarded}
                        disabled={!p.intake_id}
                        onChange={handleFullyOnboardedToggle}
                        className="w-5 h-5 rounded border-dark-border text-dark-success focus:ring-dark-success focus:ring-offset-0 disabled:opacity-50 shrink-0 cursor-pointer disabled:cursor-default"
                      />
                    )}
                    <span
                      className={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
                        isFullyOnboarded ? "bg-dark-success/20 text-dark-success" : "bg-dark-panel2 text-dark-muted"
                      }`}
                    >
                      <CheckCircle2 size={12} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold ${isFullyOnboarded ? "text-dark-success" : "text-dark-text"}`}>
                        Fully Onboarded
                      </div>
                      <div className="text-xs text-dark-muted mt-0.5">
                        {shouldBeComplete && !isFullyOnboarded
                          ? "All steps complete — marking as onboarded..."
                          : "All steps complete — participant is fully onboarded"}
                      </div>
                    </div>
                    {isFullyOnboarded && <Check size={18} className="text-dark-success shrink-0" />}
                  </label>
                </div>
              </div>
            </div>

            {/* Right column — Payment & billing details */}
            <div className="space-y-4">
              {/* Payment info card */}
              <div className="bg-dark-panel border border-dark-border rounded-xl">
                <div className="px-5 py-3 border-b border-dark-border">
                  <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wide">Payment Summary</h3>
                </div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Method</span>
                    <span className="text-sm text-dark-text capitalize">{p.payment_method || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Plan</span>
                    <span className="text-sm text-dark-text">{p.plan_name || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Amount</span>
                    <span className="text-sm font-medium text-cm-purple">{formatAmount(p.amount_cents)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Payment Date</span>
                    <span className="text-sm text-dark-text">{p.payment_date ? formatDate(p.payment_date) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Billing Cycle</span>
                    <span className="text-sm text-dark-text">{billingDescription() || "—"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-dark-muted">Next Billing</span>
                    <span className="text-sm text-dark-text">{p.next_billing_date ? formatDate(p.next_billing_date) : "—"}</span>
                  </div>
                  {p.package_months && p.package_months > 1 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-muted">Package</span>
                      <span className="text-sm text-dark-text">{p.package_months} months</span>
                    </div>
                  )}
                  {p.manual_payment_note && (
                    <div className="pt-2 border-t border-dark-border">
                      <span className="text-xs text-dark-muted">Note</span>
                      <p className="text-sm text-dark-text mt-1">{p.manual_payment_note}</p>
                    </div>
                  )}
                </div>

              </div>

              {/* Cohort info */}
              {p.cohort_number != null && (
                <div className="bg-dark-panel border border-dark-border rounded-xl px-5 py-4">
                  <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wide mb-3">Cohort Info</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-dark-muted">Cohort</span>
                      <span className="text-sm text-dark-text">Cohort {p.cohort_number}</span>
                    </div>
                    {p.cohort_start_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dark-muted">Start Date</span>
                        <span className="text-sm text-dark-text">{formatDate(p.cohort_start_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

type TabKey = "pipeline" | "process";

export default function OnboardingPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("pipeline");
  const [participants, setParticipants] = useState<IntakeParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [cohortFilter, setCohortFilter] = useState<number | "all">("all");
  const [selectedParticipant, setSelectedParticipant] = useState<IntakeParticipant | null>(null);

  // Process tab state
  const [processSteps, setProcessSteps] = useState<ProcessStep[]>([]);
  const [processLoading, setProcessLoading] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [cohorts, setCohorts] = useState<CohortInfo[]>([]);
  const [futureNotes, setFutureNotes] = useState<string[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [templateDraft, setTemplateDraft] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cohorts/intake");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setParticipants(data.participants ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProcess = useCallback(async () => {
    setProcessLoading(true);
    setProcessError(null);
    try {
      const res = await fetch("/api/cohorts/onboarding-process");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProcessSteps(data.steps ?? []);
      setTemplates(data.templates ?? []);
      setCohorts(data.cohorts ?? []);
      setFutureNotes(data.futureNotes ?? []);
    } catch (e: any) {
      setProcessError(e.message ?? "Failed to load");
    } finally {
      setProcessLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === "process" && processSteps.length === 0) {
      fetchProcess();
    }
  }, [activeTab, processSteps.length, fetchProcess]);

  const handleWaToggle = async (p: IntakeParticipant) => {
    if (!p.intake_id) return;
    if (p.wa_status === "added") return;
    setTogglingId(p.intake_id);
    try {
      const res = await fetch("/api/cohorts/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.intake_id, wa_status: "added" }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
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

  const handleSaveTemplate = async (filename: string) => {
    setSavingTemplate(true);
    try {
      const res = await fetch("/api/cohorts/onboarding-process/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, body: templateDraft }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTemplates((prev) =>
        prev.map((t) => (t.filename === filename ? { ...t, body: templateDraft } : t))
      );
      setEditingTemplate(null);
    } catch (e: any) {
      alert("Failed to save template: " + e.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepNum)) next.delete(stepNum);
      else next.add(stepNum);
      return next;
    });
  };

  // ── Cohort filter ──────────────────────────────────────────────────
  const cohortNumbers = Array.from(new Set(participants.map((p) => p.cohort_number).filter(Boolean))).sort() as number[];
  const filtered = cohortFilter === "all" ? participants : participants.filter((p) => p.cohort_number === cohortFilter);

  // ── Stats ──────────────────────────────────────────────────────────
  const total = filtered.length;
  const totalMonthly = filtered.reduce((sum, p) => sum + (p.amount_cents ?? 0), 0);
  const fullyOnboarded = filtered.filter((p) => p.intake_status === "complete").length;
  const awaitingForm = filtered.filter((p) => p.intake_form_sent_at && !p.intake_submitted_at).length;
  const formReceived = filtered.filter((p) => !!p.intake_submitted_at).length;

  // Process stats
  const healthySteps = processSteps.filter((s) => s.status === "healthy" || s.status === "ok" || s.status === "manual").length;
  const failingSteps = processSteps.filter((s) => s.status === "skipped").length;

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header with tabs */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-cm-purple/15 rounded-lg p-3">
              <ClipboardList size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text tracking-tight">Onboarding Pipeline</h1>
              <p className="text-sm text-dark-muted mt-0.5">
                Track each participant&apos;s intake status from payment to fully onboarded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === "pipeline" && (
              <>
                <select
                  value={cohortFilter}
                  onChange={(e) => setCohortFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple"
                >
                  <option value="all">All Cohorts</option>
                  {cohortNumbers.map((c) => (
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
              </>
            )}
            {activeTab === "process" && (
              <button
                onClick={fetchProcess}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted text-sm hover:text-dark-text hover:border-cm-purple/40 transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
            )}
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-5 border-b border-dark-border">
          <button
            onClick={() => setActiveTab("pipeline")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "pipeline"
                ? "border-cm-purple text-cm-purple"
                : "border-transparent text-dark-muted hover:text-dark-text"
            }`}
          >
            <Users size={15} />
            Pipeline
          </button>
          <button
            onClick={() => setActiveTab("process")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "process"
                ? "border-cm-purple text-cm-purple"
                : "border-transparent text-dark-muted hover:text-dark-text"
            }`}
          >
            <Settings2 size={15} />
            Onboarding Process
            {failingSteps > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-dark-danger/20 text-dark-danger">
                {failingSteps}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Pipeline Tab ── */}
      {activeTab === "pipeline" && (
        <>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-dark-muted">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading onboarding data…
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-dark-danger p-6">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          ) : (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
                        <tr
                          key={p.id}
                          className="hover:bg-dark-panel2/50 transition-colors cursor-pointer"
                          onClick={() => setSelectedParticipant(p)}
                        >
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
                          <td className="px-3 py-3 text-center">
                            <DoneBadge label="Paid" />
                          </td>
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
                          <td className="px-3 py-3 text-center">
                            {p.wa_status === "added" ? (
                              <DoneBadge label="Added" />
                            ) : togglingId !== null && togglingId === p.intake_id ? (
                              <Loader2 size={14} className="animate-spin text-dark-muted mx-auto" />
                            ) : (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleWaToggle(p); }}
                                disabled={!p.intake_id}
                                title="Click to mark WA as added"
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-dark-panel2 border border-dark-border text-dark-muted hover:bg-dark-panel disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              >
                                <Clock size={11} />
                                Pending
                              </button>
                            )}
                          </td>
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
                          <td className="px-3 py-3 text-center">
                            {p.calendar_added ? (
                              <DoneBadge label="Added" />
                            ) : (
                              <PendingBadge />
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <BillingBadge status={p.billing_status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Onboarding Process Tab ── */}
      {activeTab === "process" && (
        <>
          {processLoading ? (
            <div className="flex items-center justify-center h-64 text-dark-muted">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading onboarding process…
            </div>
          ) : processError ? (
            <div className="flex items-center gap-2 text-dark-danger p-6">
              <AlertCircle size={18} />
              <span>{processError}</span>
            </div>
          ) : (
            <>
              {/* Process health summary */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard
                  label="Total steps"
                  value={processSteps.length}
                  icon={<ClipboardList size={16} className="text-cm-purple" />}
                />
                <StatCard
                  label="Healthy"
                  value={healthySteps}
                  icon={<CheckCircle2 size={16} className="text-dark-success" />}
                />
                <StatCard
                  label="Failing"
                  value={failingSteps}
                  icon={failingSteps > 0
                    ? <XCircle size={16} className="text-dark-danger" />
                    : <CheckCircle2 size={16} className="text-dark-success" />}
                />
              </div>

              {/* Step cards */}
              <div className="space-y-3">
                {processSteps.map((step) => (
                  <ProcessStepCard
                    key={step.number}
                    step={step}
                    isExpanded={expandedSteps.has(step.number)}
                    onToggle={() => toggleStep(step.number)}
                  />
                ))}
              </div>

              {/* Email Templates */}
              {templates.length > 0 && (
                <div className="bg-dark-panel border border-dark-border rounded-xl">
                  <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
                    <Mail size={16} className="text-cm-purple" />
                    <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wide">Email Templates</h3>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {templates.map((tpl) => (
                      <div key={tpl.filename} className="px-5 py-4">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <div className="text-sm font-medium text-dark-text">{tpl.name}</div>
                            <div className="text-xs text-dark-muted mt-0.5">{tpl.trigger}</div>
                            {tpl.subject && (
                              <div className="text-xs text-dark-muted mt-1">
                                <span className="text-dark-muted">Subject:</span>{" "}
                                <span className="text-dark-text font-mono">{tpl.subject}</span>
                              </div>
                            )}
                          </div>
                          {editingTemplate === tpl.filename ? (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => handleSaveTemplate(tpl.filename)}
                                disabled={savingTemplate}
                                className="flex items-center gap-1 px-3 py-1 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 text-xs font-medium transition-colors"
                              >
                                {savingTemplate ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                Save
                              </button>
                              <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-2 py-1 text-dark-muted hover:text-dark-text text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingTemplate(tpl.filename);
                                setTemplateDraft(tpl.body);
                              }}
                              className="text-xs text-cm-purple hover:text-cm-purple/80 transition-colors shrink-0"
                            >
                              Edit
                            </button>
                          )}
                        </div>

                        {/* Variables */}
                        {tpl.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {tpl.variables.map((v, i) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono bg-cm-purple/10 text-cm-purple px-2 py-0.5 rounded-full"
                              >
                                {v.split(" — ")[0]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Template body */}
                        {editingTemplate === tpl.filename ? (
                          <textarea
                            value={templateDraft}
                            onChange={(e) => setTemplateDraft(e.target.value)}
                            rows={12}
                            className="w-full font-mono text-sm bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-dark-text focus:outline-none focus:ring-1 focus:ring-cm-purple resize-y"
                          />
                        ) : (
                          <pre className="text-sm bg-dark-panel2 border border-dark-border rounded-lg px-4 py-3 text-dark-muted whitespace-pre-wrap font-mono overflow-x-auto">
                            {tpl.body}
                          </pre>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cohorts */}
              {cohorts.length > 0 && (
                <div className="bg-dark-panel border border-dark-border rounded-xl">
                  <div className="px-5 py-3 border-b border-dark-border flex items-center gap-2">
                    <Users size={16} className="text-cm-purple" />
                    <h3 className="text-sm font-semibold text-dark-text uppercase tracking-wide">Cohort Schedule</h3>
                  </div>
                  <div className="divide-y divide-dark-border">
                    {cohorts.map((c) => (
                      <div key={c.number} className="flex items-center gap-4 px-5 py-3">
                        <span className="w-8 h-8 rounded-full bg-cm-purple text-white text-xs font-bold flex items-center justify-center shrink-0">
                          {c.number}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-dark-text">{c.name}</div>
                          <div className="text-xs text-dark-muted">
                            Starts {formatDate(c.start_date)}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          c.status === "active"
                            ? "bg-dark-success/15 text-dark-success"
                            : c.status === "upcoming"
                              ? "bg-cm-purple/15 text-cm-purple"
                              : "bg-dark-panel2 text-dark-muted"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Future Notes */}
              {futureNotes.length > 0 && (
                <div className="bg-dark-warn/5 border border-dark-warn/20 rounded-xl px-5 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle size={14} className="text-dark-warn" />
                    <span className="text-xs font-semibold text-dark-warn uppercase tracking-wide">Future Projects</span>
                  </div>
                  <ul className="space-y-1">
                    {futureNotes.map((note, i) => (
                      <li key={i} className="text-sm text-dark-muted">{note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Participant detail — full screen */}
      {selectedParticipant && (
        <ParticipantDetail
          participant={selectedParticipant}
          onClose={() => setSelectedParticipant(null)}
          onUpdated={(updated) => {
            setSelectedParticipant(updated);
            setParticipants((prev) =>
              prev.map((x) => (x.id === updated.id ? updated : x))
            );
          }}
        />
      )}
    </div>
  );
}
