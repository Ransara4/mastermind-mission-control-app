"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ScanEntry } from "@/lib/guard-dog-types";

const ACTION_BADGE: Record<string, { bg: string; text: string; emoji: string }> = {
  BARK: { bg: "bg-dark-danger/20", text: "text-dark-danger", emoji: "🚨" },
  WHINE: { bg: "bg-dark-warn/20", text: "text-dark-warn", emoji: "🐕" },
  SILENT: { bg: "bg-dark-success/20", text: "text-dark-success", emoji: "😴" },
};

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ThreatFeed({ scans }: { scans: ScanEntry[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (scans.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          🐾 Recent Scans
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          🐕 No scans recorded yet — the dog is resting
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
        🐾 Recent Scans
      </h3>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dark-panel">
            <tr className="border-b border-dark-border">
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2 pr-2"></th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">Package</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">Ecosystem</th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">Status</th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">Confidence</th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">CVEs</th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">Duration</th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">Time</th>
            </tr>
          </thead>
          <tbody>
            {scans.map((scan, idx) => {
              const badge = ACTION_BADGE[scan.action] || ACTION_BADGE.SILENT;
              const isExpanded = expandedIdx === idx;
              return (
                <tr key={idx} className="group">
                  <td colSpan={8} className="p-0">
                    <div
                      className="flex items-center cursor-pointer hover:bg-dark-panel2 py-2 border-b border-dark-border/50"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      <div className="w-6 flex-shrink-0 pl-1">
                        {isExpanded ? (
                          <ChevronDown size={14} className="text-dark-muted" />
                        ) : (
                          <ChevronRight size={14} className="text-dark-muted" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="grid grid-cols-7 gap-2 items-center">
                          <span className="text-sm font-medium text-dark-text truncate">{scan.packageName}</span>
                          <span className="text-sm text-dark-muted">{scan.ecosystem}</span>
                          <span>
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
                              {badge.emoji} {scan.action}
                            </span>
                          </span>
                          <span className="text-sm text-dark-muted text-right">{scan.confidence}%</span>
                          <span className="text-sm text-dark-muted text-right">{scan.cveCount}</span>
                          <span className="text-sm text-dark-muted text-right">{(scan.duration / 1000).toFixed(1)}s</span>
                          <span className="text-sm text-dark-muted text-right">{timeAgo(scan.timestamp)}</span>
                        </div>
                      </div>
                    </div>
                    {isExpanded && scan.reasons.length > 0 && (
                      <div className="pl-8 pr-4 pb-3 bg-dark-panel2">
                        <p className="text-xs font-medium text-dark-muted mb-1">Reasons:</p>
                        <ul className="space-y-0.5">
                          {scan.reasons.map((reason, ri) => (
                            <li key={ri} className="text-xs text-dark-muted">
                              &bull; {reason}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
