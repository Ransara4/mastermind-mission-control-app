"use client";

import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import ApiKeyBanner from "@/components/ApiKeyBanner";
import { useStripeData } from "@/hooks/useStripeData";
import type { TimeRange } from "@/lib/stripe-types";
import StatCards from "./sections/StatCards";
import dynamic from "next/dynamic";
const RevenueChart = dynamic(() => import("./sections/RevenueChart"), { ssr: false });
import RecentCharges from "./sections/RecentCharges";
import PayoutReport from "./sections/PayoutReport";
import CouponManager from "./sections/CouponManager";
import PromoCodeManager from "./sections/PromoCodeManager";
import PaymentLinks from "./sections/PaymentLinks";

const TIME_OPTIONS: { label: string; value: TimeRange }[] = [
  { label: "Today", value: "today" },
  { label: "7 days", value: "7d" },
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "All time", value: "all" },
];

export default function StripePage() {
  const { data, loading, error, timeRange, setTimeRange, refresh } =
    useStripeData();

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Stripe data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold text-dark-text mb-2">
          Failed to load data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="stripe" />
      {/* Header + Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text font-bold tracking-tight">Stripe</h1>
          <p className="text-sm text-dark-muted">
            Payments, coupons &amp; revenue tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Filter */}
          <div className="flex items-center bg-dark-panel2 border border-dark-border rounded-lg overflow-hidden">
            {TIME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setTimeRange(opt.value)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  timeRange === opt.value
                    ? "bg-cm-purple text-white"
                    : "text-dark-muted hover:bg-dark-panel2"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Refresh */}
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <StatCards stats={data.stats} />

      {/* Revenue Chart */}
      <RevenueChart revenueTrend={data.revenueTrend} />

      {/* Charges + Payouts side by side on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentCharges charges={data.recentCharges} />
        <PayoutReport
          payoutSummary={data.payoutSummary}
          payouts={data.payouts}
        />
      </div>

      {/* Payment Links */}
      <PaymentLinks paymentLinks={data.paymentLinks} onRefresh={refresh} />

      {/* Coupons + Promo Codes */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <CouponManager coupons={data.coupons} paymentLinks={data.paymentLinks} onRefresh={refresh} />
        <PromoCodeManager
          promoCodes={data.promoCodes}
          coupons={data.coupons}
          paymentLinks={data.paymentLinks}
          onRefresh={refresh}
        />
      </div>
    </div>
  );
}
