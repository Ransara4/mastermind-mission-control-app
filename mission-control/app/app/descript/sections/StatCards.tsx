"use client";

import { FileVideo, Clock, Layers, CheckCircle } from "lucide-react";
import type { DescriptDashboard } from "@/lib/descript-types";

export default function StatCards({
  stats,
}: {
  stats: DescriptDashboard["stats"];
}) {
  const cards = [
    {
      label: "Total Imports",
      value: stats.totalImports.toLocaleString(),
      subtitle: stats.lastImportAt
        ? `Last: ${new Date(stats.lastImportAt).toLocaleDateString()}`
        : "No imports yet",
      icon: FileVideo,
      gradient: "from-purple-500 to-violet-500",
      lightText: "text-purple-100",
    },
    {
      label: "Hours Transcribed",
      value: stats.totalHoursTranscribed.toFixed(1),
      subtitle: `${stats.importsThisMonth} imports this month`,
      icon: Clock,
      gradient: "from-cm-purple to-cm-purple/60",
      lightText: "text-cm-purple",
    },
    {
      label: "Queue Depth",
      value: stats.queueDepth.toLocaleString(),
      subtitle:
        stats.queueDepth === 0
          ? "All caught up"
          : `${stats.queueDepth} awaiting import`,
      icon: Layers,
      gradient: stats.queueDepth > 0 ? "from-amber-500 to-orange-500" : "from-slate-400 to-slate-500",
      lightText: stats.queueDepth > 0 ? "text-amber-100" : "text-dark-muted",
    },
    {
      label: "Success Rate",
      value: `${stats.successRate}%`,
      subtitle: `${stats.importsThisWeek} imports this week`,
      icon: CheckCircle,
      gradient: "from-cm-purple to-cm-purple/60",
      lightText: "text-dark-muted",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.gradient} text-white rounded-lg p-6`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className={`${card.lightText} text-sm`}>{card.label}</p>
              <Icon size={20} className={card.lightText} />
            </div>
            <p className="text-3xl font-bold">{card.value}</p>
            <p className={`text-xs ${card.lightText} mt-1`}>{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
