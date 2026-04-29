"use client";

import { Loader2, Clock, Sparkles } from "lucide-react";
import type { QueueItem } from "@/lib/stock-photo-types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  return `${mins}m ago`;
}

export default function PipelineQueue({ queue }: { queue: QueueItem[] }) {
  const processing = queue.filter((q) => q.status === "processing");
  const queued = queue.filter((q) => q.status === "queued");

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-violet-500" />
        <h3 className="text-lg font-bold  text-dark-text">Generation Pipeline</h3>
        {processing.length > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 bg-cm-purple/10 text-cm-purple text-xs font-medium rounded-full">
            <Loader2 size={10} className="animate-spin" />
            {processing.length} active
          </span>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="text-center py-8 text-dark-muted">
          <p className="text-sm">Pipeline idle — no pending jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {processing.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 bg-cm-purple/10 border border-cm-purple/20 rounded-lg"
            >
              <Loader2 size={16} className="text-cm-purple animate-spin mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-text truncate">
                  {item.prompt}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-dark-muted">{item.style}</span>
                  {item.startedAt && (
                    <span className="text-xs text-cm-purple">
                      Started {timeAgo(item.startedAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
          {queued.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 p-3 bg-dark-bg border border-dark-border rounded-lg"
            >
              <Clock size={16} className="text-dark-muted mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark-text truncate">
                  {item.prompt}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-dark-muted">{item.style}</span>
                  <span className="text-xs text-dark-muted">
                    Position #{item.position}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
