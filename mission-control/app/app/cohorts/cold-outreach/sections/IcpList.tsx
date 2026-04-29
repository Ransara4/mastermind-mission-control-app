"use client";

import { AlertCircle, Plus } from "lucide-react";
import { type ICP } from "@/hooks/useColdOutreachData";

export function IcpList({
  icps,
  selectedIcpId,
  tagIssues,
  onSelect,
  onCreateClick,
}: {
  icps: ICP[];
  selectedIcpId: string | null;
  tagIssues: { icp_id: string; issue: string }[];
  onSelect: (id: string) => void;
  onCreateClick: () => void;
}) {
  return (
    <div className="w-80 flex-shrink-0 space-y-3">
      <button
        onClick={onCreateClick}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cm-purple text-white rounded-xl hover:bg-cm-purple/80 transition-colors font-medium text-sm"
      >
        <Plus size={16} />
        Create New ICP
      </button>

      {icps.length === 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6 text-center text-dark-muted text-sm">
          No ICPs yet. Create one to get started.
        </div>
      )}

      {icps.map((icp) => {
        const hasTagIssue = tagIssues.some((t) => t.icp_id === icp.id);
        return (
          <button
            key={icp.id}
            onClick={() => onSelect(icp.id)}
            className={`w-full text-left bg-dark-panel border rounded-xl p-4 transition-all ${
              selectedIcpId === icp.id
                ? "border-cm-purple ring-2 ring-cm-purple/20"
                : "border-dark-border hover:border-cm-purple/30"
            }`}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <h4 className="font-semibold text-dark-text text-sm">{icp.name}</h4>
                {hasTagIssue && (
                  <span title="ICP tag mismatch" className="text-dark-warn">
                    <AlertCircle size={14} />
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  icp.status === "active"
                    ? "bg-cm-purple/15 text-cm-purple border border-cm-purple/20"
                    : "bg-dark-panel2 text-dark-muted border border-dark-border"
                }`}
              >
                {icp.status}
              </span>
            </div>
            <p className="text-xs text-dark-muted line-clamp-2 mb-2">{icp.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono bg-dark-panel2 text-dark-muted px-2 py-0.5 rounded">
                {icp.icp_tag}
              </span>
              <span className="text-xs bg-dark-panel2 border border-dark-border text-dark-muted px-2 py-0.5 rounded-full font-medium">
                {icp.total_leads} leads
              </span>
              <span className="text-xs bg-dark-bg text-dark-muted px-2 py-0.5 rounded-full">
                {icp.total_qualified} qualified
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
