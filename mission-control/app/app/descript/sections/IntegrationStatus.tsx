"use client";

import { Link2, Video, Monitor, Zap } from "lucide-react";
import type { DescriptDashboard } from "@/lib/descript-types";

function StatusDot({ active }: { active: boolean }) {
  return (
    <div
      className={`w-2.5 h-2.5 rounded-full ${
        active ? "bg-cm-purple" : "bg-dark-danger"
      }`}
    />
  );
}

export default function IntegrationStatus({
  integrations,
  config,
}: {
  integrations: DescriptDashboard["integrations"];
  config: DescriptDashboard["config"];
}) {
  const items = [
    {
      label: "Descript App",
      icon: Monitor,
      active: integrations.descriptApp,
      detail: integrations.descriptApp
        ? config.descriptApp
        : "Not installed — download from descript.com",
    },
    {
      label: "Zoom Agent",
      icon: Video,
      active: integrations.zoomAgent,
      detail: integrations.zoomAgent
        ? "Queue connected"
        : "Queue file not found",
    },
    {
      label: "Auto-Import",
      icon: Zap,
      active: integrations.autoImport,
      detail: integrations.autoImport
        ? "Files auto-open in Descript"
        : "Manual import mode",
    },
  ];

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-bold  text-dark-text mb-4 flex items-center gap-2">
        <Link2 size={18} className="text-dark-muted" />
        Integrations
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="border border-dark-border rounded-lg p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon size={16} className="text-dark-muted" />
                <span className="text-sm font-medium text-dark-text">
                  {item.label}
                </span>
                <div className="ml-auto">
                  <StatusDot active={item.active} />
                </div>
              </div>
              <p
                className={`text-xs ${
                  item.active ? "text-dark-muted" : "text-dark-muted"
                }`}
              >
                {item.detail}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
