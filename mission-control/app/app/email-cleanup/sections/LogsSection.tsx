"use client";

import { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";

interface LogQuery {
  description: string;
  query: string;
  found: number;
  trashed: number;
  failed: number;
}

interface LogEntry {
  date: string;
  startTime: string;
  endTime: string;
  status: "completed" | "failed";
  emailsTrashed: number;
  emailsFailed: number;
  queries: LogQuery[];
}

interface LogSummary {
  totalRuns: number;
  totalEmailsProcessed: number;
  totalEmailsTrashed: number;
  successRate: number;
}

export default function LogsSection() {
  const [cleanupLogs, setCleanupLogs] = useState<LogEntry[] | null>(null);
  const [summary, setSummary] = useState<LogSummary | null>(null);

  const [expandedLogDate, setExpandedLogDate] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "completed" | "failed" | "running"
  >("all");

  useEffect(() => {
    fetch("/api/emmie/logs")
      .then((r) => r.json())
      .then((data) => {
        setCleanupLogs(data.logs || []);
        setSummary(data.summary || null);
      })
      .catch(() => setCleanupLogs([]));
  }, []);

  const filteredLogs = cleanupLogs?.filter((log) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "running") return false; // logs from file are never "running"
    return log.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={20} className="text-dark-success" />;
      case "failed":
        return <AlertCircle size={20} className="text-dark-danger" />;
      case "running":
        return <Clock size={20} className="text-cm-purple animate-spin" />;
      default:
        return <FileText size={20} className="text-dark-muted" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-dark-success/10 border-dark-success/30 text-dark-success";
      case "failed":
        return "bg-dark-danger/10 border-dark-danger/30 text-red-900";
      case "running":
        return "bg-cm-purple/10 border-cm-purple/30 text-cm-purple";
      default:
        return "bg-dark-bg border-dark-border text-dark-text";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-dark-success/20 text-dark-success";
      case "failed":
        return "bg-dark-danger/20 text-dark-danger";
      case "running":
        return "bg-cm-purple/20 text-cm-purple";
      default:
        return "bg-dark-panel2 text-dark-text";
    }
  };

  if (cleanupLogs === null) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold  text-dark-text mb-2">
            Execution Logs
          </h1>
          <p className="text-dark-muted">
            Detailed history of Emmie's cleanup runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-dark-muted" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 border border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-cm-purple focus:border-cm-purple"
          >
            <option value="all">All Logs</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="running">Running</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
            <p className="text-sm text-dark-muted mb-1">Total Runs</p>
            <p className="text-2xl font-bold text-dark-text">
              {summary.totalRuns}
            </p>
          </div>
          <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
            <p className="text-sm text-dark-muted mb-1">Emails Trashed</p>
            <p className="text-2xl font-bold text-dark-danger">
              {summary.totalEmailsTrashed}
            </p>
          </div>
          <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
            <p className="text-sm text-dark-muted mb-1">Total Processed</p>
            <p className="text-2xl font-bold text-dark-text">
              {summary.totalEmailsProcessed}
            </p>
          </div>
          <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
            <p className="text-sm text-dark-muted mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-dark-success">
              {summary.successRate}%
            </p>
          </div>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-3">
        {filteredLogs && filteredLogs.length === 0 ? (
          <div className="bg-dark-panel rounded-lg border border-dark-border p-8 text-center">
            <FileText size={48} className="mx-auto mb-4 text-dark-muted" />
            <p className="text-dark-muted">
              {statusFilter === "all"
                ? "No execution logs yet"
                : `No ${statusFilter} logs`}
            </p>
          </div>
        ) : (
          filteredLogs?.map((log) => (
            <div
              key={log.date}
              className={`rounded-lg border ${getStatusColor(
                log.status
              )} overflow-hidden`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getStatusIcon(log.status)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold  text-dark-text">
                          {log.date}
                        </h3>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadge(
                            log.status
                          )}`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-2">
                        <div>
                          <p className="text-xs text-dark-muted">Trashed</p>
                          <p className="font-semibold text-dark-danger">
                            {log.emailsTrashed}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-muted">Errors</p>
                          <p className="font-semibold">
                            {log.emailsFailed}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-dark-muted">Queries</p>
                          <p className="font-semibold">
                            {log.queries.length}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-dark-muted">
                        {log.startTime && (
                          <span>Started: {log.startTime}</span>
                        )}
                        {log.endTime && log.endTime !== log.startTime && (
                          <span>Ended: {log.endTime}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      setExpandedLogDate(
                        expandedLogDate === log.date ? null : log.date
                      )
                    }
                    className="p-2 rounded-lg hover:bg-dark-panel/50 transition-colors"
                  >
                    {expandedLogDate === log.date ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                </div>

                {expandedLogDate === log.date && log.queries.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-dark-border space-y-3">
                    <div className="bg-dark-panel/50 rounded p-3">
                      <p className="text-xs font-medium text-dark-text mb-2">
                        Queries Run:
                      </p>
                      <div className="space-y-2">
                        {log.queries.map((q, idx) => (
                          <div
                            key={idx}
                            className="text-xs bg-dark-panel2 rounded p-2"
                          >
                            <p className="font-medium text-dark-text">
                              {q.description}
                            </p>
                            <p className="text-dark-muted font-mono font-dm-mono mt-0.5">
                              {q.query}
                            </p>
                            <p className="text-dark-muted mt-0.5">
                              Found: {q.found} · Trashed: {q.trashed}
                              {q.failed > 0 && (
                                <span className="text-dark-danger">
                                  {" "}
                                  · Failed: {q.failed}
                                </span>
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
