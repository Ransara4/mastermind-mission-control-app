"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Bird, RefreshCw, ArrowLeft, FileText, Calendar,
  Loader, ChevronRight, AlertCircle,
} from "lucide-react";

// -- Types -------------------------------------------------------------------

interface ReportSummary {
  id: number;
  title: string;
  date: string;
  preview: string;
  length: number;
}

interface FullReport {
  id: number;
  title: string;
  date: string;
  text: string;
}

interface Status {
  lastSync: string | null;
  reportCount: number;
  lastError: string | null;
}

// -- Helpers -----------------------------------------------------------------

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function wordCount(text: string): string {
  const n = text.split(/\s+/).filter(Boolean).length;
  if (n > 1000) return `${(n / 1000).toFixed(1)}k words`;
  return `${n} words`;
}

// -- Component ---------------------------------------------------------------

export default function LittleBirdPage() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<Status | null>(null);
  const [selectedReport, setSelectedReport] = useState<FullReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ connected: boolean; reason: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/littlebird?action=health");
      const data = await res.json();
      setHealth(data);
    } catch {
      setHealth({ connected: false, reason: "unreachable" });
    }
  }, []);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes] = await Promise.all([
        fetch("/api/littlebird?action=reports"),
        fetch("/api/littlebird?action=status"),
      ]);
      const rData = await rRes.json();
      const sData = await sRes.json();
      setReports(rData.reports ?? []);
      setTotal(rData.total ?? 0);
      setStatus(sData);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    fetchReports();
  }, [checkHealth, fetchReports]);

  const handleRefreshToken = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/littlebird", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refresh-token" }),
      });
      await checkHealth();
    } catch {
      // silent
    } finally {
      setRefreshing(false);
    }
  };

  const openReport = async (id: number) => {
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/littlebird?action=report&id=${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedReport(data);
      }
    } catch {
      // silent
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/littlebird", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const data = await res.json();
      if (!data.ok) {
        setSyncError(data.error || "Sync failed");
      } else {
        await fetchReports();
      }
    } catch {
      setSyncError("Network error");
    } finally {
      setSyncing(false);
    }
  };

  // -- Date range --
  const dateRange = reports.length > 0
    ? { first: reports[reports.length - 1].date, last: reports[0].date }
    : null;

  // -- Detail view --
  if (selectedReport) {
    return (
      <div className="space-y-6">
        {/* Back button */}
        <button
          onClick={() => setSelectedReport(null)}
          className="flex items-center gap-2 text-sm text-dark-muted hover:text-cm-purple transition-colors"
        >
          <ArrowLeft size={16} />
          Back to reports
        </button>

        {/* Report header */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-cm-purple/15 rounded-lg p-2">
              <FileText size={20} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-dark-text tracking-tight">
                {fmtDate(selectedReport.date.slice(0, 10))}
              </h1>
              <p className="text-xs text-dark-muted">
                {wordCount(selectedReport.text)} -- Report #{selectedReport.id}
              </p>
            </div>
          </div>
        </div>

        {/* Report body */}
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <div className="bg-dark-panel2 border border-dark-border rounded-lg p-5 text-sm text-dark-text leading-relaxed whitespace-pre-wrap font-dm-sans">
            {selectedReport.text}
          </div>
        </div>
      </div>
    );
  }

  // -- List view --
  return (
    <div className="space-y-6">
      {/* Setup notice — shown when token is missing or expired */}
      {health && !health.connected && (
        <div className="bg-dark-panel border border-dark-warn/40 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-dark-warn mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-dark-warn mb-1">Little Bird is not set up</p>
              <p className="text-xs text-dark-muted mb-3">
                {health.reason === "no_token"
                  ? "No access token found. Connect your Little Bird account to enable daily journal sync."
                  : "Your Little Bird token has expired. Click Reconnect to refresh it automatically from your browser session."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRefreshToken}
                  disabled={refreshing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-cm-purple text-white text-xs rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
                >
                  {refreshing ? <Loader size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  {refreshing ? "Reconnecting..." : "Reconnect"}
                </button>
                <a
                  href="https://app.littlebird.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cm-purple hover:underline"
                >
                  Open Little Bird ↗
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-cm-purple/15 rounded-lg p-3">
              <Bird size={24} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text tracking-tight">Little Bird</h1>
              <p className="text-sm text-dark-muted">
                Daily journal reports from your screen activity
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {status?.lastSync && (
              <span className="text-xs text-dark-muted">
                Synced {timeAgo(status.lastSync)}
              </span>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium bg-cm-purple text-white hover:bg-cm-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {syncing
                ? <Loader size={14} className="animate-spin" />
                : <RefreshCw size={14} />}
              {syncing ? "Syncing..." : "Sync Now"}
            </button>
          </div>
        </div>
        {syncError && (
          <div className="mt-3 flex items-center gap-2 text-xs text-dark-danger">
            <AlertCircle size={13} />
            {syncError}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-xs text-dark-muted mb-1">Total Reports</p>
          <p className="text-2xl font-bold text-dark-text">{total}</p>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-xs text-dark-muted mb-1">Date Range</p>
          {dateRange ? (
            <p className="text-sm font-medium text-dark-text">
              {fmtDate(dateRange.first)}
              <span className="text-dark-muted mx-1">-</span>
              {fmtDate(dateRange.last)}
            </p>
          ) : (
            <p className="text-sm text-dark-muted">--</p>
          )}
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
          <p className="text-xs text-dark-muted mb-1">Last Sync</p>
          <p className="text-sm font-medium text-dark-text">
            {status?.lastSync ? timeAgo(status.lastSync) : "--"}
          </p>
        </div>
      </div>

      {/* Reports list */}
      <div className="bg-dark-panel border border-dark-border rounded-xl">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-sm font-bold text-dark-text">Reports</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader size={20} className="animate-spin text-cm-purple" />
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-dark-muted">
            <Bird size={32} style={{ opacity: 0.3 }} />
            <p className="text-sm mt-2">No reports found</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border max-h-[600px] overflow-y-auto">
            {reports.map((r) => (
              <button
                key={r.id}
                onClick={() => openReport(r.id)}
                className="w-full text-left px-6 py-4 hover:bg-dark-panel2 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-cm-purple" />
                    <span className="text-sm font-medium text-dark-text">
                      {fmtDate(r.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-dark-muted">
                      {wordCount(r.preview.repeat(Math.ceil(r.length / 200)).slice(0, r.length))}
                    </span>
                    <ChevronRight
                      size={14}
                      className="text-dark-muted group-hover:text-cm-purple transition-colors"
                    />
                  </div>
                </div>
                <p className="text-xs text-dark-muted line-clamp-2 leading-relaxed">
                  {r.preview}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {loadingReport && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center gap-3">
            <Loader size={18} className="animate-spin text-cm-purple" />
            <span className="text-sm text-dark-text">Loading report...</span>
          </div>
        </div>
      )}
    </div>
  );
}
