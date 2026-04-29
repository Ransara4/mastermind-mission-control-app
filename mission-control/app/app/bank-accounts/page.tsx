"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Eye, EyeOff, ChevronDown, ChevronRight, Search, List, LayoutGrid } from "lucide-react";

interface Account {
  id: number;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number?: string;
  swift_code?: string;
  entity?: string;
  currency?: string;
  status?: string;
  account_type?: string;
  notes?: string;
}

interface PaymentMethod {
  id: number;
  method_name: string;
  identifier: string;
  notes?: string;
}

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [closedOpen, setClosedOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [grouped, setGrouped] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/bank-accounts");
      const data = await res.json();
      setAccounts(data.accounts || []);
      setPaymentMethods(data.paymentMethods || []);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleReveal = (id: number) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  };

  // Expand all groups on first switch to grouped view
  useEffect(() => {
    if (grouped) {
      const banks = [...new Set(accounts.filter(a => a.status !== "closed").map(a => a.bank_name || "Other"))];
      setExpandedGroups(new Set(banks));
    }
  }, [grouped, accounts]);

  const maskNumber = (num: string) => {
    if (!num || num.length <= 4) return num || "—";
    return "••••" + num.slice(-4);
  };

  const active = accounts.filter((a) => a.status !== "closed");
  const closed = accounts.filter((a) => a.status === "closed");

  const lf = filter.toLowerCase();
  const filteredActive = active.filter(
    (a) =>
      !filter ||
      a.bank_name?.toLowerCase().includes(lf) ||
      a.entity?.toLowerCase().includes(lf) ||
      a.account_name?.toLowerCase().includes(lf)
  );

  const bankGroups: Record<string, Account[]> = {};
  for (const a of filteredActive) {
    const key = a.bank_name || "Other";
    (bankGroups[key] ??= []).push(a);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-dark-muted" size={32} />
      </div>
    );
  }

  const renderAccountRow = (a: Account) => (
    <tr key={a.id} className="hover:bg-dark-panel2 transition-colors">
      <td className="px-4 py-3 text-sm font-medium text-dark-text">{a.bank_name}</td>
      <td className="px-4 py-3 text-sm text-dark-text">{a.account_name}</td>
      <td className="px-4 py-3 text-sm">
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
          a.account_type === "checking" ? "bg-cm-purple/10 text-cm-purple" :
          a.account_type === "savings" ? "bg-dark-success/10 text-dark-success" :
          "bg-dark-panel2 text-dark-muted"
        }`}>{a.account_type || "—"}</span>
      </td>
      <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-text">
        <div className="flex items-center gap-1.5">
          <span>{revealed.has(a.id) ? a.account_number : maskNumber(a.account_number)}</span>
          <button onClick={() => toggleReveal(a.id)} className="text-dark-muted hover:text-dark-text shrink-0">
            {revealed.has(a.id) ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
        </div>
      </td>
      <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-muted">{a.routing_number || "—"}</td>
      <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-muted">{a.swift_code || "—"}</td>
      <td className="px-4 py-3 text-sm text-dark-muted">{a.currency || "USD"}</td>
      <td className="px-4 py-3 text-sm text-dark-muted">{a.entity || "—"}</td>
      <td className="px-4 py-3 text-xs text-dark-muted max-w-[200px] truncate" title={a.notes || ""}>{a.notes || "—"}</td>
    </tr>
  );

  const tableHeader = (
    <thead>
      <tr className="border-b border-dark-border bg-dark-panel2/60">
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Bank</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Account</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Type</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Account #</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Routing</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">SWIFT</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Currency</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Entity</th>
        <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Notes</th>
      </tr>
    </thead>
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">Bank Accounts</h1>
          <p className="text-sm text-dark-muted mt-1">{active.length} active accounts</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-panel border border-dark-border rounded-lg overflow-hidden">
            <button
              onClick={() => setGrouped(false)}
              className={`p-2 transition-colors ${!grouped ? "bg-dark-panel2 text-dark-text" : "text-dark-muted hover:text-dark-text"}`}
              title="Table view"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => setGrouped(true)}
              className={`p-2 transition-colors ${grouped ? "bg-dark-panel2 text-dark-text" : "text-dark-muted hover:text-dark-text"}`}
              title="Group by bank"
            >
              <LayoutGrid size={16} />
            </button>
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
            <input
              type="text"
              placeholder="Filter by bank or entity..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-9 pr-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple text-dark-text placeholder:text-dark-muted w-64"
            />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredActive.length === 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm p-8 text-center text-dark-muted">
          {accounts.length === 0
            ? "No bank accounts found. The bank-accounts database may not be set up yet."
            : "No accounts match your filter."}
        </div>
      )}

      {/* Table view */}
      {filteredActive.length > 0 && !grouped && (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-x-auto">
          <table className="w-full min-w-[900px]">
            {tableHeader}
            <tbody className="divide-y divide-dark-border">
              {filteredActive.map(renderAccountRow)}
            </tbody>
          </table>
        </div>
      )}

      {/* Grouped view */}
      {filteredActive.length > 0 && grouped && (
        <div className="space-y-4">
          {Object.entries(bankGroups).sort(([a], [b]) => a.localeCompare(b)).map(([bank, accts]) => (
            <div key={bank} className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-hidden">
              <button
                onClick={() => toggleGroup(bank)}
                className="w-full flex items-center justify-between px-4 py-3 bg-dark-panel2/80 hover:bg-dark-panel2 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(bank) ? <ChevronDown size={16} className="text-dark-muted" /> : <ChevronRight size={16} className="text-dark-muted" />}
                  <span className="text-sm font-semibold text-dark-text">{bank}</span>
                  <span className="text-xs text-dark-muted">{accts.length} account{accts.length !== 1 ? "s" : ""}</span>
                </div>
              </button>
              {expandedGroups.has(bank) && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    {tableHeader}
                    <tbody className="divide-y divide-dark-border">
                      {accts.map(renderAccountRow)}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Methods */}
      {paymentMethods.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-dark-muted uppercase tracking-wider mb-3">Payment Methods</h2>
          <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border bg-dark-panel2/60">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Method</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Identifier</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {paymentMethods.map((pm) => (
                  <tr key={pm.id} className="hover:bg-dark-panel2 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-dark-text">{pm.method_name}</td>
                    <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-muted">{pm.identifier}</td>
                    <td className="px-4 py-3 text-sm text-dark-muted">{pm.notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Accounts */}
      {closed.length > 0 && (
        <div className="border-t border-dark-border pt-4">
          <button
            onClick={() => setClosedOpen(!closedOpen)}
            className="flex items-center gap-2 text-sm text-dark-muted hover:text-dark-text"
          >
            {closedOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            Closed Accounts ({closed.length})
          </button>
          {closedOpen && (
            <div className="mt-4 bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-x-auto opacity-60">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b border-dark-border bg-dark-panel2/60">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Bank</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Account</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Account #</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold text-dark-muted uppercase tracking-wider">Entity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {closed.map((a) => (
                    <tr key={a.id} className="hover:bg-dark-panel2 transition-colors">
                      <td className="px-4 py-3 text-sm text-dark-muted">{a.bank_name}</td>
                      <td className="px-4 py-3 text-sm text-dark-muted">{a.account_name}</td>
                      <td className="px-4 py-3 text-sm font-mono font-dm-mono text-dark-muted">{maskNumber(a.account_number)}</td>
                      <td className="px-4 py-3 text-sm text-dark-muted">{a.entity || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
