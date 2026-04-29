"use client";

import { useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Shield,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { useGuardDogData } from "@/hooks/useGuardDogData";

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string; Icon: typeof Shield }> = {
  BARK: { bg: "bg-dark-danger/10", text: "text-dark-danger", label: "BARK", Icon: AlertOctagon },
  WHINE: { bg: "bg-dark-warn/10", text: "text-dark-warn", label: "WHINE", Icon: AlertTriangle },
  SILENT: { bg: "bg-dark-success/10", text: "text-dark-success", label: "SILENT", Icon: CheckCircle },
};

export default function AuditTrailPage() {
  const { data, loading } = useGuardDogData();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    let scans = data.recentScans;
    if (filterAction !== "all") {
      scans = scans.filter((s) => s.action === filterAction);
    }
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      scans = scans.filter(
        (s) =>
          s.packageName.toLowerCase().includes(q) ||
          s.reasons.some((r) => r.toLowerCase().includes(q))
      );
    }
    return scans;
  }, [data, searchTerm, filterAction]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple" size={32} />
      </div>
    );
  }

  if (!data) return null;

  const counts = {
    all: data.recentScans.length,
    BARK: data.recentScans.filter((s) => s.action === "BARK").length,
    WHINE: data.recentScans.filter((s) => s.action === "WHINE").length,
    SILENT: data.recentScans.filter((s) => s.action === "SILENT").length,
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-dark-text">
        Installation Audit Trail
      </h2>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted" />
          <input
            type="text"
            placeholder="Search packages or reasons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "BARK", "WHINE", "SILENT"] as const).map((action) => {
            const active = filterAction === action;
            const style = action === "all" ? null : ACTION_STYLES[action];
            return (
              <button
                key={action}
                onClick={() => setFilterAction(action)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  active
                    ? "bg-cm-purple/20 border-cm-purple/40 text-cm-purple"
                    : "bg-dark-panel border-dark-border text-dark-muted hover:border-dark-muted"
                }`}
              >
                {action === "all" ? "All" : action} ({counts[action]})
              </button>
            );
          })}
        </div>
      </div>

      {/* Audit entries */}
      <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList size={28} className="text-dark-muted mx-auto mb-2" />
            <p className="text-sm text-dark-muted">No matching audit entries</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {filtered.map((scan, i) => {
              const style = ACTION_STYLES[scan.action] || ACTION_STYLES.SILENT;
              const Icon = style.Icon;
              return (
                <div key={`${scan.packageName}-${scan.timestamp}-${i}`} className="p-4 hover:bg-dark-panel2 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-1.5 rounded-lg ${style.bg} flex-shrink-0 mt-0.5`}>
                        <Icon size={14} className={style.text} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-dark-text">{scan.packageName}</span>
                          <span className="text-xs bg-dark-panel2 text-dark-muted px-1.5 py-0.5 rounded">{scan.ecosystem}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                          {scan.confidence != null && (
                            <span className="text-xs text-dark-muted">{scan.confidence}% confidence</span>
                          )}
                        </div>
                        {scan.reasons.length > 0 && (
                          <p className="text-xs text-dark-muted mt-1 line-clamp-2">
                            {scan.reasons.join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-dark-muted">{formatDate(scan.timestamp)}</p>
                      {scan.duration > 0 && (
                        <p className="text-xs text-dark-muted">{(scan.duration / 1000).toFixed(1)}s</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary footer */}
      <div className="flex items-center justify-between text-xs text-dark-muted px-1">
        <span>Showing {filtered.length} of {data.recentScans.length} entries</span>
        {data.stats.lastScanAt && (
          <span>Last scan: {formatDate(data.stats.lastScanAt)}</span>
        )}
      </div>
    </div>
  );
}
