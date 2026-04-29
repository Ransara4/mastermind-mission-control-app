"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BookText,
  RefreshCw,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Users,
  Receipt,
  ClipboardList,
  CreditCard,
  Landmark,
  BarChart3,
} from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";

interface AgentStatus {
  agentId: string;
  status: string;
  lastRun: string;
  lastResult: string;
  lastMessage: string;
  errorCount: number;
  enabled: boolean;
}

interface ApiResponse {
  success: boolean;
  output: string;
  error?: string;
  status?: AgentStatus;
}

type TabId = "dashboard" | "invoices" | "contacts" | "expenses" | "bills" | "accounts" | "payments" | "bank";

const TABS: { id: TabId; label: string; icon: React.ElementType; cmd: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, cmd: "dashboard" },
  { id: "invoices", label: "Invoices", icon: FileText, cmd: "invoices list" },
  { id: "contacts", label: "Contacts", icon: Users, cmd: "contacts list" },
  { id: "expenses", label: "Expenses", icon: Receipt, cmd: "expenses list" },
  { id: "bills", label: "Bills", icon: ClipboardList, cmd: "bills list" },
  { id: "accounts", label: "Chart of Accounts", icon: Landmark, cmd: "accounts list" },
  { id: "payments", label: "Payments Received", icon: CreditCard, cmd: "payments received" },
  { id: "bank", label: "Bank Accounts", icon: Landmark, cmd: "bank accounts" },
];

export default function ZohoBooksPage() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [output, setOutput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [capsOpen, setCapsOpen] = useState(false);

  const runCommand = useCallback(async (cmd: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/zoho-books?cmd=${encodeURIComponent(cmd)}`);
      const data: ApiResponse = await res.json();
      if (data.success) {
        setOutput(data.output);
        if (data.status) setAgentStatus(data.status);
      } else {
        setError(data.error || "Unknown error");
        setOutput(data.output || "");
      }
    } catch (err) {
      setError("Failed to reach API");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const active = TABS.find((t) => t.id === tab);
    if (active) runCommand(active.cmd);
  }, [tab, runCommand]);

  const refresh = () => {
    const active = TABS.find((t) => t.id === tab);
    if (active) runCommand(active.cmd);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <ApiKeyBanner slug="zoho-books" />
      {/* Hero */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-dark-success/20 rounded-xl flex items-center justify-center">
              <BookText className="text-dark-success" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-dark-text font-bold tracking-tight">Zoho Books</h1>
              <p className="text-dark-muted">Accounting for Heliconia Cantik Ventures (IDR)</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {agentStatus && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                agentStatus.lastResult === "success"
                  ? "bg-dark-success/20 text-dark-success"
                  : agentStatus.lastResult === "error"
                  ? "bg-dark-danger/20 text-dark-danger"
                  : "bg-dark-panel2 text-dark-muted"
              }`}>
                {agentStatus.lastResult === "success" ? "Healthy" : agentStatus.lastResult === "error" ? "Error" : "Unknown"}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`text-dark-muted ${loading ? "animate-spin" : ""}`} size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        <div className="flex border-b border-dark-border overflow-x-auto">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  tab === t.id
                    ? "border-cm-purple text-cm-purple bg-cm-purple/10"
                    : "border-transparent text-dark-muted hover:text-dark-text hover:bg-dark-panel2"
                }`}
              >
                <Icon size={16} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
              <p className="text-dark-muted">Loading...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="text-dark-danger mb-4" size={32} />
              <h3 className="text-lg font-semibold text-dark-text mb-2">Error</h3>
              <p className="text-dark-muted mb-4 text-sm max-w-md text-center">{error}</p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <pre className="text-sm text-dark-text font-mono font-dm-mono whitespace-pre-wrap leading-relaxed bg-dark-panel2 rounded-lg p-4 max-h-[600px] overflow-y-auto">
              {output || "No data"}
            </pre>
          )}
        </div>
      </div>

      {/* Capabilities */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setCapsOpen(!capsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-panel2 transition-colors"
        >
          <h2 className="font-semibold text-dark-text font-semibold tracking-tight">Capabilities</h2>
          {capsOpen ? <ChevronDown size={18} className="text-dark-muted" /> : <ChevronRight size={18} className="text-dark-muted" />}
        </button>
        {capsOpen && (
          <div className="px-4 pb-4 space-y-3">
            {[
              { title: "Invoice Management", desc: "Create, list, and send invoices. Track overdue payments and receivables." },
              { title: "Contact Management", desc: "Manage customers and vendors. Search by name or email." },
              { title: "Expense Tracking", desc: "Log and categorize business expenses. Track unbilled vs invoiced." },
              { title: "Bill Management", desc: "Track vendor bills and payment status." },
              { title: "Chart of Accounts", desc: "View full account structure — assets, liabilities, income, expenses." },
              { title: "Payment Tracking", desc: "Monitor payments received from customers and payments made to vendors." },
              { title: "Bank Integration", desc: "View bank accounts and transactions synced with Zoho Books." },
              { title: "Dashboard", desc: "Full overview — invoice summary, overdue alerts, receivables total." },
            ].map((cap) => (
              <div key={cap.title} className="bg-dark-panel2 rounded-lg p-3">
                <h3 className="font-medium text-dark-text text-sm">{cap.title}</h3>
                <p className="text-dark-muted text-xs mt-1">{cap.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status */}
      {agentStatus && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <h2 className="font-semibold text-dark-text font-semibold tracking-tight mb-3">Agent Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-dark-muted">Status</p>
              <p className="font-medium text-dark-text capitalize">{agentStatus.status}</p>
            </div>
            <div>
              <p className="text-xs text-dark-muted">Last Run</p>
              <p className="font-medium text-dark-text">
                {new Date(agentStatus.lastRun).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-muted">Last Result</p>
              <p className={`font-medium capitalize ${
                agentStatus.lastResult === "success" ? "text-dark-success" : "text-dark-danger"
              }`}>
                {agentStatus.lastResult}
              </p>
            </div>
            <div>
              <p className="text-xs text-dark-muted">Message</p>
              <p className="font-medium text-dark-text text-sm">{agentStatus.lastMessage}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
