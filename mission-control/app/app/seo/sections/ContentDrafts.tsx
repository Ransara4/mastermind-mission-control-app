"use client";

import { FileText, Clock } from "lucide-react";
import type { SeoContentDraft } from "@/hooks/useSeoData";

interface Props {
  drafts: SeoContentDraft[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function ContentDrafts({ drafts }: Props) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
        <FileText size={16} className="text-cm-purple" />
        Content Drafts
        {drafts.length > 0 && (
          <span className="ml-auto text-xs text-dark-muted font-normal">
            {drafts.length} drafts
          </span>
        )}
      </h3>
      {drafts.length === 0 ? (
        <div className="bg-dark-panel2 border border-dashed border-dark-border rounded-xl p-8 text-center">
          <p className="text-sm text-dark-muted italic">
            No content drafts yet. Run a content brief to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {drafts.map((draft) => (
            <div
              key={draft.name}
              className="flex items-center justify-between p-3 rounded-lg bg-dark-panel2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dark-text truncate">
                  {draft.title}
                </p>
                <p className="text-xs text-dark-muted">{draft.name}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-dark-muted shrink-0 ml-3">
                <Clock size={12} />
                {timeAgo(draft.date)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
