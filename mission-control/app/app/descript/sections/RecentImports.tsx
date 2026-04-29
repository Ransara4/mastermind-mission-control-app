"use client";

import { FileCheck, XCircle, Clock } from "lucide-react";
import type { DescriptImport } from "@/lib/descript-types";

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function RecentImports({
  imports,
}: {
  imports: DescriptImport[];
}) {
  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-bold  text-dark-text mb-4 flex items-center gap-2">
        <FileCheck size={18} className="text-purple-500" />
        Recent Imports
        {imports.length > 0 && (
          <span className="ml-auto text-xs text-dark-muted">
            {imports.length} shown
          </span>
        )}
      </h3>

      {imports.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-dark-panel2 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock size={20} className="text-dark-muted" />
          </div>
          <p className="text-sm text-dark-muted">No imports yet</p>
          <p className="text-xs text-dark-muted mt-1">
            Completed imports will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {imports.map((imp, i) => {
            const filename = imp.path ? imp.path.split("/").pop() : "Unknown file";
            const failed = imp.status === "failed";
            return (
              <div
                key={i}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  failed
                    ? "bg-dark-danger/10 border-dark-danger/20"
                    : "bg-dark-bg border-dark-border hover:bg-dark-panel2"
                }`}
              >
                {failed ? (
                  <XCircle size={16} className="text-dark-danger flex-shrink-0" />
                ) : (
                  <FileCheck
                    size={16}
                    className="text-dark-success flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      failed ? "text-dark-danger" : "text-dark-text"
                    }`}
                  >
                    {filename}
                  </p>
                  <p className="text-xs text-dark-muted">
                    {imp.meeting || "Manual import"}
                    {imp.duration
                      ? ` · ${Math.round(imp.duration / 60)}min`
                      : ""}
                    {imp.wordCount
                      ? ` · ${imp.wordCount.toLocaleString()} words`
                      : ""}
                  </p>
                </div>
                <span className="text-xs text-dark-muted flex-shrink-0">
                  {imp.importedAt ? formatRelativeTime(imp.importedAt) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
