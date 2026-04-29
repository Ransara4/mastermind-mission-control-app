"use client";

import {
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Building2,
  Bot,
  DollarSign,
  Activity,
} from "lucide-react";
import { usePaperclipData } from "@/hooks/usePaperclipData";

function StatusBadge({ status }: { status: string }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-success/20 text-dark-success">
        <CheckCircle2 size={12} />
        Running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-dark-danger/20 text-dark-danger">
      <XCircle size={12} />
      Down
    </span>
  );
}

export default function PaperclipPage() {
  const { data, loading, error, refresh } = usePaperclipData();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Connecting to Paperclip...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">
          Failed to load data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const isUp = data?.status === "running";
  const companies = data?.companies || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">
            Paperclip
          </h1>
          <p className="text-sm text-dark-muted">
            AI company orchestration -- manage agents like employees
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {isUp && data?.uiUrl && (
            <a
              href={data.uiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium"
            >
              Open Dashboard
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">
            Server Status
          </h2>
          <StatusBadge status={data?.status || "down"} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-dark-panel2 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
              <Activity size={14} />
              Endpoint
            </div>
            <p className="text-sm font-mono font-dm-mono text-dark-text">
              {data?.url || "http://127.0.0.1:3200"}
            </p>
          </div>
          <div className="bg-dark-panel2 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
              <Building2 size={14} />
              Companies
            </div>
            <p className="text-2xl font-bold text-dark-text">
              {companies.length}
            </p>
          </div>
          <div className="bg-dark-panel2 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-dark-muted mb-1">
              <Bot size={14} />
              Database
            </div>
            <p className="text-sm text-dark-text">
              {isUp ? "Embedded PostgreSQL" : "Offline"}
            </p>
          </div>
        </div>
      </div>

      {/* Companies List */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Companies
        </h2>
        {companies.length === 0 ? (
          <div className="text-center py-12 text-dark-muted">
            <Building2 size={40} className="mx-auto mb-3 opacity-40" />
            <p className="text-sm">No companies created yet</p>
            <p className="text-xs mt-1">
              {isUp
                ? "Open the Paperclip dashboard to create your first AI company"
                : "Start the Paperclip server first"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.map((company: Record<string, unknown>, i: number) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-dark-panel2 rounded-lg"
              >
                <div>
                  <p className="font-medium text-dark-text">
                    {String(company.name || `Company ${i + 1}`)}
                  </p>
                  {company.description ? (
                    <p className="text-sm text-dark-muted">
                      {String(company.description)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 text-sm text-dark-muted">
                  {company.agentCount !== undefined && (
                    <span className="flex items-center gap-1">
                      <Bot size={14} />
                      {String(company.agentCount)} agents
                    </span>
                  )}
                  {company.budget !== undefined && (
                    <span className="flex items-center gap-1">
                      <DollarSign size={14} />
                      {String(company.budget)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Quick Reference
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-dark-panel2 rounded-lg">
            <p className="text-xs font-medium text-dark-muted mb-1">
              Dashboard
            </p>
            <p className="text-sm font-mono font-dm-mono text-cm-purple">
              http://127.0.0.1:3200
            </p>
          </div>
          <div className="p-3 bg-dark-panel2 rounded-lg">
            <p className="text-xs font-medium text-dark-muted mb-1">API</p>
            <p className="text-sm font-mono font-dm-mono text-cm-purple">
              http://127.0.0.1:3200/api
            </p>
          </div>
          <div className="p-3 bg-dark-panel2 rounded-lg">
            <p className="text-xs font-medium text-dark-muted mb-1">
              Agent Path
            </p>
            <p className="text-sm font-mono font-dm-mono text-dark-muted">
              ~/.openclaw/workspace/agents/paperclip
            </p>
          </div>
          <div className="p-3 bg-dark-panel2 rounded-lg">
            <p className="text-xs font-medium text-dark-muted mb-1">
              Data Dir
            </p>
            <p className="text-sm font-mono font-dm-mono text-dark-muted">
              ~/.paperclip/instances/default/
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
