"use client";

import { useEffect, useState } from "react";
import {
  Coins, Clock, Gift, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader2, RefreshCw,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Deal {
  id: number;
  participant_id: number;
  deal_type: "store_credit" | "time_hours" | "item";
  description: string;
  frequency: "monthly" | "one_time";
  monthly_value_cents: number;
  monthly_hours: number;
  item_description: string | null;
  item_quantity: number;
  item_received: number;
  active: number;
  notes: string | null;
  full_name: string;
  first_name: string | null;
  photo_url: string | null;
  email: string;
  total_credited_cents: number;
  total_spent_cents: number;
  total_hours_credited: number;
  total_hours_used: number;
  months_accrued: number;
}

interface LedgerEntry {
  id: number;
  deal_id: number;
  participant_id: number;
  entry_type: "credit" | "debit" | "hours_credit" | "hours_used" | "item_received";
  amount_cents: number;
  hours: number;
  description: string | null;
  period: string | null;
  created_at: string;
  full_name: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Avatar({ name, photoUrl, size = 32 }: { name: string; photoUrl: string | null; size?: number }) {
  const [err, setErr] = useState(false);
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("");
  if (photoUrl && !err) {
    return (
      <img src={photoUrl} alt={name} onError={() => setErr(true)}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="rounded-full bg-cm-purple/15 flex items-center justify-center flex-shrink-0 text-cm-purple font-semibold"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

function formatCents(c: number) { return `$${(c / 100).toFixed(0)}`; }
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" });
}

function TypeBadge({ type }: { type: Deal["deal_type"] }) {
  if (type === "store_credit") return (
    <span className="inline-flex items-center gap-1 bg-cm-purple/10 text-cm-purple border border-cm-purple/20 rounded-full px-2 py-0.5 text-xs font-medium">
      <Coins className="w-3 h-3" /> Store Credit
    </span>
  );
  if (type === "time_hours") return (
    <span className="inline-flex items-center gap-1 bg-dark-panel2 text-dark-muted border border-dark-border rounded-full px-2 py-0.5 text-xs font-medium">
      <Clock className="w-3 h-3" /> Time
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 bg-cm-pink/10 text-[#9b5b5e] border border-cm-pink/20 rounded-full px-2 py-0.5 text-xs font-medium">
      <Gift className="w-3 h-3" /> Item
    </span>
  );
}

// ─── Inline forms ────────────────────────────────────────────────────────────

function SpendingForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) { setErr("Enter a valid amount"); return; }
    setSaving(true); setErr("");
    const resp = await fetch("/api/online-program/favor-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: deal.id, participant_id: deal.participant_id, entry_type: "debit", amount_cents: Math.round(parseFloat(amount) * 100), description: desc || `Spending — ${deal.full_name}` }),
    });
    if (!resp.ok) setErr("Failed to save"); else onDone();
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 flex-wrap">
      <input type="number" min="0" step="0.01" placeholder="Amount ($)" value={amount} onChange={(e) => setAmount(e.target.value)}
        className="w-28 bg-dark-panel border border-dark-border rounded px-2 py-1 text-dark-text text-xs focus:outline-none focus:ring-1 focus:ring-cm-purple" />
      <input type="text" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)}
        className="flex-1 min-w-32 bg-dark-panel border border-dark-border rounded px-2 py-1 text-dark-text text-xs focus:outline-none focus:ring-1 focus:ring-cm-purple" />
      {err && <span className="text-dark-danger text-xs">{err}</span>}
      <button type="submit" disabled={saving} className="bg-cm-purple text-white rounded px-3 py-1 text-xs font-medium hover:bg-[#5b4fa8] disabled:opacity-50 flex items-center gap-1">
        {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
      </button>
      <button type="button" onClick={onDone} className="text-dark-muted text-xs hover:text-dark-text px-2 py-1">Cancel</button>
    </form>
  );
}

function HoursForm({ deal, onDone }: { deal: Deal; onDone: () => void }) {
  const [hours, setHours] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!hours || isNaN(parseFloat(hours))) { setErr("Enter valid hours"); return; }
    setSaving(true); setErr("");
    const resp = await fetch("/api/online-program/favor-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deal_id: deal.id, participant_id: deal.participant_id, entry_type: "hours_used", hours: parseFloat(hours), description: desc || `Hours used — ${deal.full_name}` }),
    });
    if (!resp.ok) setErr("Failed to save"); else onDone();
    setSaving(false);
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 flex-wrap">
      <input type="number" min="0" step="0.25" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)}
        className="w-20 bg-dark-panel border border-dark-border rounded px-2 py-1 text-dark-text text-xs focus:outline-none focus:ring-1 focus:ring-cm-purple" />
      <input type="text" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)}
        className="flex-1 min-w-32 bg-dark-panel border border-dark-border rounded px-2 py-1 text-dark-text text-xs focus:outline-none focus:ring-1 focus:ring-cm-purple" />
      {err && <span className="text-dark-danger text-xs">{err}</span>}
      <button type="submit" disabled={saving} className="bg-cm-purple text-white rounded px-3 py-1 text-xs font-medium hover:bg-[#5b4fa8] disabled:opacity-50 flex items-center gap-1">
        {saving && <Loader2 className="w-3 h-3 animate-spin" />} Save
      </button>
      <button type="button" onClick={onDone} className="text-dark-muted text-xs hover:text-dark-text px-2 py-1">Cancel</button>
    </form>
  );
}

// ─── Table row ───────────────────────────────────────────────────────────────

function DealRow({ deal, ledger, onRefresh }: { deal: Deal; ledger: LedgerEntry[]; onRefresh: () => void }) {
  const [showHistory, setShowHistory] = useState(false);
  const [showSpending, setShowSpending] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const [markingReceived, setMarkingReceived] = useState(false);

  const dealLedger = ledger.filter((e) => e.deal_id === deal.id).slice(0, 10);
  const balanceCents = deal.total_credited_cents - deal.total_spent_cents;
  const availableHours = deal.total_hours_credited - deal.total_hours_used;

  async function markReceived() {
    setMarkingReceived(true);
    await fetch("/api/online-program/favor-bank", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_item_received", deal_id: deal.id, participant_id: deal.participant_id, description: `${deal.item_description} received` }),
    });
    setMarkingReceived(false);
    onRefresh();
  }

  function handleDone() { setShowSpending(false); setShowHours(false); onRefresh(); }

  const hasForm = showSpending || showHours;
  const showExpanded = showHistory || hasForm;

  return (
    <>
      <tr className="hover:bg-dark-panel2/50 transition-colors border-b border-dark-border">

        {/* Participant */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar name={deal.full_name} photoUrl={deal.photo_url} size={34} />
            <div>
              <div className="font-medium text-dark-text text-sm">{deal.full_name}</div>
              <div className="text-xs text-dark-muted">{deal.email}</div>
            </div>
          </div>
        </td>

        {/* What you get */}
        <td className="px-4 py-3 max-w-xs">
          <div className="text-sm text-dark-text">{deal.description}</div>
          {deal.notes && (
            <div className="text-xs text-dark-muted mt-0.5 italic">{deal.notes}</div>
          )}
        </td>

        {/* Type */}
        <td className="px-3 py-3 text-center">
          <TypeBadge type={deal.deal_type} />
        </td>

        {/* Monthly value */}
        <td className="px-3 py-3 text-center">
          {deal.deal_type === "store_credit" && (
            <span className="text-sm font-medium text-dark-text">{formatCents(deal.monthly_value_cents)}/mo</span>
          )}
          {deal.deal_type === "time_hours" && (
            <span className="text-sm font-medium text-dark-text">{deal.monthly_hours}h/mo</span>
          )}
          {deal.deal_type === "item" && (
            <span className="text-sm text-dark-muted">One-time</span>
          )}
        </td>

        {/* Balance */}
        <td className="px-3 py-3 text-center">
          {deal.deal_type === "store_credit" && (
            <div>
              <div className={`text-lg font-bold tabular-nums ${balanceCents >= 10000 ? "text-dark-success" : balanceCents >= 5000 ? "text-dark-warn" : "text-dark-danger"}`}>
                {formatCents(balanceCents)}
              </div>
              <div className="text-xs text-dark-muted">{formatCents(deal.total_credited_cents)} total · {deal.months_accrued}mo</div>
            </div>
          )}
          {deal.deal_type === "time_hours" && (
            <div>
              <div className="text-lg font-bold text-cm-purple tabular-nums">{availableHours.toFixed(1)}h</div>
              <div className="text-xs text-dark-muted">{deal.total_hours_credited.toFixed(1)} credited · {deal.total_hours_used.toFixed(1)} used</div>
            </div>
          )}
          {deal.deal_type === "item" && (
            <div className="flex items-center justify-center gap-1.5">
              {deal.item_received ? (
                <span className="inline-flex items-center gap-1 text-dark-success text-xs font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Received
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-dark-warn text-xs font-medium">
                  <AlertCircle className="w-3.5 h-3.5" /> Pending
                </span>
              )}
            </div>
          )}
        </td>

        {/* Actions */}
        <td className="px-3 py-3 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {deal.deal_type === "store_credit" && !showSpending && (
              <button onClick={() => setShowSpending(true)}
                className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded px-2.5 py-1 hover:text-dark-text hover:border-cm-purple/40 transition-colors whitespace-nowrap">
                Record Spending
              </button>
            )}
            {deal.deal_type === "time_hours" && !showHours && (
              <button onClick={() => setShowHours(true)}
                className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded px-2.5 py-1 hover:text-dark-text hover:border-cm-purple/40 transition-colors whitespace-nowrap">
                Log Hours
              </button>
            )}
            {deal.deal_type === "item" && !deal.item_received && (
              <button onClick={markReceived} disabled={markingReceived}
                className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded px-2.5 py-1 hover:text-dark-success hover:border-dark-success/40 transition-colors flex items-center gap-1">
                {markingReceived && <Loader2 className="w-3 h-3 animate-spin" />}
                Mark Received
              </button>
            )}
            {dealLedger.length > 0 && (
              <button onClick={() => setShowHistory(!showHistory)}
                className="bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded px-2.5 py-1 hover:text-dark-text transition-colors flex items-center gap-1">
                History
                {showHistory ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded row — inline form or history */}
      {showExpanded && (
        <tr className="bg-dark-panel2/30 border-b border-dark-border">
          <td colSpan={6} className="px-6 py-3">
            {hasForm && (
              <div className="mb-3">
                {showSpending && <SpendingForm deal={deal} onDone={handleDone} />}
                {showHours && <HoursForm deal={deal} onDone={handleDone} />}
              </div>
            )}
            {showHistory && dealLedger.length > 0 && (
              <div className="space-y-0">
                <p className="text-dark-muted text-xs font-medium uppercase tracking-wider mb-2">Transaction History</p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-dark-muted">
                      <th className="text-left pb-1 font-medium w-20">Amount</th>
                      <th className="text-left pb-1 font-medium">Description</th>
                      <th className="text-right pb-1 font-medium w-24">Period / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border/30">
                    {dealLedger.map((entry) => (
                      <tr key={entry.id}>
                        <td className={`py-1.5 font-medium tabular-nums ${
                          entry.entry_type === "credit" || entry.entry_type === "hours_credit" ? "text-dark-success"
                          : entry.entry_type === "debit" || entry.entry_type === "hours_used" ? "text-dark-danger"
                          : "text-cm-purple"}`}>
                          {entry.entry_type === "credit" ? `+${formatCents(entry.amount_cents)}`
                            : entry.entry_type === "debit" ? `-${formatCents(entry.amount_cents)}`
                            : entry.entry_type === "hours_credit" ? `+${entry.hours}h`
                            : entry.entry_type === "hours_used" ? `-${entry.hours}h`
                            : "✓ received"}
                        </td>
                        <td className="py-1.5 text-dark-muted truncate max-w-xs">{entry.description || entry.entry_type}</td>
                        <td className="py-1.5 text-dark-muted text-right">{entry.period || formatDate(entry.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FavorBankPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const resp = await fetch("/api/online-program/favor-bank");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setDeals(data.deals || []);
      setLedger(data.ledger || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const totalCreditBalance = deals.filter((d) => d.deal_type === "store_credit").reduce((s, d) => s + (d.total_credited_cents - d.total_spent_cents), 0);
  const totalHours = deals.filter((d) => d.deal_type === "time_hours").reduce((s, d) => s + (d.total_hours_credited - d.total_hours_used), 0);
  const pendingItems = deals.filter((d) => d.deal_type === "item" && !d.item_received).length;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-cm-purple/15 rounded-lg p-3">
              <Coins className="w-5 h-5 text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text tracking-tight">Favor Bank</h1>
              <p className="text-sm text-dark-muted mt-0.5">
                Scholarship trades — what each participant gives you in exchange for their discounted seat.
              </p>
            </div>
          </div>
          <button onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted text-sm hover:text-dark-text hover:border-cm-purple/40 transition-colors">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className="bg-cm-purple/15 rounded-lg p-2"><Coins size={16} className="text-cm-purple" /></div>
            <div>
              <div className="text-2xl font-bold text-dark-text">{formatCents(totalCreditBalance)}</div>
              <div className="text-xs text-dark-muted">Outstanding Credit</div>
            </div>
          </div>
          <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className="bg-cm-purple/15 rounded-lg p-2"><Clock size={16} className="text-cm-purple" /></div>
            <div>
              <div className="text-2xl font-bold text-dark-text">{totalHours.toFixed(1)}h</div>
              <div className="text-xs text-dark-muted">Hours Available</div>
            </div>
          </div>
          <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className="bg-cm-purple/15 rounded-lg p-2"><Gift size={16} className="text-cm-purple" /></div>
            <div>
              <div className="text-2xl font-bold text-dark-text">{pendingItems}</div>
              <div className="text-xs text-dark-muted">Pending Items</div>
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-xl p-4 text-dark-danger text-sm">
          Error: {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 text-cm-purple animate-spin" />
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left px-4 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">Participant</th>
                  <th className="text-left px-4 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">What You Get</th>
                  <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">Type</th>
                  <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide whitespace-nowrap">Per Month</th>
                  <th className="text-center px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">Balance</th>
                  <th className="text-right px-3 py-3 text-dark-muted font-medium text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deals.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-dark-muted">No active deals found.</td>
                  </tr>
                )}
                {deals.map((deal) => (
                  <DealRow key={deal.id} deal={deal} ledger={ledger} onRefresh={load} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
