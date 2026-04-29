"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Database, RefreshCw, ExternalLink, FileSpreadsheet, CheckCircle,
  XCircle, Plus, Trash2, ChevronDown, ChevronUp, AlertCircle, Loader2,
  Pencil, Save, X as XIcon,
} from "lucide-react";

interface Store {
  id: number;
  domain: string;
  merchant_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  est_annual_revenue_usd: number | null;
  product_count: number | null;
  employee_count: number | null;
  whatsapp_signal: number;
  apps_installed: string[];
  disqualified: number;
  created_at: string;
}

interface Criteria {
  id: number;
  name: string;
  filters: {
    countries?: string[];
    revenue_min?: number;
    revenue_max?: number;
    require_whatsapp_app?: boolean;
    exclude_helpdesk_apps?: boolean;
  };
  enabled: number;
  created_at: string;
}

interface AgentStatus {
  agentId: string;
  status: string;
  lastRun: string | null;
  lastMessage: string;
  errorCount: number;
  hasApiKey: boolean;
  lastExport: { url: string; exportedAt: string; rows: number } | null;
}

interface IcpGroups {
  planAndFilters: string;
  coreIcp: string;
  whatsappMarkets: string;
}

const COUNTRY_OPTIONS = [
  { code: "ID", label: "Indonesia" }, { code: "BR", label: "Brazil" },
  { code: "IN", label: "India" }, { code: "ZA", label: "South Africa" },
  { code: "NG", label: "Nigeria" }, { code: "AE", label: "UAE" },
  { code: "SA", label: "Saudi Arabia" }, { code: "MY", label: "Malaysia" },
  { code: "PH", label: "Philippines" }, { code: "MX", label: "Mexico" },
  { code: "CO", label: "Colombia" }, { code: "PK", label: "Pakistan" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-dark-panel2 text-dark-muted",
    working: "bg-cm-purple/20 text-cm-purple",
    error: "bg-dark-danger/20 text-dark-danger",
    disabled: "bg-dark-panel2 text-dark-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || colors.idle}`}>
      {status === "working" && <Loader2 size={10} className="animate-spin" />}
      {status}
    </span>
  );
}

function MarkdownPanel({
  title,
  groupKey,
  content,
  onSave,
}: {
  title: string;
  groupKey: string;
  content: string;
  onSave: (groupKey: string, value: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content);
  const [saving, setSaving] = useState(false);

  // Sync draft when content changes from parent reload
  useEffect(() => { setDraft(content); }, [content]);

  async function handleSave() {
    setSaving(true);
    await onSave(groupKey, draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(content);
    setEditing(false);
  }

  return (
    <div className="border border-dark-border rounded-xl overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-bg hover:bg-dark-panel2 transition-colors">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 flex-1 text-left text-sm font-medium text-dark-text"
        >
          {open ? <ChevronUp size={14} className="text-dark-muted" /> : <ChevronDown size={14} className="text-dark-muted" />}
          {title}
        </button>
        <div className="flex items-center gap-1.5">
          {open && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-dark-panel2 hover:text-cm-purple hover:border-cm-purple/30 transition-colors"
            >
              <Pencil size={11} />
              Edit
            </button>
          )}
          {editing && (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-cm-purple border border-cm-purple rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                Save
              </button>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-dark-muted border border-dark-border rounded-lg hover:bg-dark-panel2 transition-colors"
              >
                <XIcon size={11} />
                Cancel
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      {open && (
        <div className="border-t border-dark-border">
          {editing ? (
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full font-mono font-dm-mono text-sm text-dark-text bg-dark-bg px-4 py-4 resize-y focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cm-purple min-h-[320px]"
              spellCheck={false}
            />
          ) : (
            <div className="px-5 py-4 prose prose-sm prose-invert max-w-none
              prose-headings:text-dark-text prose-headings:font-semibold
              prose-h2:text-base prose-h2:mt-4 prose-h2:mb-2
              prose-h3:text-sm prose-h3:mt-3 prose-h3:mb-1
              prose-p:text-dark-muted prose-p:leading-relaxed
              prose-li:text-dark-muted
              prose-strong:text-dark-text prose-strong:font-semibold
              prose-table:text-sm
              prose-th:text-left prose-th:font-semibold prose-th:text-dark-text
              prose-td:text-dark-muted
              prose-code:text-cm-purple prose-code:bg-cm-purple/10 prose-code:px-1 prose-code:rounded prose-code:text-xs
              prose-hr:border-dark-border">
              {content.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
              ) : (
                <p className="text-dark-muted italic text-sm">No content yet — click Edit to add.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function StoreLeadsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [criteria, setCriteria] = useState<Criteria[]>([]);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [icpGroups, setIcpGroups] = useState<IcpGroups>({ planAndFilters: "", coreIcp: "", whatsappMarkets: "" });
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Table filters
  const [filterCountry, setFilterCountry] = useState("");
  const [filterWhatsappOnly, setFilterWhatsappOnly] = useState(false);

  // Add criteria form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCountries, setNewCountries] = useState<string[]>([]);
  const [newRevenueMin, setNewRevenueMin] = useState("");
  const [newRevenueMax, setNewRevenueMax] = useState("");
  const [newRequireWA, setNewRequireWA] = useState(true);
  const [newExcludeHelpdesk, setNewExcludeHelpdesk] = useState(true);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, criteriaRes, storesRes, icpRes] = await Promise.all([
        fetch("/api/business1/store-leads?action=status"),
        fetch("/api/business1/store-leads?action=criteria"),
        fetch(`/api/business1/store-leads?action=stores${filterCountry ? `&country=${filterCountry}` : ""}${filterWhatsappOnly ? "&whatsapp_only=1" : ""}`),
        fetch("/api/business1/icp?file=shopify-store-owners"),
      ]);
      const [statusData, criteriaData, storesData, icpData] = await Promise.all([
        statusRes.json(), criteriaRes.json(), storesRes.json(), icpRes.json()
      ]);
      setAgentStatus(statusData);
      setCriteria(criteriaData.criteria || []);
      setStores(storesData.stores || []);
      if (icpData.groups) setIcpGroups(icpData.groups);
    } catch {
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [filterCountry, filterWhatsappOnly]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function handleIcpSave(groupKey: string, value: string) {
    const res = await fetch("/api/business1/icp?file=shopify-store-owners", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates: { [groupKey]: value } }),
    });
    if (res.ok) {
      setIcpGroups((prev) => ({ ...prev, [groupKey]: value }));
      showToast("Saved to ICP file");
    } else {
      showToast("Save failed");
    }
  }

  async function handleSync() {
    setSyncLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business1/store-leads?action=sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error || "Sync failed");
      } else {
        showToast("Sync complete");
        loadAll();
      }
    } catch {
      setError("Sync request failed");
    } finally {
      setSyncLoading(false);
    }
  }

  async function handleExport() {
    setExportLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/business1/store-leads?action=export-sheets", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
        showToast("Exported to Google Sheets");
        loadAll();
      } else {
        setError("Export failed — no sheet URL returned");
      }
    } catch {
      setError("Export request failed");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleAddCriteria() {
    if (!newName.trim()) return;
    const filters: Criteria["filters"] = {
      countries: newCountries.length > 0 ? newCountries : undefined,
      revenue_min: newRevenueMin ? parseInt(newRevenueMin) : undefined,
      revenue_max: newRevenueMax ? parseInt(newRevenueMax) : undefined,
      require_whatsapp_app: newRequireWA,
      exclude_helpdesk_apps: newExcludeHelpdesk,
    };
    const res = await fetch("/api/business1/store-leads?action=criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, filters })
    });
    if (res.ok) {
      setShowAddForm(false);
      setNewName(""); setNewCountries([]); setNewRevenueMin(""); setNewRevenueMax("");
      setNewRequireWA(true); setNewExcludeHelpdesk(true);
      loadAll();
      showToast("Criteria added");
    }
  }

  async function handleDeleteCriteria(id: number) {
    await fetch(`/api/business1/store-leads?action=criteria&id=${id}`, { method: "DELETE" });
    loadAll();
    showToast("Criteria deleted");
  }

  async function handleDisqualify(id: number) {
    await fetch(`/api/business1/store-leads?action=store&id=${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Manually disqualified" })
    });
    setStores(prev => prev.filter(s => s.id !== id));
    showToast("Store disqualified");
  }

  function formatRevenue(v: number | null) {
    if (!v) return "—";
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-dark-panel2 text-dark-text text-sm px-4 py-2 rounded-lg shadow-lg shadow-black/30">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Database size={24} className="text-cm-purple" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">Store Leads</h1>
            <p className="text-dark-muted text-sm">Shopify store sourcing via StoreLeads.app</p>
          </div>
          {agentStatus && <StatusBadge status={agentStatus.status} />}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {agentStatus?.lastExport?.url && (
            <a
              href={agentStatus.lastExport.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-dark-success/10 border border-dark-success/30 text-dark-success text-sm rounded-lg hover:bg-dark-success/20 transition-colors"
            >
              <FileSpreadsheet size={14} />
              View in Sheets
              <ExternalLink size={12} />
            </a>
          )}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-cm-purple text-white text-sm rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
          >
            {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
            Export to Sheets
          </button>
          <div className="relative group">
            <button
              onClick={agentStatus?.hasApiKey ? handleSync : undefined}
              disabled={syncLoading || !agentStatus?.hasApiKey}
              className="inline-flex items-center gap-2 px-3 py-2 bg-dark-panel2 text-dark-muted text-sm rounded-lg hover:bg-dark-panel2/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {syncLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Sync
            </button>
            {!agentStatus?.hasApiKey && (
              <div className="absolute bottom-full right-0 mb-1 px-2 py-1 bg-dark-panel2 text-dark-text text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                API key required — add STORELEADS_API_KEY to .env
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-dark-danger/10 border border-dark-danger/30 rounded-xl text-dark-danger text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-dark-danger/60 hover:text-dark-danger">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* API key notice */}
      {agentStatus && !agentStatus.hasApiKey && (
        <div className="p-4 bg-dark-warn/10 border border-dark-warn/30 rounded-xl text-dark-warn text-sm">
          <strong>API key not configured.</strong> Add <code className="bg-dark-warn/20 px-1 rounded">STORELEADS_API_KEY</code> to{" "}
          <code className="bg-dark-warn/20 px-1 rounded">~/.attache/workspace/.env</code> to enable syncing.
        </div>
      )}

      {/* Section 1 — Plan & Filters */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-dark-panel2 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold tracking-tight text-dark-text">Plan & Filters</span>
            <span className="text-xs text-dark-muted">{criteria.length} criteria</span>
          </div>
          {filtersOpen ? <ChevronUp size={16} className="text-dark-muted" /> : <ChevronDown size={16} className="text-dark-muted" />}
        </button>

        {filtersOpen && (
          <div className="px-5 pb-5 space-y-5 border-t border-dark-border">

            {/* ICP Markdown Panels */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-dark-text">ICP Document</p>
                <Link
                  href="/app/business1/icps/shopify-store-owners"
                  className="text-xs text-cm-purple hover:underline"
                >
                  View full ICP page →
                </Link>
              </div>

              <MarkdownPanel
                title="Plan & Filters"
                groupKey="planAndFilters"
                content={icpGroups.planAndFilters}
                onSave={handleIcpSave}
              />
              <MarkdownPanel
                title="Core ICP"
                groupKey="coreIcp"
                content={icpGroups.coreIcp}
                onSave={handleIcpSave}
              />
              <MarkdownPanel
                title="WhatsApp Markets"
                groupKey="whatsappMarkets"
                content={icpGroups.whatsappMarkets}
                onSave={handleIcpSave}
              />
            </div>

            {/* Search Criteria */}
            <div className="flex items-center justify-between pt-1">
              <p className="text-sm font-medium text-dark-text">Search Criteria</p>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white text-xs rounded-lg hover:bg-cm-purple/80 transition-colors"
              >
                <Plus size={12} />
                Add Criteria
              </button>
            </div>

            {/* Criteria list */}
            <div className="space-y-2">
              {criteria.map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 bg-dark-bg rounded-lg text-sm">
                  <div className="flex-1">
                    <p className="font-medium text-dark-text">{c.name}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {c.filters.countries?.map(cc => (
                        <span key={cc} className="px-2 py-0.5 bg-cm-purple/20 text-cm-purple rounded-full text-xs">{cc}</span>
                      ))}
                      {(c.filters.revenue_min || c.filters.revenue_max) && (
                        <span className="px-2 py-0.5 bg-cm-purple/20 text-cm-purple rounded-full text-xs">
                          ${((c.filters.revenue_min || 0) / 1000).toFixed(0)}K – ${((c.filters.revenue_max || 0) / 1000).toFixed(0)}K
                        </span>
                      )}
                      {c.filters.require_whatsapp_app && (
                        <span className="px-2 py-0.5 bg-dark-success/20 text-dark-success rounded-full text-xs">Requires WhatsApp app</span>
                      )}
                      {c.filters.exclude_helpdesk_apps && (
                        <span className="px-2 py-0.5 bg-orange-500/20 text-orange-300 rounded-full text-xs">Exclude helpdesk</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteCriteria(c.id)}
                    className="p-1 text-dark-muted hover:text-dark-danger transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {criteria.length === 0 && (
                <p className="text-sm text-dark-muted italic">No criteria yet — add one above.</p>
              )}
            </div>

            {/* Add criteria form */}
            {showAddForm && (
              <div className="p-4 border border-cm-purple/30 bg-cm-purple/10 rounded-xl space-y-3 text-sm">
                <p className="font-medium text-cm-purple">New Search Criteria</p>
                <input
                  type="text"
                  placeholder="Criteria name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                />
                <div>
                  <p className="text-xs text-dark-muted mb-1.5">Countries</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COUNTRY_OPTIONS.map(c => (
                      <button
                        key={c.code}
                        onClick={() => setNewCountries(prev =>
                          prev.includes(c.code) ? prev.filter(x => x !== c.code) : [...prev, c.code]
                        )}
                        className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
                          newCountries.includes(c.code)
                            ? "bg-cm-purple text-white border-cm-purple"
                            : "bg-dark-panel2 text-dark-muted border-dark-border hover:border-cm-purple/50"
                        }`}
                      >
                        {c.code}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-dark-muted mb-1">Revenue Min (USD)</p>
                    <input
                      type="number"
                      placeholder="50000"
                      value={newRevenueMin}
                      onChange={e => setNewRevenueMin(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-dark-muted mb-1">Revenue Max (USD)</p>
                    <input
                      type="number"
                      placeholder="2000000"
                      value={newRevenueMax}
                      onChange={e => setNewRevenueMax(e.target.value)}
                      className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRequireWA}
                      onChange={e => setNewRequireWA(e.target.checked)}
                      className="rounded text-cm-purple"
                    />
                    <span className="text-xs text-dark-text">Require WhatsApp app</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newExcludeHelpdesk}
                      onChange={e => setNewExcludeHelpdesk(e.target.checked)}
                      className="rounded text-cm-purple"
                    />
                    <span className="text-xs text-dark-text">Exclude helpdesk apps</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCriteria}
                    className="px-4 py-2 bg-cm-purple text-white text-xs rounded-lg hover:bg-cm-purple/80 transition-colors"
                  >
                    Save Criteria
                  </button>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-muted text-xs rounded-lg hover:bg-dark-bg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 2 — Leads Table */}
      <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
          <div className="flex items-center gap-3">
            <span className="font-semibold tracking-tight text-dark-text">Leads</span>
            <span className="text-xs text-dark-muted">{stores.length} stores</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterCountry}
              onChange={e => setFilterCountry(e.target.value)}
              className="text-xs border border-dark-border rounded-lg px-2 py-1.5 text-dark-muted bg-dark-panel2 focus:outline-none focus:ring-2 focus:ring-cm-purple"
            >
              <option value="">All countries</option>
              {COUNTRY_OPTIONS.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-dark-muted cursor-pointer">
              <input
                type="checkbox"
                checked={filterWhatsappOnly}
                onChange={e => setFilterWhatsappOnly(e.target.checked)}
                className="rounded text-cm-purple"
              />
              WhatsApp only
            </label>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-dark-muted">
            <Loader2 size={20} className="animate-spin mr-2" />
            Loading…
          </div>
        ) : stores.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Database size={32} className="mx-auto text-dark-muted" />
            <p className="text-dark-muted text-sm font-medium">No stores synced yet</p>
            <p className="text-dark-muted text-xs">Add your API key and run Sync to start pulling leads</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-bg border-b border-dark-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Domain</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Est. Revenue</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Products</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">WA Signal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-dark-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {stores.map(store => (
                  <tr key={store.id} className="hover:bg-dark-panel2 transition-colors">
                    <td className="px-4 py-3">
                      <a
                        href={`https://${store.domain}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cm-purple hover:underline flex items-center gap-1"
                      >
                        {store.domain}
                        <ExternalLink size={10} className="text-cm-purple/60" />
                      </a>
                      {store.merchant_name && (
                        <p className="text-xs text-dark-muted">{store.merchant_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dark-muted text-xs">{store.email || <span className="text-dark-muted/50">—</span>}</td>
                    <td className="px-4 py-3">
                      {store.country ? (
                        <span className="px-2 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs font-medium">{store.country}</span>
                      ) : <span className="text-dark-muted/50">—</span>}
                    </td>
                    <td className="px-4 py-3 text-dark-text font-medium text-sm">{formatRevenue(store.est_annual_revenue_usd)}</td>
                    <td className="px-4 py-3 text-dark-muted">{store.product_count ?? <span className="text-dark-muted/50">—</span>}</td>
                    <td className="px-4 py-3">
                      {store.whatsapp_signal ? (
                        <CheckCircle size={16} className="text-dark-success" />
                      ) : (
                        <span className="text-dark-muted/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDisqualify(store.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-dark-muted border border-dark-border rounded hover:bg-dark-danger/10 hover:text-dark-danger hover:border-dark-danger/30 transition-colors"
                      >
                        <XCircle size={11} />
                        Disqualify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Last sync info */}
      {agentStatus?.lastRun && (
        <p className="text-xs text-dark-muted">
          Last sync: {new Date(agentStatus.lastRun).toLocaleString()} · {agentStatus.lastMessage}
        </p>
      )}
    </div>
  );
}
