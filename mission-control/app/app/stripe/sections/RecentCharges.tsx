"use client";

import type { StripeCharge } from "@/lib/stripe-types";

const STATUS_BADGE: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  succeeded: {
    bg: "bg-dark-success/20",
    text: "text-dark-success",
    label: "Succeeded",
  },
  failed: { bg: "bg-dark-danger/20", text: "text-dark-danger", label: "Failed" },
  pending: { bg: "bg-dark-warn/20", text: "text-dark-warn", label: "Pending" },
};

function formatCurrency(amount: number, currency: string = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function timeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentCharges({
  charges,
}: {
  charges: StripeCharge[];
}) {
  if (charges.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight mb-4">
          Recent Charges
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          No charges found for this period
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight">
          Recent Charges
        </h3>
        <span className="text-xs text-dark-muted">
          {charges.length} charge{charges.length !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-dark-panel">
            <tr className="border-b border-dark-border">
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-3 pr-4">
                Date
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-3 pr-4">
                Description
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-3 pr-4">
                Customer
              </th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-3 pr-4">
                Amount
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-3 pr-4">
                Status
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-3">
                Method
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {charges.map((charge) => {
              const badge = charge.refunded
                ? {
                    bg: "bg-dark-warn/20",
                    text: "text-dark-warn",
                    label: "Refunded",
                  }
                : STATUS_BADGE[charge.status] || {
                    bg: "bg-dark-panel2",
                    text: "text-dark-muted",
                    label: charge.status,
                  };

              return (
                <tr key={charge.id} className="hover:bg-dark-panel2">
                  <td className="py-3 pr-4">
                    <div className="text-sm text-dark-text">
                      {new Date(charge.created).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                    <div className="text-xs text-dark-muted">
                      {timeAgo(charge.created)}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-dark-text truncate block max-w-[200px]">
                      {charge.description || "No description"}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-dark-muted truncate block max-w-[180px]">
                      {charge.customerEmail || "N/A"}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-medium text-dark-text">
                      {formatCurrency(charge.amount, charge.currency)}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-xs text-dark-muted">
                      {charge.paymentMethod || "N/A"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
