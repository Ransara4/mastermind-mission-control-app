"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ScroogeDashboard } from "@/lib/scrooge-types";

export default function CostTrendChart({
  costTrend,
}: {
  costTrend: ScroogeDashboard["costTrend"];
}) {
  if (costTrend.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-bold  text-dark-text mb-4">
          Daily Cost Trend
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          No cost data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-bold  text-dark-text mb-4">
        Daily Cost Trend
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={costTrend}>
            <defs>
              <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
              tick={{ fontSize: 12, fill: "var(--color-caption)" }}
              tickFormatter={(v) => `$${v.toFixed(3)}`}
              width={60}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel2)",
                border: "1px solid rgba(124,105,199,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={((value: number) => [`$${value.toFixed(4)}`, "Cost"]) as never}
              labelFormatter={(label) =>
                new Date(label + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <Area
              type="monotone"
              dataKey="costUSD"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#costGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
