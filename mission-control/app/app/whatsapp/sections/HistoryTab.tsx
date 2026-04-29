"use client";

import { Stats } from "./types";

interface HistoryTabProps {
  stats: Stats | undefined;
  topContacts: [string, number][];
}

export function HistoryTab({ stats, topContacts }: HistoryTabProps) {
  return (
    <div className="space-y-6">
      {/* Top contacts */}
      {topContacts.length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Top Recipients</h2>
          <div className="grid grid-cols-5 gap-3">
            {topContacts.map(([name, count]) => (
              <div
                key={name}
                className="bg-dark-panel border border-dark-border rounded-lg p-3 text-center"
              >
                <div className="text-2xl font-bold text-dark-text">{count}</div>
                <div className="text-xs text-dark-muted truncate mt-1" title={name}>
                  {name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Recent Activity ({stats?.history?.length ?? 0} entries)
        </h2>
        {(stats?.history?.length ?? 0) === 0 ? (
          <p className="text-sm text-dark-muted text-center py-8">
            No messages sent yet. Activity will appear here.
          </p>
        ) : (
          <div className="border border-dark-border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-dark-panel2">
                <tr className="text-left text-xs font-medium text-dark-muted uppercase">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">To</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {stats!.history.map((h, i) => (
                  <tr key={i} className="hover:bg-dark-panel2">
                    <td className="px-4 py-2.5 text-sm text-dark-muted">
                      {new Date(h.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 text-sm font-medium text-dark-text">
                      {h.contactName}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                          h.type === "text"
                            ? "bg-dark-success/20 text-dark-success"
                            : "bg-cm-purple/20 text-cm-purple"
                        }`}
                      >
                        {h.type === "text" ? "Text" : "File"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-dark-success font-medium">Sent</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
