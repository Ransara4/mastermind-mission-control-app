"use client";

import {
  DollarSign,
  TrendingUp,
  CheckCircle,
  XCircle,
  RotateCcw,
  Repeat,
  Tag,
  Target,
} from "lucide-react";
import type { StripeDashboard } from "@/lib/stripe-types";

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function StatCards({
  stats,
}: {
  stats: StripeDashboard["stats"];
}) {
  const successRate =
    stats.totalCharges > 0
      ? ((stats.successfulCharges / stats.totalCharges) * 100).toFixed(1)
      : "0.0";

  const cards = [
    {
      label: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      subtitle: "All successful charges",
      icon: DollarSign,
      accent: "text-cm-purple",
      iconBg: "bg-cm-purple/15",
    },
    {
      label: "Monthly Revenue",
      value: formatCurrency(stats.monthlyRevenue),
      subtitle: "Last 30 days",
      icon: TrendingUp,
      accent: "text-cm-purple",
      iconBg: "bg-cm-purple/15",
    },
    {
      label: "Successful Charges",
      value: stats.successfulCharges.toLocaleString(),
      subtitle: `of ${stats.totalCharges.toLocaleString()} total`,
      icon: CheckCircle,
      accent: "text-dark-success",
      iconBg: "bg-dark-success/15",
    },
    {
      label: "Failed Charges",
      value: stats.failedCharges.toLocaleString(),
      subtitle: "Payment failures",
      icon: XCircle,
      accent: "text-dark-danger",
      iconBg: "bg-dark-danger/15",
    },
    {
      label: "Refunded Amount",
      value: formatCurrency(stats.refundedAmount),
      subtitle: "Total refunds issued",
      icon: RotateCcw,
      accent: "text-dark-muted",
      iconBg: "bg-dark-panel2",
    },
    {
      label: "Active Subscriptions",
      value: stats.activeSubscriptions.toLocaleString(),
      subtitle: "Currently active",
      icon: Repeat,
      accent: "text-cm-purple",
      iconBg: "bg-cm-purple/15",
    },
    {
      label: "Active Coupons",
      value: stats.activeCoupons.toLocaleString(),
      subtitle: "Valid discount codes",
      icon: Tag,
      accent: "text-cm-purple-mid",
      iconBg: "bg-cm-purple/10",
    },
    {
      label: "Success Rate",
      value: `${successRate}%`,
      subtitle: "Charge success ratio",
      icon: Target,
      accent: "text-dark-success",
      iconBg: "bg-dark-success/15",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.label}
            className="bg-dark-panel border border-dark-border rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-dark-muted text-sm">{card.label}</p>
              <div className={`p-1.5 rounded-lg ${card.iconBg}`}>
                <Icon size={15} className={card.accent} />
              </div>
            </div>
            <p className="text-2xl font-bold text-dark-text">{card.value}</p>
            <p className="text-xs text-dark-muted mt-1">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
