"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FileSpreadsheet,
  Play,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Settings,
  BookOpen,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  MessageSquare,
  Flag,
  Zap,
  ChevronDown,
  ChevronRight,
  HelpCircle,
  FolderInput,
  Upload,
  Download,
  FileUp,
  Trash2,
  Table,
  Plus,
} from "lucide-react";

interface RunEntry {
  id?: string;
  date?: string;
  timestamp?: string;
  file?: string;
  filename?: string;
  files?: string[];
  transactions: number;
  flagged: number;
  highConfidence?: number;
  slackEnhanced?: number;
  status: string;
  sheetUrl: string | null;
  csvPath?: string;
  suffixRange?: string;
  totalDebit?: number;
  totalCredit?: number;
  approvalRequired?: boolean;
  approvalStatus?: string;
  period?: string;
  dateRange?: string;
}

interface SheetMapEntry {
  spreadsheetId: string;
  spreadsheetUrl: string;
  lastUpdated: string;
  runCount: number;
}

interface CoaEntry {
  accountId: string;
  accountName: string;
  accountCode: string;
  description: string;
  accountType: string;
  currency: string;
}

interface PageData {
  status: {
    agentId: string;
    status: string;
    lastRun: string | null;
    lastResult: string | null;
    lastMessage: string;
    errorCount: number;
    enabled: boolean;
  };
  runs: RunEntry[];
  config: {
    testMode?: boolean;
    approval: { enabled: boolean; approver: { firstName: string; email: string; whatsapp: string } };
    slackEnrichment: { enabled: boolean };
    journal: { currency: string; bankAccount: string; referencePrefix: string };
    accountingSoftware?: string;
    integrations?: Record<string, Record<string, string>>;
    contacts?: Record<string, { firstName: string; email: string; additionalEmails?: string[]; whatsapp: string; waAlias?: string; roles: string[] }>;
    thresholds?: { manualReviewAmount?: number };
    [key: string]: unknown;
  };
  rules: { version: number; count: number };
  state: { processedFiles: Record<string, unknown>; lastSuffix: number };
  coaCount: number;
  coaEntries?: CoaEntry[];
  sheetMap: Record<string, SheetMapEntry>;
  referencePaths: Record<string, { label: string; path: string; exists: boolean }>;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "--";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return "--";
  }
}

function formatCurrency(amount: number | undefined, currency = "USD"): string {
  if (!amount) return "--";
  const locale = currency === "IDR" ? "id-ID" : "en-US";
  const digits = currency === "IDR" ? 0 : 2;
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: digits }).format(amount);
}

const ACCOUNTING_SOFTWARE_OPTIONS = [
  { value: "zoho", label: "Zoho Books" },
  { value: "quickbooks", label: "QuickBooks Online" },
  { value: "xero", label: "Xero" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    idle: "bg-dark-panel2 text-dark-muted",
    running: "bg-cm-purple/20 text-cm-purple",
    success: "bg-dark-success/20 text-dark-success",
    preflight_ok: "bg-dark-success/20 text-dark-success",
    error: "bg-dark-danger/20 text-dark-danger",
    needs_review: "bg-dark-warn/20 text-dark-warn",
    unknown: "bg-dark-panel2 text-dark-muted",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${colors[status] || colors.unknown}`}>
      {status === "running" && <Loader2 size={12} className="animate-spin" />}
      {(status === "success" || status === "preflight_ok") && <CheckCircle2 size={12} />}
      {status === "error" && <XCircle size={12} />}
      {status === "needs_review" && <AlertTriangle size={12} />}
      {status.replace(/_/g, " ")}
    </span>
  );
}

function RunStatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string }> = {
    success: { bg: "bg-dark-success/20", text: "text-dark-success" },
    warnings: { bg: "bg-dark-warn/20", text: "text-dark-warn" },
    needs_review: { bg: "bg-dark-warn/20", text: "text-dark-warn" },
    error: { bg: "bg-dark-danger/20", text: "text-dark-danger" },
  };
  const c = config[status] || config.error;
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (val: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cm-purple focus:ring-offset-2 ${checked ? "bg-cm-purple" : "bg-dark-panel2"}`}
      >
        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-dark-panel shadow ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"}`} />
      </button>
      <span className="text-sm font-medium text-dark-text">{label}</span>
    </label>
  );
}

export default function BookkeepingPage() {
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);
  const [, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workflowOpen, setWorkflowOpen] = useState(false);
  const [importingRunId, setImportingRunId] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<Record<string, string>>({});
  const [importSoftware, setImportSoftware] = useState("zoho");
  const [sectionImporting, setSectionImporting] = useState(false);
  const [sectionImportResult, setSectionImportResult] = useState<string | null>(null);
  const [coaMatch, setCoaMatch] = useState<{account: string; debit: number; credit: number; count: number}[] | null>(null);
  const [coaMatchRunId, setCoaMatchRunId] = useState<string | null>(null);
  const [coaMatchLoading, setCoaMatchLoading] = useState(false);
  const [coaMatchOpen, setCoaMatchOpen] = useState(false);
  const [preparedCSV, setPreparedCSV] = useState<string | null>(null);
  const [preparedSoftware, setPreparedSoftware] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepareError, setPrepareError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "coa">("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [coaTab, setCoaTab] = useState<"current" | "custom">("current");
  const [customCoaFile, setCustomCoaFile] = useState<File | null>(null);
  const [coaUploading, setCoaUploading] = useState(false);
  const [coaUploadResult, setCoaUploadResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coaInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/bookkeeping");
      if (!res.ok) throw new Error("Failed to load data");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function triggerRun() {
    setRunLoading(true);
    setRunResult(null);
    try {
      const res = await fetch("/api/bookkeeping", { method: "POST" });
      const body = await res.json();
      if (body.success) {
        setRunResult("Run completed successfully");
        fetchData();
      } else {
        setRunResult(`Error: ${body.error}`);
      }
    } catch (err) {
      setRunResult(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setRunLoading(false);
    }
  }

  async function toggleTestMode() {
    setToggling(true);
    try {
      const res = await fetch("/api/bookkeeping?cmd=toggle-test");
      const result = await res.json();
      if (result.success && data) {
        setData({ ...data, config: { ...data.config, testMode: result.testMode } });
      }
    } catch {
      setError("Failed to toggle test mode");
    } finally {
      setToggling(false);
    }
  }

  async function updateConfig(updates: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/bookkeeping", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update config");
      await fetchData();
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  }

  async function openDownloadsFolder() {
    await fetch("/api/bookkeeping?cmd=open-downloads");
  }

  async function loadCoaMatch(runId: string) {
    if (coaMatchRunId === runId && coaMatch) { setCoaMatchOpen(true); return; }
    setCoaMatchLoading(true);
    setCoaMatchOpen(true);
    try {
      const res = await fetch(`/api/bookkeeping?cmd=coa-match&runId=${encodeURIComponent(runId)}`);
      const body = await res.json();
      if (body.success) { setCoaMatch(body.accounts); setCoaMatchRunId(runId); }
    } finally {
      setCoaMatchLoading(false);
    }
  }

  async function prepareForAccounting() {
    const latestRun = data?.runs.find((r: RunEntry) => r.status === "success");
    if (!latestRun) return;
    const runId = latestRun.id || "0";
    setPreparing(true);
    setPrepareError(null);
    setPreparedCSV(null);
    setPreparedSoftware(null);
    try {
      const res = await fetch("/api/bookkeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export-csv", runId, software: importSoftware }),
      });
      const body = await res.json();
      if (body.success && body.csv) {
        setPreparedCSV(body.csv);
        setPreparedSoftware(importSoftware);
      } else {
        setPrepareError(body.error || "Preparation failed");
      }
    } catch (err) {
      setPrepareError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPreparing(false);
    }
  }

  async function importSectionRun() {
    const latestRun = data?.runs.find((r: RunEntry) => r.status === "success");
    if (!latestRun) return;
    const runId = latestRun.id || "0";
    const softwareLabel = ACCOUNTING_SOFTWARE_OPTIONS.find(o => o.value === importSoftware)?.label || importSoftware;
    setSectionImporting(true);
    setSectionImportResult(null);
    try {
      const res = await fetch("/api/bookkeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", runId, software: importSoftware }),
      });
      const body = await res.json();
      setSectionImportResult(body.success ? `Imported to ${softwareLabel}` : `Error: ${body.error || body.message}`);
    } catch (err) {
      setSectionImportResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setSectionImporting(false);
    }
  }

  async function importToAccounting(runId: string) {
    const software = data?.config?.accountingSoftware;
    if (!software) return;
    setImportingRunId(runId);
    try {
      const res = await fetch("/api/bookkeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", runId, software }),
      });
      const body = await res.json();
      setImportResult(prev => ({ ...prev, [runId]: body.success ? `Imported to ${software}` : `Error: ${body.error || body.message}` }));
    } catch (err) {
      setImportResult(prev => ({ ...prev, [runId]: `Error: ${err instanceof Error ? err.message : "Unknown"}` }));
    } finally {
      setImportingRunId(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith(".pdf") || f.name.endsWith(".csv") || f.name.endsWith(".xlsx")
    );
    if (files.length > 0) setUploadedFiles(prev => [...prev, ...files]);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).filter(f =>
      f.name.endsWith(".pdf") || f.name.endsWith(".csv") || f.name.endsWith(".xlsx")
    );
    if (files.length > 0) setUploadedFiles(prev => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeFile(index: number) {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }

  async function processUploadedFiles() {
    if (uploadedFiles.length === 0) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      uploadedFiles.forEach(f => formData.append("files", f));
      const res = await fetch("/api/bookkeeping", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (body.success) {
        setUploadResult(`Processed ${uploadedFiles.length} file(s) successfully`);
        setUploadedFiles([]);
        fetchData();
      } else {
        setUploadResult(`Error: ${body.error}`);
      }
    } catch (err) {
      setUploadResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setUploading(false);
    }
  }

  async function uploadCustomCoa() {
    if (!customCoaFile) return;
    setCoaUploading(true);
    setCoaUploadResult(null);
    try {
      const text = await customCoaFile.text();
      const res = await fetch("/api/bookkeeping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload-coa", content: text }),
      });
      const body = await res.json();
      if (body.success) {
        setCoaUploadResult(`Chart of accounts updated (${body.count} accounts)`);
        setCustomCoaFile(null);
        await fetchData();
        setCoaTab("current");
      } else {
        setCoaUploadResult(`Error: ${body.error}`);
      }
    } catch (err) {
      setCoaUploadResult(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
    } finally {
      setCoaUploading(false);
    }
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Bookkeeping...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">Failed to load data</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const isTestMode = data.config.testMode ?? true;
  const approval = data.config.approval || { enabled: false, approver: { firstName: "", email: "", whatsapp: "" } };
  const slackEnrichment = data.config.slackEnrichment || { enabled: false };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cm-purple/15 rounded-xl">
            <FileSpreadsheet size={28} className="text-cm-purple" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-dark-text">Bookkeeping</h1>
            <p className="text-dark-muted mt-0.5 text-sm">Drop bank statements, classify transactions, import to your accounting software</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={data.status.lastResult || data.status.status} />
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2 text-dark-muted hover:text-dark-muted hover:bg-dark-panel2 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>
      </div>

      {/* Accounting Software Selector */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
          <Upload size={18} className="text-cm-purple" />
          Accounting Software
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={data.config.accountingSoftware || "zoho"}
            onChange={(e) => updateConfig({ accountingSoftware: e.target.value })}
            className="bg-dark-panel2 border border-dark-border text-dark-text rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple"
          >
            {ACCOUNTING_SOFTWARE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <span className="text-xs text-dark-muted">
            Configure API credentials in <code className="bg-dark-panel2 px-1 rounded">config/config.json</code> under <code className="bg-dark-panel2 px-1 rounded">integrations.{data.config.accountingSoftware || "zoho"}</code>
          </span>
        </div>
        <div className="mt-3 flex gap-3">
          <a
            href={`/api/bookkeeping?cmd=example&software=${data.config.accountingSoftware || "zoho"}`}
            className="flex items-center gap-2 text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
          >
            <Download size={14} />
            Download example {ACCOUNTING_SOFTWARE_OPTIONS.find(o => o.value === (data.config.accountingSoftware || "zoho"))?.label} output
          </a>
        </div>
      </div>

      {/* Step 1 label */}
      <div className="flex items-center gap-3">
        <span className="w-7 h-7 bg-cm-purple text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">1</span>
        <h2 className="font-semibold text-dark-text">Import Bank Statements</h2>
      </div>

      {/* Tab Switcher: Upload / Chart of Accounts */}
      <div className="flex gap-1 bg-dark-panel2 rounded-lg p-1">
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "upload" ? "bg-dark-panel text-dark-text shadow-sm" : "text-dark-muted hover:text-dark-text"
          }`}
        >
          <FileUp size={16} />
          Upload Statements
        </button>
        <button
          onClick={() => setActiveTab("coa")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${
            activeTab === "coa" ? "bg-dark-panel text-dark-text shadow-sm" : "text-dark-muted hover:text-dark-text"
          }`}
        >
          <Table size={16} />
          Chart of Accounts
          <span className="text-[10px] bg-dark-panel2 text-dark-muted px-1.5 py-0.5 rounded-full">{data.coaCount}</span>
        </button>
      </div>

      {/* Upload Tab */}
      {activeTab === "upload" && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6 space-y-4">
          {/* Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-cm-purple bg-cm-purple/10"
                : "border-dark-border hover:border-cm-purple/50 hover:bg-dark-panel2"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.csv,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <FileUp size={36} className={`mx-auto mb-3 ${dragOver ? "text-cm-purple" : "text-dark-muted"}`} />
            <p className="text-sm font-medium text-dark-text mb-1">
              {dragOver ? "Drop files here" : "Drag & drop bank statements here"}
            </p>
            <p className="text-xs text-dark-muted">
              PDF, CSV, or XLSX files. Click to browse.
            </p>
          </div>

          {/* Queued Files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-dark-muted uppercase tracking-wider">Queued Files</h4>
              {uploadedFiles.map((file, i) => (
                <div key={`${file.name}-${i}`} className="flex items-center justify-between bg-dark-panel2 rounded-lg px-4 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileSpreadsheet size={16} className="text-cm-purple shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-dark-text truncate">{file.name}</p>
                      <p className="text-[11px] text-dark-muted">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="p-1.5 text-dark-muted hover:text-dark-danger transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={processUploadedFiles}
                  disabled={uploading}
                  className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50 text-sm font-medium"
                >
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {uploading ? "Processing..." : `Process ${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""}`}
                </button>
                <button
                  onClick={() => setUploadedFiles([])}
                  className="text-xs text-dark-muted hover:text-dark-text transition-colors"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Upload/Run result */}
          {(uploadResult || runResult) && (
            <div className={`p-3 rounded-lg text-sm ${
              (uploadResult || runResult || "").startsWith("Error")
                ? "bg-dark-danger/10 text-dark-danger border border-dark-danger/30"
                : "bg-dark-success/10 text-dark-success border border-dark-success/30"
            }`}>
              {uploadResult || runResult}
            </div>
          )}

          {/* Quick Run (for files already in downloads folder) */}
          <div className="pt-2 border-t border-dark-border">
            <div className="flex items-center justify-between">
              <p className="text-xs text-dark-muted">
                Or process files already in{" "}
                <button
                  onClick={openDownloadsFolder}
                  className="bg-dark-panel2 px-1 rounded font-mono text-cm-purple hover:text-cm-purple/80 transition-colors underline underline-offset-2"
                  title="Open Data Downloads folder in Finder"
                >
                  Data Downloads
                </button>
              </p>
              <button
                onClick={triggerRun}
                disabled={runLoading}
                className="flex items-center gap-2 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2/80 transition-colors disabled:opacity-50 text-xs"
              >
                {runLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                {runLoading ? "Running..." : "Run"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart of Accounts Tab */}
      {activeTab === "coa" && (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          {/* COA Sub-tabs */}
          <div className="flex border-b border-dark-border">
            <button
              onClick={() => setCoaTab("current")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                coaTab === "current" ? "text-cm-purple border-b-2 border-cm-purple" : "text-dark-muted hover:text-dark-text"
              }`}
            >
              Current Chart ({data.coaCount} accounts)
            </button>
            <button
              onClick={() => setCoaTab("custom")}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                coaTab === "custom" ? "text-cm-purple border-b-2 border-cm-purple" : "text-dark-muted hover:text-dark-text"
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                <Plus size={14} />
                Upload Custom
              </span>
            </button>
          </div>

          {coaTab === "current" && (
            <div className="p-4 space-y-4">
              {/* Upload success banner */}
              {coaUploadResult && !coaUploadResult.startsWith("Error") && (
                <div className="p-3 rounded-lg text-sm bg-dark-success/10 text-dark-success border border-dark-success/30 flex items-center justify-between">
                  <span>{coaUploadResult}</span>
                  <button onClick={() => setCoaUploadResult(null)} className="text-dark-success/60 hover:text-dark-success ml-2">x</button>
                </div>
              )}
              {/* Download links */}
              <div className="flex items-center gap-4">
                <a
                  href="/api/bookkeeping?cmd=download-coa"
                  className="flex items-center gap-2 text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
                >
                  <Download size={14} />
                  Download current chart
                </a>
                <a
                  href="/api/bookkeeping?cmd=download-sample-coa"
                  className="flex items-center gap-2 text-xs text-dark-muted hover:text-dark-text transition-colors"
                >
                  <Download size={14} />
                  Download sample chart
                </a>
              </div>

              {/* COA Table */}
              {data.coaEntries && data.coaEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-dark-panel2 text-left">
                        <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Code</th>
                        <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Account Name</th>
                        <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Type</th>
                        <th className="py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">Currency</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-border">
                      {data.coaEntries.map((account, i) => (
                        <tr key={account.accountCode || i} className="hover:bg-dark-panel2 transition-colors">
                          <td className="py-2 px-3 font-mono text-xs text-cm-purple">{account.accountCode}</td>
                          <td className="py-2 px-3 text-dark-text">{account.accountName}</td>
                          <td className="py-2 px-3">
                            <span className="text-xs bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded-full">{account.accountType}</span>
                          </td>
                          <td className="py-2 px-3 text-dark-muted text-xs">{account.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Table size={28} className="text-dark-muted mx-auto mb-2" />
                  <p className="text-sm text-dark-muted">
                    {data.coaCount > 0
                      ? `${data.coaCount} accounts loaded. Reload to view details.`
                      : "No chart of accounts loaded."}
                  </p>
                </div>
              )}
            </div>
          )}

          {coaTab === "custom" && (
            <div className="p-6 space-y-4">
              <p className="text-sm text-dark-muted">
                Upload a custom chart of accounts CSV to replace the current one. The CSV must have columns: <code className="bg-dark-panel2 px-1 rounded text-xs">Account ID, Account Name, Account Code, Description, Account Type, Currency</code>
              </p>

              <div className="flex items-center gap-4">
                <button
                  onClick={() => coaInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-text rounded-lg hover:bg-dark-panel2/80 transition-colors text-sm"
                >
                  <FileUp size={16} />
                  Choose CSV file
                </button>
                <input
                  ref={coaInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setCustomCoaFile(file);
                    if (coaInputRef.current) coaInputRef.current.value = "";
                  }}
                  className="hidden"
                />
                {customCoaFile && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-dark-text">{customCoaFile.name}</span>
                    <span className="text-xs text-dark-muted">({(customCoaFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      onClick={uploadCustomCoa}
                      disabled={coaUploading}
                      className="flex items-center gap-2 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm disabled:opacity-50"
                    >
                      {coaUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                      {coaUploading ? "Uploading..." : "Load"}
                    </button>
                  </div>
                )}
              </div>

              {coaUploadResult && (
                <div className={`p-3 rounded-lg text-sm ${
                  coaUploadResult.startsWith("Error")
                    ? "bg-dark-danger/10 text-dark-danger border border-dark-danger/30"
                    : "bg-dark-success/10 text-dark-success border border-dark-success/30"
                }`}>
                  {coaUploadResult}
                </div>
              )}

              <div className="pt-4 border-t border-dark-border">
                <h4 className="text-xs font-medium text-dark-muted uppercase tracking-wider mb-2">Sample Chart of Accounts</h4>
                <p className="text-xs text-dark-muted mb-3">
                  Don&apos;t have a chart of accounts? Download our sample with 31 standard small-business accounts (USD) and customize it.
                </p>
                <a
                  href="/api/bookkeeping?cmd=download-sample-coa"
                  className="flex items-center gap-2 text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
                >
                  <Download size={14} />
                  Download sample chart of accounts
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Match the Chart of Accounts */}
      {data.runs.some((r: RunEntry) => r.status === "success") && (() => {
        const latestRun = data.runs.find((r: RunEntry) => r.status === "success");
        const runId = latestRun?.id || "";
        return (
          <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
            <button
              onClick={() => coaMatchOpen && coaMatchRunId === runId ? setCoaMatchOpen(false) : loadCoaMatch(runId)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-dark-panel2 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Table size={18} className="text-cm-purple" />
                <span className="font-semibold text-dark-text">Match the Chart of Accounts</span>
                {latestRun?.period && (
                  <span className="text-xs text-dark-muted font-normal ml-1">{latestRun.period}</span>
                )}
              </div>
              {coaMatchLoading
                ? <Loader2 size={16} className="animate-spin text-cm-purple" />
                : coaMatchOpen && coaMatchRunId === runId
                  ? <ChevronDown size={18} className="text-dark-muted" />
                  : <ChevronRight size={18} className="text-dark-muted" />
              }
            </button>
            {coaMatchOpen && coaMatchRunId === runId && !coaMatchLoading && coaMatch && (
              <div className="border-t border-dark-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-dark-panel2 text-left">
                      <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Account</th>
                      <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Lines</th>
                      <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Debit</th>
                      <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {coaMatch.map(row => (
                      <tr key={row.account} className="hover:bg-dark-panel2 transition-colors">
                        <td className="py-2 px-4 text-dark-text font-medium">{row.account}</td>
                        <td className="py-2 px-4 text-dark-muted text-right">{row.count}</td>
                        <td className="py-2 px-4 text-dark-text text-right font-mono">{row.debit > 0 ? row.debit.toLocaleString(undefined, {maximumFractionDigits: 0}) : "—"}</td>
                        <td className="py-2 px-4 text-dark-text text-right font-mono">{row.credit > 0 ? row.credit.toLocaleString(undefined, {maximumFractionDigits: 0}) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* Active Sheets */}
      {Object.keys(data.sheetMap).length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <div className="px-6 py-4 border-b border-dark-border">
            <h3 className="font-semibold text-dark-text flex items-center gap-2">
              <FileSpreadsheet size={18} className="text-cm-purple" />
              Active Sheets
            </h3>
          </div>
          <div className="divide-y divide-dark-border">
            {Object.entries(data.sheetMap).map(([key, sheet]) => (
              <div key={key} className="px-6 py-4 flex items-center justify-between hover:bg-dark-panel2 transition-colors">
                <div>
                  <p className="text-sm font-medium text-dark-text">{key}</p>
                  <p className="text-xs text-dark-muted mt-0.5">
                    Updated {formatDate(sheet.lastUpdated)} &middot; {sheet.runCount} run{sheet.runCount !== 1 ? "s" : ""}
                  </p>
                </div>
                <a
                  href={sheet.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-cm-purple/10 text-cm-purple rounded-lg text-sm font-medium hover:bg-cm-purple/20 transition-colors"
                >
                  <ExternalLink size={14} />
                  Open Sheet
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Prepare for Accounting Software */}
      {data.runs.some((r: RunEntry) => r.status === "success") && (() => {
        const latestRun = data.runs.find((r: RunEntry) => r.status === "success");
        const softwareLabel = ACCOUNTING_SOFTWARE_OPTIONS.find(o => o.value === importSoftware)?.label || importSoftware;
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 bg-cm-purple text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">2</span>
              <h2 className="font-semibold text-dark-text">Prepare for {softwareLabel}</h2>
            </div>
            <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-dark-muted">
                    Formats the most recent run for {softwareLabel} journal import.
                  </p>
                  <p className="text-xs text-dark-muted mt-1">
                    Run: {latestRun?.period || latestRun?.filename || "latest"} &middot; {latestRun?.transactions} transactions
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={importSoftware}
                    onChange={(e) => { setImportSoftware(e.target.value); setPreparedCSV(null); setPreparedSoftware(null); setPrepareError(null); }}
                    className="bg-dark-panel2 border border-dark-border text-dark-text text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-cm-purple"
                  >
                    {ACCOUNTING_SOFTWARE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <button
                    onClick={prepareForAccounting}
                    disabled={preparing}
                    className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg text-sm font-medium hover:bg-cm-purple/80 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {preparing ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
                    {preparing ? "Preparing..." : `Prepare for ${softwareLabel}`}
                  </button>
                </div>
              </div>
              {prepareError && (
                <p className="mt-3 text-sm text-dark-danger">{prepareError}</p>
              )}
              {preparedCSV && preparedSoftware === importSoftware && (
                <div className="mt-3 flex items-center gap-2 text-sm text-dark-success">
                  <CheckCircle2 size={16} />
                  Ready — {preparedCSV.split("\n").filter(l => l.trim()).length - 1} formatted entries for {softwareLabel}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Step 3: View the Preparation */}
      {preparedCSV && (() => {
        const softwareLabel = ACCOUNTING_SOFTWARE_OPTIONS.find(o => o.value === preparedSoftware)?.label || preparedSoftware;
        const lines = preparedCSV.split("\n").filter(l => l.trim());
        const headers = lines[0]?.split(",").map(h => h.trim()) || [];
        const rows = lines.slice(1).map(line => {
          const cols = line.split(",").map(c => c.trim().replace(/^"|"$/g, ""));
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = cols[i] || ""; });
          return row;
        });
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 bg-cm-purple text-white text-xs font-bold rounded-full flex items-center justify-center shrink-0">3</span>
                <h2 className="font-semibold text-dark-text">View the Preparation</h2>
                <span className="text-xs text-dark-muted font-normal">{rows.length} entries for {softwareLabel}</span>
              </div>
              <a
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(preparedCSV)}`}
                download={`prepared-${preparedSoftware}-${Date.now()}.csv`}
                className="flex items-center gap-2 text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
              >
                <Download size={14} />
                Download CSV
              </a>
            </div>
            <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
              <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-dark-panel2">
                      {headers.map(h => (
                        <th key={h} className="py-2 px-3 text-left text-[11px] font-medium text-dark-muted uppercase tracking-wider whitespace-nowrap border-b border-dark-border">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {rows.map((row, i) => (
                      <tr key={i} className="hover:bg-dark-panel2 transition-colors">
                        {headers.map(h => (
                          <td key={h} className="py-2 px-3 text-dark-text whitespace-nowrap">{row[h]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Run History */}
      <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="font-semibold text-dark-text flex items-center gap-2">
            <BookOpen size={18} className="text-dark-muted" />
            Run History
            {data.runs.length > 0 && (
              <span className="text-xs text-dark-muted font-normal ml-1">({data.runs.length})</span>
            )}
          </h3>
        </div>

        {data.runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-dark-panel2 text-left">
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Date</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Period</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Txns</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Flagged</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-center">Slack</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider text-right">Total</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Status</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Approval</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Sheet</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">CSV</th>
                  <th className="py-2 px-4 text-xs font-medium text-dark-muted uppercase tracking-wider">Import</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {data.runs.map((run: RunEntry, i: number) => (
                  <tr key={run.id || i} className="hover:bg-dark-panel2 transition-colors">
                    <td className="py-2.5 px-4 text-dark-text whitespace-nowrap">{formatDate(run.date || run.timestamp)}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {run.period ? (
                        <div>
                          <span className="text-sm font-medium text-dark-text">{run.period}</span>
                          {run.dateRange && <p className="text-[11px] text-dark-muted mt-0.5">{run.dateRange}</p>}
                        </div>
                      ) : run.files ? (
                        <span className="text-xs text-dark-muted">{run.files.map(f => {
                          const m = f.match(/(\w+)-(\d{4})/);
                          return m ? `${m[1].charAt(0).toUpperCase() + m[1].slice(1)} ${m[2]}` : f;
                        }).join(", ")}</span>
                      ) : (
                        <span className="text-xs text-dark-muted">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-dark-text text-right font-medium">{run.transactions}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className={run.flagged > 0 ? "text-dark-warn font-medium" : "text-dark-muted"}>{run.flagged}</span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      {run.slackEnhanced && run.slackEnhanced > 0 ? (
                        <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full bg-cm-purple/15 text-cm-purple">{run.slackEnhanced}</span>
                      ) : (
                        <span className="text-dark-muted">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right text-xs font-mono text-dark-text">{formatCurrency(run.totalDebit, data?.config?.journal?.currency)}</td>
                    <td className="py-2.5 px-4"><RunStatusBadge status={run.status} /></td>
                    <td className="py-2.5 px-4">
                      {run.approvalRequired ? (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                          run.approvalStatus === "approved" ? "bg-dark-success/20 text-dark-success ring-1 ring-dark-success/30"
                            : run.approvalStatus === "pending" ? "bg-dark-warn/10 text-dark-warn ring-1 ring-dark-warn/30"
                            : "bg-dark-panel2 text-dark-muted"
                        }`}>
                          {run.approvalStatus === "approved" ? <CheckCircle2 size={12} /> : run.approvalStatus === "pending" ? <Clock size={12} /> : null}
                          {run.approvalStatus === "approved" ? "Approved" : run.approvalStatus === "pending" ? "Pending" : (run.approvalStatus || "Pending")}
                        </span>
                      ) : (
                        <span className="text-xs text-dark-muted">N/A</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {run.sheetUrl ? (
                        <a href={run.sheetUrl} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:text-cm-purple">
                          <ExternalLink size={16} />
                        </a>
                      ) : (
                        <span className="text-dark-muted">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {run.csvPath && run.id ? (
                        <a
                          href={`/api/bookkeeping?cmd=download-csv&runId=${encodeURIComponent(run.id)}`}
                          className="flex items-center gap-1 text-xs text-cm-purple hover:text-cm-purple/80 whitespace-nowrap"
                          title="Download journal entries CSV"
                        >
                          <Download size={12} />
                          CSV
                        </a>
                      ) : (
                        <span className="text-dark-muted">--</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4">
                      {(data.config.accountingSoftware || "zoho") && run.status === "success" ? (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => importToAccounting(run.id || String(i))}
                            disabled={importingRunId === (run.id || String(i))}
                            className="flex items-center gap-1.5 text-xs font-medium text-cm-purple hover:text-cm-purple/80 disabled:opacity-50 whitespace-nowrap"
                            title={`Import to ${ACCOUNTING_SOFTWARE_OPTIONS.find(o => o.value === (data.config.accountingSoftware || "zoho"))?.label}`}
                          >
                            {importingRunId === (run.id || String(i)) ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Upload size={12} />
                            )}
                            Import
                          </button>
                          {importResult[run.id || String(i)] && (
                            <span className={`text-[10px] ${importResult[run.id || String(i)].startsWith("Error") ? "text-dark-danger" : "text-dark-success"}`}>
                              {importResult[run.id || String(i)]}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-dark-muted text-xs">--</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock size={28} className="text-dark-muted mx-auto mb-2" />
            <p className="text-sm text-dark-muted">No runs recorded yet. Upload statements above to get started.</p>
          </div>
        )}
      </div>

      {/* Workflow Instructions (collapsible) */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setWorkflowOpen(!workflowOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-cm-purple" />
            <h3 className="font-semibold text-dark-text">Workflow &amp; Instructions</h3>
          </div>
          {workflowOpen ? <ChevronDown size={18} className="text-dark-muted" /> : <ChevronRight size={18} className="text-dark-muted" />}
        </button>
        {workflowOpen && (
          <div className="px-5 pb-5 space-y-5">
            <div className="bg-dark-panel2 rounded-lg p-4">
              <h4 className="font-semibold text-dark-text text-sm mb-3">Pipeline Steps</h4>
              <div className="space-y-3">
                {[
                  { step: "1", title: "Upload bank statements", desc: "Drag and drop CSV, PDF, or XLSX bank statements into the upload zone. Supports most bank export formats with automatic column detection.", color: "bg-cm-purple/100" },
                  { step: "2", title: "Auto-classification", desc: "The pipeline parses transactions, classifies them using customizable rules, optionally enriches with Slack context, and generates a Google Sheet for review.", color: "bg-cm-purple" },
                  { step: "3", title: "Review and correct", desc: "Review the classified transactions in Google Sheets. Correct any account classifications directly in the sheet. The system learns from your corrections.", color: "bg-dark-warn/100" },
                  { step: "4", title: "Import to accounting software", desc: "Once reviewed, use the Import button to push entries directly to QuickBooks, Xero, or Zoho Books via API. Or download the formatted CSV for manual import.", color: "bg-cm-purple" },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className={`w-6 h-6 rounded-full ${item.color} text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5`}>
                      {item.step}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-text">{item.title}</p>
                      <p className="text-xs text-dark-muted mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-dark-panel2 rounded-lg p-4">
              <h4 className="font-semibold text-dark-text text-sm mb-2">Self-Improving Classification</h4>
              <p className="text-xs text-dark-muted leading-relaxed">
                When you correct an account classification in the Google Sheet, the system detects the change and automatically
                updates its classification rules. The same type of transaction will be classified correctly in future runs.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Settings (collapsible) — contains Approval, Slack, Test Mode, Pipeline Status */}
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <button
          onClick={() => setSettingsOpen(!settingsOpen)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-panel2 transition-colors rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-dark-muted" />
            <h3 className="font-semibold text-dark-text">Settings</h3>
          </div>
          {settingsOpen ? <ChevronDown size={18} className="text-dark-muted" /> : <ChevronRight size={18} className="text-dark-muted" />}
        </button>
        {settingsOpen && (
          <div className="px-4 pb-4 space-y-4">
            {/* Test Mode */}
            <div className={`rounded-lg border p-4 transition-colors ${isTestMode ? "bg-dark-warn/8 border-dark-warn/30" : "bg-cm-purple/8 border-cm-purple/30"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isTestMode ? "bg-dark-warn/15" : "bg-cm-purple/15"}`}>
                    {isTestMode ? <Flag className="text-dark-warn" size={16} /> : <Zap className="text-cm-purple" size={16} />}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${isTestMode ? "text-dark-warn" : "text-dark-text"}`}>
                      {isTestMode ? "TEST MODE" : "LIVE MODE"}
                    </p>
                    <p className={`text-xs ${isTestMode ? "text-dark-warn/70" : "text-dark-muted"}`}>
                      {isTestMode ? "Notifications and imports are skipped" : "Running for real"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={toggleTestMode}
                  disabled={toggling}
                  className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${isTestMode ? "bg-dark-warn/60 focus:ring-dark-warn" : "bg-cm-purple focus:ring-cm-purple"} ${toggling ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-md transition-transform ${isTestMode ? "translate-x-1" : "translate-x-9"}`} />
                  {toggling && <Loader2 className="absolute inset-0 m-auto animate-spin text-white" size={14} />}
                </button>
              </div>
            </div>

            {/* Approval & Slack — side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Approval */}
              <div className="bg-dark-panel2 rounded-lg p-4">
                <h4 className="font-medium text-dark-text text-sm mb-3 flex items-center gap-2">
                  <ShieldCheck size={16} className="text-cm-purple" />
                  Approval
                </h4>
                <ToggleSwitch
                  checked={approval.enabled}
                  onChange={(val) => updateConfig({ approval: { enabled: val } })}
                  label="Require Approval"
                />
                <p className="text-xs text-dark-muted mt-2">
                  {approval.enabled
                    ? "Sheet sent to approver for review before import."
                    : "Entries import directly without approval."}
                </p>
                {data.config.contacts && Object.keys(data.config.contacts).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-dark-border space-y-2">
                    {Object.entries(data.config.contacts).map(([key, contact]) => (
                      <div key={key} className="text-xs text-dark-muted">
                        <span className="text-dark-text font-medium">{contact.firstName}</span> — {contact.email}
                        <span className="ml-2">{contact.roles.map(r => (
                          <span key={r} className="bg-dark-panel text-dark-muted px-1.5 py-0.5 rounded text-[10px] ml-1">{r}</span>
                        ))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Slack Enrichment */}
              <div className="bg-dark-panel2 rounded-lg p-4">
                <h4 className="font-medium text-dark-text text-sm mb-3 flex items-center gap-2">
                  <MessageSquare size={16} className="text-cm-purple" />
                  Slack Enrichment
                </h4>
                <ToggleSwitch
                  checked={slackEnrichment.enabled}
                  onChange={(val) => updateConfig({ slackEnrichment: { enabled: val } })}
                  label="Enable Slack Enrichment"
                />
                <p className="text-xs text-dark-muted mt-2">
                  {slackEnrichment.enabled
                    ? "Transactions cross-referenced with #financial-approval."
                    : "Classification uses only bank data and rules."}
                </p>
              </div>
            </div>

            {/* Pipeline Status */}
            <div className="bg-dark-panel2 rounded-lg p-4">
              <h4 className="text-xs font-medium text-dark-muted uppercase tracking-wider mb-3">Pipeline Status</h4>
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <p className="text-xs text-dark-muted">Last Run</p>
                  <p className="text-sm text-dark-text">{formatDate(data.status.lastRun)}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-muted">Suffix Counter</p>
                  <p className="text-sm font-bold text-dark-text">{data.state.lastSuffix}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-muted">COA Accounts</p>
                  <p className="text-sm text-dark-text">{data.coaCount}</p>
                </div>
                <div>
                  <p className="text-xs text-dark-muted">Rules</p>
                  <p className="text-sm text-dark-text">{data.rules.count} (v{data.rules.version})</p>
                </div>
              </div>
            </div>

            {/* Agent Info */}
            <div className="bg-dark-panel2 rounded-lg p-4">
              <h4 className="font-medium text-dark-text text-sm mb-2">Agent Location</h4>
              <code className="text-xs text-dark-muted bg-dark-panel px-2 py-1 rounded">~/golden-claw/agents/bookkeeping/</code>
            </div>

            {/* Reference Files */}
            {data.referencePaths && (
              <div className="bg-dark-panel2 rounded-lg p-4">
                <h4 className="font-medium text-dark-text text-sm mb-3">Reference Files</h4>
                <div className="space-y-2">
                  {Object.entries(data.referencePaths).map(([key, ref]) => (
                    <div key={key} className="flex items-start gap-2">
                      {ref.exists ? (
                        <CheckCircle2 size={14} className="text-dark-success mt-0.5 shrink-0" />
                      ) : (
                        <XCircle size={14} className="text-dark-danger mt-0.5 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-dark-text">{ref.label}</p>
                        <code className="text-[11px] text-dark-muted bg-dark-panel px-1.5 py-0.5 rounded block truncate mt-0.5">
                          {ref.path}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
