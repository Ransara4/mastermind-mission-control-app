"use client";

import { Layers, FileVideo } from "lucide-react";
import type { DescriptQueueItem } from "@/lib/descript-types";


function statusBadge(status: string) {
  const styles: Record<string, string> = {
    pending: "bg-dark-warn/20 text-dark-warn",
    importing: "bg-cm-purple/20 text-cm-purple",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] || "bg-dark-panel2 text-dark-muted"
      }`}
    >
      {status === "importing" && (
        <span className="w-1.5 h-1.5 bg-cm-purple rounded-full mr-1.5 animate-pulse" />
      )}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ImportQueue({ queue }: { queue: DescriptQueueItem[] }) {
  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-bold  text-dark-text mb-4 flex items-center gap-2">
        <Layers size={18} className="text-amber-500" />
        Import Queue
        {queue.length > 0 && (
          <span className="ml-auto bg-dark-warn/20 text-dark-warn text-xs font-medium px-2 py-0.5 rounded-full">
            {queue.length} pending
          </span>
        )}
      </h3>

      {queue.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-dark-panel2 rounded-full flex items-center justify-center mx-auto mb-3">
            <FileVideo size={20} className="text-dark-muted" />
          </div>
          <p className="text-sm text-dark-muted">Queue is empty</p>
          <p className="text-xs text-dark-muted mt-1">
            Recordings from Zoom will appear here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">
                  File
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">
                  Meeting
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">
                  Date
                </th>
                <th className="text-left py-2 px-3 text-xs font-medium text-dark-muted uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map((item, i) => (
                <tr key={i} className="hover:bg-dark-bg transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <FileVideo size={14} className="text-dark-muted flex-shrink-0" />
                      <span className="text-dark-text truncate max-w-[200px]">
                        {item.path ? item.path.split("/").pop() : "Unknown"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-dark-muted">
                    {item.meeting || "—"}
                  </td>
                  <td className="py-2.5 px-3 text-dark-muted">
                    {item.date || "—"}
                  </td>
                  <td className="py-2.5 px-3">{statusBadge(item.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
