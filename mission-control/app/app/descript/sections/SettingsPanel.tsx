"use client";

import { useState } from "react";
import { Settings, ChevronDown, ChevronRight } from "lucide-react";
import type { DescriptDashboard } from "@/lib/descript-types";

export default function SettingsPanel({
  config,
  status,
}: {
  config: DescriptDashboard["config"];
  status: DescriptDashboard["status"];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 hover:bg-dark-bg transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Settings size={20} className="text-dark-muted" />
          <span className="font-semibold text-dark-text">
            Configuration
          </span>
        </div>
        {open ? (
          <ChevronDown size={20} className="text-dark-muted" />
        ) : (
          <ChevronRight size={20} className="text-dark-muted" />
        )}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-dark-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Descript App Path
              </label>
              <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text">
                {config.descriptApp}
              </code>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Auto-Import
              </label>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    config.autoOpenOnQueue ? "bg-cm-purple" : "bg-dark-danger"
                  }`}
                />
                <span className="text-sm text-dark-muted">
                  {config.autoOpenOnQueue ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              Zoom Queue Path
            </label>
            <code className="text-sm bg-dark-panel2 px-3 py-1.5 rounded-lg block text-dark-text truncate">
              {config.zoomQueuePath}
            </code>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Agent Status
              </label>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status.enabled ? "bg-cm-purple" : "bg-dark-danger"
                  }`}
                />
                <span className="text-sm text-dark-muted">
                  {status.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">
                Last Run
              </label>
              <span className="text-sm text-dark-muted">
                {status.lastRun
                  ? new Date(status.lastRun).toLocaleString()
                  : "Never"}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-dark-border">
            <p className="text-xs text-dark-muted">
              Config file:{" "}
              <code className="bg-dark-panel2 px-1.5 py-0.5 rounded">
                ~/.openclaw/workspace/agents/descript/config/config.json
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
