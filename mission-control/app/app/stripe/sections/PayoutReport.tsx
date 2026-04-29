"use client";

import { Banknote, Clock, CalendarCheck, ArrowRight } from "lucide-react";
import type { StripeDashboard, StripePayout } from "@/lib/stripe-types";

const PAYOUT_STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  paid: { bg: "bg-dark-success/20", text: "text-dark-success", label: "Paid" },
  pending: { bg: "bg-dark-warn/20", text: "text-dark-warn", label: "Pending" },
  in_transit: {
    bg: "bg-cm-purple/20",
    text: "text-cm-purple",
    label: "In Transit",
  },
  failed: { bg: "bg-dark-danger/20", text: "text-dark-danger", label: "Failed" },
  canceled: { bg: "bg-dark-panel2", text: "text-dark-muted", label: "Canceled" },
};

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default function PayoutReport({
  payoutSummary,
  payouts,
}: {
  payoutSummary: StripeDashboard["payoutSummary"];
  payouts: StripePayout[];
}) {
  const summaryCards = [
    {
      label: "Total Paid Out",
      value: formatCurrency(payoutSummary.totalPaid),
      icon: Banknote,
      color: "text-dark-success",
      bg: "bg-dark-success/10",
    },
    {
      label: "Pending",
      value: formatCurrency(payoutSummary.pending),
      icon: Clock,
      color: "text-dark-warn",
      bg: "bg-dark-warn/10",
    },
    {
      label: "Next Payout Date",
      value: payoutSummary.nextPayoutDate
        ? new Date(payoutSummary.nextPayoutDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "N/A",
      icon: CalendarCheck,
      color: "text-cm-purple",
      bg: "bg-cm-purple/10",
    },
    {
      label: "Next Payout Amount",
      value: payoutSummary.nextPayoutAmount
        ? formatCurrency(payoutSummary.nextPayoutAmount)
        : "N/A",
      icon: ArrowRight,
      color: "text-cm-purple-mid",
      bg: "bg-cm-purple/10",
    },
  ];

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight mb-4">Payouts</h3>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`${card.bg} rounded-lg p-3 border border-dark-border`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon size={14} className={card.color} />
                <span className="text-xs text-dark-muted">{card.label}</span>
              </div>
              <p className={`text-lg font-semibold ${card.color}`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Payout list */}
      {payouts.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-dark-muted text-sm">
          No payouts found for this period
        </div>
      ) : (
        <div className="overflow-x-auto max-h-64 overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-dark-panel">
              <tr className="border-b border-dark-border">
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Arrival Date
                </th>
                <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
                  Amount
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                  Method
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {payouts.map((payout) => {
                const badge = PAYOUT_STATUS_BADGE[payout.status] ||
                  PAYOUT_STATUS_BADGE.pending;
                return (
                  <tr key={payout.id} className="hover:bg-dark-panel2">
                    <td className="py-2.5 text-sm text-dark-text">
                      {new Date(payout.arrivalDate).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </td>
                    <td className="py-2.5 text-sm font-medium text-dark-text text-right">
                      {formatCurrency(payout.amount, payout.currency)}
                    </td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}
                      >
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-2.5 text-xs text-dark-muted capitalize">
                      {payout.method}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
