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
import type { DailyGeneration } from "@/lib/stock-photo-types";

export default function GenerationTrend({ data }: { data: DailyGeneration[] }) {
  if (data.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-bold  text-dark-text mb-4">
          Generation Trend
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          No generation data available yet
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold  text-dark-text">
          Generation Trend
        </h3>
        <span className="text-xs text-dark-muted">Last 30 days</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="genGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,105,199,0.15)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-caption)" }}
              tickFormatter={(d) =>
                new Date(d + "T00:00:00").toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }
              interval={4}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 11, fill: "var(--color-caption)" }}
              width={35}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 11, fill: "var(--color-caption)" }}
              tickFormatter={(v) => `$${v}`}
              width={45}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel2)",
                border: "1px solid rgba(124,105,199,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
              }}
              formatter={(value, name) => {
                const v = value ?? 0;
                if (name === "revenue") return [`$${Number(v).toFixed(2)}`, "Revenue"];
                return [v, "Images"];
              }}
              labelFormatter={(label) =>
                new Date(label + "T00:00:00").toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              }
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="count"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#genGradient)"
              name="count"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#revGradient)"
              name="revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center justify-center gap-6 mt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-violet-500/100" />
          <span className="text-xs text-dark-muted">Images generated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-dark-success/100" />
          <span className="text-xs text-dark-muted">Revenue ($)</span>
        </div>
      </div>
    </div>
  );
}
