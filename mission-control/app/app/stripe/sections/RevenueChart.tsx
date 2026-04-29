"use client";

import { useState, useMemo } from "react";
import {
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
} from "recharts";
import type { StripeDashboard } from "@/lib/stripe-types";

type ChartMode = "cumulative" | "daily";

export default function RevenueChart({
  revenueTrend,
}: {
  revenueTrend: StripeDashboard["revenueTrend"];
}) {
  const [mode, setMode] = useState<ChartMode>("cumulative");

  const chartData = useMemo(() => {
    const daily = revenueTrend.map((d) => ({
      date: d.date,
      revenue: d.amount / 100,
      charges: d.count,
    }));

    if (mode === "daily") return daily;

    // Cumulative: running total
    let runningRevenue = 0;
    let runningCharges = 0;
    return daily.map((d) => {
      runningRevenue += d.revenue;
      runningCharges += d.charges;
      return {
        date: d.date,
        revenue: runningRevenue,
        charges: runningCharges,
      };
    });
  }, [revenueTrend, mode]);

  if (revenueTrend.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight mb-4">
          Revenue Trend
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          No revenue data available for this period
        </div>
      </div>
    );
  }

  const totalRevenue = revenueTrend.reduce((sum, d) => sum + d.amount, 0) / 100;
  const totalCharges = revenueTrend.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-dark-text font-semibold tracking-tight">
            Revenue Trend
          </h3>
          <p className="text-xs text-dark-muted mt-0.5">
            {mode === "cumulative" ? "Cumulative" : "Daily"} &mdash;{" "}
            ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{" "}
            total from {totalCharges} charges
          </p>
        </div>
        <div className="flex items-center bg-dark-panel2 rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("cumulative")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "cumulative"
                ? "bg-cm-purple text-white"
                : "text-dark-muted hover:bg-dark-panel2"
            }`}
          >
            Cumulative
          </button>
          <button
            onClick={() => setMode("daily")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === "daily"
                ? "bg-cm-purple text-white"
                : "text-dark-muted hover:bg-dark-panel2"
            }`}
          >
            Daily
          </button>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient
                id="revenueGradient"
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor={mode === "cumulative" ? "#7C69C7" : "#7C69C7"}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={mode === "cumulative" ? "#7C69C7" : "#7C69C7"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,105,199,0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: "var(--color-caption)" }}
              tickFormatter={(d) =>
                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <YAxis
              yAxisId="revenue"
              tick={{ fontSize: 12, fill: "var(--color-caption)" }}
              tickFormatter={(v) =>
                `$${v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}`
              }
              width={65}
            />
            <YAxis
              yAxisId="charges"
              orientation="right"
              tick={{ fontSize: 12, fill: "var(--color-caption)" }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel2)",
                border: "1px solid rgba(124,105,199,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--color-text)",
              }}
              formatter={((value: number, name: string) => {
                if (name === "revenue")
                  return [
                    `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                    mode === "cumulative" ? "Total Revenue" : "Daily Revenue",
                  ];
                return [value, mode === "cumulative" ? "Total Charges" : "Daily Charges"];
              // eslint-disable-next-line
              }) as any}
              labelFormatter={(label) =>
                new Date(label + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <Area
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke={mode === "cumulative" ? "#7C69C7" : "#7C69C7"}
              strokeWidth={2}
              fill="url(#revenueGradient)"
            />
            <Bar
              yAxisId="charges"
              dataKey="charges"
              fill={mode === "cumulative" ? "#9d8de0" : "#9d8de0"}
              opacity={0.5}
              radius={[2, 2, 0, 0]}
              barSize={12}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-dark-muted">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-3 h-0.5 rounded ${
              mode === "cumulative" ? "bg-cm-purple" : "bg-cm-purple"
            }`}
          />
          {mode === "cumulative" ? "Cumulative Revenue" : "Daily Revenue"}
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className={`w-3 h-3 rounded-sm opacity-50 ${
              mode === "cumulative" ? "bg-dark-success/60" : "bg-cm-purple/60"
            }`}
          />
          {mode === "cumulative" ? "Cumulative Charges" : "Daily Charges"}
        </div>
      </div>
    </div>
  );
}
