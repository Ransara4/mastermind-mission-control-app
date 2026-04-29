"use client";

import { Loader2, AlertCircle, RefreshCw, Bot, Clock, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { useHumanTasksData } from "@/hooks/useHumanTasksData";

function AttemptBadge({ count }: { count: number }) {
  const color =
    count === 0
      ? "bg-cm-purple/15 text-cm-purple"
      : count >= 3
        ? "bg-dark-danger/20 text-dark-danger"
        : "bg-dark-warn/20 text-dark-warn";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {count}/3 attempts
    </span>
  );
}

function StatusIcon({ result }: { result: string | null }) {
  if (!result) return <Clock size={14} className="text-dark-muted" />;
  if (result.startsWith("skipped")) return <XCircle size={14} className="text-dark-danger" />;
  if (result.startsWith("partial")) return <CheckCircle2 size={14} className="text-dark-warn" />;
  if (result.startsWith("blocked")) return <XCircle size={14} className="text-dark-danger" />;
  return <CheckCircle2 size={14} className="text-dark-success" />;
}

export default function HumanTasksPage() {
  const { data, loading, error, refresh } = useHumanTasksData();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading AutoHuman...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-bold text-dark-text mb-2">Failed to load data</h3>
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

  if (!data) return null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-cm-purple/15 rounded-lg flex-shrink-0">
              <Bot size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">AutoHuman</h1>
              <p className="text-sm text-dark-muted mt-0.5">
                Attempts to automate Human Must Do cards — tracks attempts, builds playbooks
              </p>
            </div>
          </div>
          <button
            onClick={refresh}
            disabled={loading}
            className="p-2 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">Cards</p>
          <p className="text-2xl font-bold text-dark-text">{data.totalCards}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">Total Attempts</p>
          <p className="text-2xl font-bold text-dark-text">{data.stats.totalAttempts}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">Maxed Out</p>
          <p className="text-2xl font-bold text-dark-danger">{data.stats.maxedOut}</p>
        </div>
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <p className="text-xs text-dark-muted uppercase tracking-wide mb-1">Playbooks</p>
          <p className="text-2xl font-bold text-cm-purple">{data.playbooks.length}</p>
        </div>
      </div>

      {/* Last Run */}
      {data.lastRun && (
        <div className="bg-dark-panel rounded-xl p-4 border border-dark-border">
          <h2 className="text-sm font-semibold text-dark-text mb-2">Last Run</h2>
          <div className="flex flex-wrap gap-4 text-sm text-dark-muted">
            <span>{new Date(data.lastRun.timestamp).toLocaleString()}</span>
            <span className="text-dark-success">{data.lastRun.completed} completed</span>
            <span className="text-dark-warn">{data.lastRun.partial} partial</span>
            <span className="text-dark-danger">{data.lastRun.blocked} blocked</span>
          </div>
        </div>
      )}

      {/* Cards */}
      <div>
        <h2 className="text-lg font-bold text-dark-text mb-3">Human Must Do Cards</h2>
        {data.cards.length === 0 ? (
          <p className="text-dark-muted text-sm">No cards in Human Must Do column.</p>
        ) : (
          <div className="space-y-3">
            {data.cards.map((card) => (
              <div
                key={card._id}
                className="bg-dark-panel rounded-xl p-4 border border-dark-border hover:border-cm-purple/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon result={card.attemptData.lastResult} />
                      <h3 className="font-semibold text-dark-text truncate">{card.title}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AttemptBadge count={card.attemptData.count} />
                      {card.labels.map((l) => (
                        <span
                          key={l}
                          className="text-xs px-2 py-0.5 rounded-full bg-dark-panel2 border border-dark-border text-dark-muted"
                        >
                          {l}
                        </span>
                      ))}
                      {card.priority && (
                        <span className="text-xs text-dark-muted">{card.priority}</span>
                      )}
                    </div>
                    {card.attemptData.lastResult && (
                      <p className="text-xs text-dark-muted mt-2 line-clamp-2">
                        {card.attemptData.lastResult}
                      </p>
                    )}
                    {card.attemptData.researchNotes && (
                      <p className="text-xs text-dark-muted mt-1 line-clamp-2 italic">
                        {card.attemptData.researchNotes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Playbooks */}
      {data.playbooks.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-dark-text mb-3 flex items-center gap-2">
            <BookOpen size={18} className="text-cm-purple" />
            Playbooks
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.playbooks.map((pb) => (
              <div
                key={pb.name}
                className="bg-dark-panel rounded-xl p-4 border border-dark-border"
              >
                <h3 className="font-semibold text-dark-text text-sm">{pb.name}</h3>
                <p className="text-xs text-dark-muted mt-1 line-clamp-3">{pb.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Logs */}
      {data.recentLogs.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-dark-text mb-3">Recent Logs</h2>
          {data.recentLogs.map((log) => (
            <details key={log.file} className="mb-2 group">
              <summary className="text-sm text-cm-purple cursor-pointer hover:text-cm-purple-mid select-none">
                {log.file}
              </summary>
              <pre className="text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded-lg p-3 mt-1 overflow-x-auto max-h-48 overflow-y-auto font-dm-mono">
                {log.content}
              </pre>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
