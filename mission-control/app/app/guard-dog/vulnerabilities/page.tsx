"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search,
  ChevronDown,
  Download,
  AlertCircle,
  Check,
  Clock,
  Eye,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

interface Vulnerability {
  id: string;
  packageName: string;
  ecosystem: string;
  cveId: string | null;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  cvssScore: number | null;
  affectedVersions: string;
  fixedVersion: string | null;
  status: "open" | "reviewed" | "snoozed" | "patched";
  discoveredAt: string;
  lastSeen: string;
  source: string;
  url: string | null;
  remediationSteps: string[];
  references: string[];
  remediationNotes: string | null;
}

interface ApiResponse {
  vulnerabilities: Vulnerability[];
  total: number;
  severityCounts: Record<string, number>;
  statusCounts: Record<string, number>;
}

type SortKey = "package" | "severity" | "cve" | "discovered" | "status";
type StatusFilter = "all" | "open" | "patched" | "snoozed" | "reviewed";
type SeverityFilter = "all" | "critical" | "high" | "medium" | "low";

export default function VulnerabilitiesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("severity");
  const [sortDesc, setSortDesc] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedVuln, setSelectedVuln] = useState<Vulnerability | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchVulnerabilities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (severityFilter !== "all") params.set("severity", severityFilter);
      if (searchTerm) params.set("search", searchTerm);
      params.set("limit", "500");

      const res = await fetch(`/api/guard-dog/vulnerabilities?${params}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to fetch vulnerabilities:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, searchTerm]);

  useEffect(() => {
    fetchVulnerabilities();
  }, [fetchVulnerabilities]);

  const updateStatus = async (id: string, newStatus: string) => {
    setUpdating(id);
    try {
      const res = await fetch("/api/guard-dog/vulnerabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        // Refresh the list
        await fetchVulnerabilities();
        setSelectedVuln(null);
      }
    } catch (err) {
      console.error("Failed to update vulnerability:", err);
    } finally {
      setUpdating(null);
    }
  };

  const vulns = useMemo(() => {
    if (!data) return [];
    return [...data.vulnerabilities].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortBy === "package") {
        aVal = a.packageName;
        bVal = b.packageName;
      } else if (sortBy === "cve") {
        aVal = a.cveId || a.id;
        bVal = b.cveId || b.id;
      } else if (sortBy === "severity") {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        aVal = severityOrder[a.severity] || 0;
        bVal = severityOrder[b.severity] || 0;
      } else if (sortBy === "discovered") {
        aVal = new Date(a.discoveredAt).getTime();
        bVal = new Date(b.discoveredAt).getTime();
      } else if (sortBy === "status") {
        aVal = a.status;
        bVal = b.status;
      }

      if (typeof aVal === "string") {
        return sortDesc
          ? (bVal as string).localeCompare(aVal)
          : aVal.localeCompare(bVal as string);
      }

      return sortDesc ? (bVal as number) - aVal : aVal - (bVal as number);
    });
  }, [data, sortBy, sortDesc]);

  const severityColor = {
    critical: "text-dark-danger bg-dark-danger/10 border-dark-danger/20",
    high: "text-orange-400 bg-orange-500/20 border-orange-500/30",
    medium: "text-yellow-400 bg-yellow-500/20 border-yellow-500/30",
    low: "text-cm-purple bg-cm-purple/10 border-cm-purple/20",
  };

  const statusIcon = {
    open: <AlertCircle size={16} className="text-dark-danger" />,
    reviewed: <Eye size={16} className="text-dark-muted" />,
    snoozed: <Clock size={16} className="text-dark-warn" />,
    patched: <Check size={16} className="text-dark-success" />,
  };

  const handleExport = (format: "csv" | "json") => {
    const dataStr =
      format === "csv"
        ? vulns
            .map(
              (v) =>
                `${v.packageName},${v.cveId || v.id},${v.severity},${v.status},${v.source}`
            )
            .join("\n")
        : JSON.stringify(vulns, null, 2);

    const blob = new Blob([dataStr], {
      type: format === "csv" ? "text/csv" : "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vulnerabilities.${format}`;
    a.click();
  };

  // Use API-level counts for the global stats (unfiltered)
  const openCount = data?.statusCounts?.open || 0;
  const snoozedCount = data?.statusCounts?.snoozed || 0;
  const reviewedCount = data?.statusCounts?.reviewed || 0;
  const patchedCount = data?.statusCounts?.patched || 0;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-dark-text">
              Vulnerabilities
            </h2>
            <p className="text-sm text-dark-muted mt-1">
              {data ? `${data.total} total from threat intel feeds` : "Loading..."}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchVulnerabilities}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-cm-purple/10 text-cm-purple rounded-lg hover:bg-cm-purple/20 transition-colors"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-border transition-colors"
            >
              <Download size={16} />
              CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-border transition-colors"
            >
              <Download size={16} />
              JSON
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by package, CVE, or title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-dark-border rounded-lg bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <div className="flex gap-1 flex-wrap">
              {(
                ["all", "open", "patched", "snoozed", "reviewed"] as const
              ).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    statusFilter === status
                      ? "bg-cm-purple text-white"
                      : "bg-dark-panel2 text-dark-text hover:bg-dark-border"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>

            {/* Severity Filter */}
            <div className="flex gap-1 flex-wrap">
              {(["all", "critical", "high", "medium", "low"] as const).map(
                (severity) => (
                  <button
                    key={severity}
                    onClick={() => setSeverityFilter(severity)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      severityFilter === severity
                        ? "bg-dark-danger text-white"
                        : "bg-dark-panel2 text-dark-text hover:bg-dark-border"
                    }`}
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && !data && (
        <div className="p-12 text-center text-dark-muted border border-dark-border rounded-lg">
          <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
          Loading vulnerabilities...
        </div>
      )}

      {/* Vulnerability List */}
      {data && (
        <div className="border border-dark-border rounded-lg overflow-hidden">
          <div className="bg-dark-panel2 border-b border-dark-border px-4 py-3">
            <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-dark-muted uppercase">
              <div
                className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-dark-text"
                onClick={() => {
                  if (sortBy === "package") setSortDesc(!sortDesc);
                  setSortBy("package");
                }}
              >
                Package{" "}
                <ChevronDown
                  size={14}
                  className={
                    sortBy === "package" && sortDesc ? "rotate-180" : ""
                  }
                />
              </div>
              <div
                className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-dark-text"
                onClick={() => {
                  if (sortBy === "cve") setSortDesc(!sortDesc);
                  setSortBy("cve");
                }}
              >
                ID{" "}
                <ChevronDown
                  size={14}
                  className={sortBy === "cve" && sortDesc ? "rotate-180" : ""}
                />
              </div>
              <div
                className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-dark-text"
                onClick={() => {
                  if (sortBy === "severity") setSortDesc(!sortDesc);
                  setSortBy("severity");
                }}
              >
                Severity{" "}
                <ChevronDown
                  size={14}
                  className={
                    sortBy === "severity" && sortDesc ? "rotate-180" : ""
                  }
                />
              </div>
              <div
                className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-dark-text"
                onClick={() => {
                  if (sortBy === "status") setSortDesc(!sortDesc);
                  setSortBy("status");
                }}
              >
                Status{" "}
                <ChevronDown
                  size={14}
                  className={
                    sortBy === "status" && sortDesc ? "rotate-180" : ""
                  }
                />
              </div>
              <div className="col-span-3 text-right">Action</div>
            </div>
          </div>

          {vulns.length === 0 ? (
            <div className="px-4 py-12 text-center text-dark-muted">
              No vulnerabilities found matching your filters
            </div>
          ) : (
            <div className="divide-y divide-dark-border max-h-[600px] overflow-y-auto">
              {vulns.map((vuln) => (
                <div key={vuln.id}>
                  <div
                    className="px-4 py-3 hover:bg-dark-panel2 cursor-pointer transition-colors"
                    onClick={() =>
                      setSelectedVuln(
                        selectedVuln?.id === vuln.id ? null : vuln
                      )
                    }
                  >
                    <div className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <p className="font-semibold text-dark-text">
                          {vuln.packageName}
                        </p>
                        <p className="text-xs text-dark-muted">
                          {vuln.ecosystem}
                          {vuln.source && ` | ${vuln.source}`}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="font-mono font-dm-mono text-xs text-dark-muted truncate">
                          {vuln.cveId || vuln.id}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${
                            severityColor[vuln.severity]
                          }`}
                        >
                          {vuln.severity.toUpperCase()}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center gap-2">
                        {statusIcon[vuln.status]}
                        <span className="text-sm text-dark-muted">
                          {vuln.status.charAt(0).toUpperCase() +
                            vuln.status.slice(1)}
                        </span>
                      </div>
                      <div className="col-span-3 text-right flex gap-1 justify-end">
                        {vuln.url && (
                          <a
                            href={vuln.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1 text-xs bg-dark-panel2 text-dark-muted rounded hover:bg-dark-border transition-colors inline-flex items-center gap-1"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVuln(
                              selectedVuln?.id === vuln.id ? null : vuln
                            );
                          }}
                          className="px-2 py-1 text-xs bg-cm-purple/20 text-cm-purple rounded hover:bg-cm-purple/30 transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Detail Panel */}
                  {selectedVuln?.id === vuln.id && (
                    <div className="px-4 py-4 bg-dark-panel2 border-t border-dark-border space-y-4">
                      <div>
                        <h4 className="font-semibold text-dark-text mb-1">
                          {vuln.title}
                        </h4>
                        <p className="text-sm text-dark-muted">
                          {vuln.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {vuln.cvssScore && (
                          <div>
                            <p className="text-xs font-semibold text-dark-muted">
                              CVSS Score
                            </p>
                            <p className="text-lg font-bold text-orange-400">
                              {vuln.cvssScore}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-dark-muted">
                            Affected Versions
                          </p>
                          <p className="font-mono font-dm-mono text-sm text-dark-text">
                            {vuln.affectedVersions}
                          </p>
                        </div>
                        {vuln.fixedVersion && (
                          <div>
                            <p className="text-xs font-semibold text-dark-muted">
                              Fixed Version
                            </p>
                            <p className="font-mono font-dm-mono text-sm text-dark-success">
                              {vuln.fixedVersion}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-semibold text-dark-muted">
                            First Seen
                          </p>
                          <p className="text-sm text-dark-text">
                            {new Date(vuln.discoveredAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {vuln.remediationSteps.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-dark-muted mb-2">
                            Remediation Steps
                          </p>
                          <ol className="list-decimal list-inside space-y-1">
                            {vuln.remediationSteps.map((step, idx) => (
                              <li
                                key={idx}
                                className="text-sm text-dark-text"
                              >
                                {step}
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        {vuln.status !== "reviewed" && (
                          <button
                            disabled={updating === vuln.id}
                            onClick={() => updateStatus(vuln.id, "reviewed")}
                            className="flex-1 px-3 py-2 bg-cm-purple text-white text-sm rounded hover:bg-cm-purple/80 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Eye size={14} />
                            Mark Reviewed
                          </button>
                        )}
                        {vuln.status !== "snoozed" && (
                          <button
                            disabled={updating === vuln.id}
                            onClick={() => updateStatus(vuln.id, "snoozed")}
                            className="flex-1 px-3 py-2 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Clock size={14} />
                            Snooze
                          </button>
                        )}
                        {vuln.status !== "patched" && (
                          <button
                            disabled={updating === vuln.id}
                            onClick={() => updateStatus(vuln.id, "patched")}
                            className="flex-1 px-3 py-2 bg-cm-purple text-white text-sm rounded hover:bg-cm-purple/80 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Check size={14} />
                            Mark Patched
                          </button>
                        )}
                        {vuln.status !== "open" && (
                          <button
                            disabled={updating === vuln.id}
                            onClick={() => updateStatus(vuln.id, "open")}
                            className="flex-1 px-3 py-2 bg-cm-purple text-white text-sm rounded hover:bg-cm-purple/80 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <AlertCircle size={14} />
                            Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats Footer */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-4 bg-dark-danger/10 border border-dark-danger/30 rounded-lg">
          <p className="text-xs font-semibold text-dark-danger uppercase">Open</p>
          <p className="text-2xl font-bold text-dark-danger">{openCount}</p>
        </div>
        <div className="p-4 bg-dark-warn/10 border border-dark-warn/30 rounded-lg">
          <p className="text-xs font-semibold text-dark-warn uppercase">
            Snoozed
          </p>
          <p className="text-2xl font-bold text-dark-warn">{snoozedCount}</p>
        </div>
        <div className="p-4 bg-dark-panel2 border border-dark-border rounded-lg">
          <p className="text-xs font-semibold text-dark-muted uppercase">
            Reviewed
          </p>
          <p className="text-2xl font-bold text-dark-text">{reviewedCount}</p>
        </div>
        <div className="p-4 bg-dark-success/10 border border-dark-success/30 rounded-lg">
          <p className="text-xs font-semibold text-dark-success uppercase">
            Patched
          </p>
          <p className="text-2xl font-bold text-dark-success">{patchedCount}</p>
        </div>
      </div>
    </div>
  );
}
