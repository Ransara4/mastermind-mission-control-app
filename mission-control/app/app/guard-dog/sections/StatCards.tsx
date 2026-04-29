"use client";

import { Shield, AlertTriangle, AlertOctagon, CheckCircle } from "lucide-react";
import type { GuardDogDashboard } from "@/lib/guard-dog-types";

export default function StatCards({ stats }: { stats: GuardDogDashboard["stats"] }) {
  const cards = [
    {
      label: "Total Scans",
      value: stats.totalScans.toLocaleString(),
      subtitle: stats.lastScanAt
        ? `Last: ${new Date(stats.lastScanAt).toLocaleDateString()}`
        : "No scans yet",
      icon: Shield,
      bg: "bg-dark-panel",
      accent: "text-cm-purple",
      border: "border-dark-border",
    },
    {
      label: "Threats Found",
      value: stats.dangerCount.toLocaleString(),
      subtitle: "BARK alerts",
      icon: AlertOctagon,
      bg: stats.dangerCount > 0 ? "bg-dark-danger/10" : "bg-dark-panel",
      accent: stats.dangerCount > 0 ? "text-dark-danger" : "text-dark-muted",
      border: stats.dangerCount > 0 ? "border-dark-danger/30" : "border-dark-border",
    },
    {
      label: "Suspicious",
      value: stats.suspiciousCount.toLocaleString(),
      subtitle: "WHINE warnings",
      icon: AlertTriangle,
      bg: stats.suspiciousCount > 0 ? "bg-dark-warn/10" : "bg-dark-panel",
      accent: stats.suspiciousCount > 0 ? "text-dark-warn" : "text-dark-muted",
      border: stats.suspiciousCount > 0 ? "border-dark-warn/30" : "border-dark-border",
    },
    {
      label: "Clean Rate",
      value: `${stats.cleanRate.toFixed(1)}%`,
      subtitle: `${stats.safeCount} safe of ${stats.totalScans} total`,
      icon: CheckCircle,
      bg: "bg-dark-panel",
      accent: "text-dark-success",
      border: "border-dark-border",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className={`${card.bg} rounded-xl border ${card.border} p-5`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-dark-muted uppercase tracking-wider">{card.label}</p>
              <Icon size={18} className={card.accent} />
            </div>
            <p className={`text-2xl font-bold ${card.accent}`}>{card.value}</p>
            <p className="text-xs text-dark-muted mt-1">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
