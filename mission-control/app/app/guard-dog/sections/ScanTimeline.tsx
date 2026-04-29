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
import type { GuardDogDashboard } from "@/lib/guard-dog-types";

export default function ScanTimeline({
  dailyTrend,
}: {
  dailyTrend: GuardDogDashboard["dailyTrend"];
}) {
  if (dailyTrend.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          📊 Patrol Log
        </h3>
        <div className="flex items-center justify-center py-12 text-dark-muted">
          🐕 No patrol data yet — good boy is standing by
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
        📊 Patrol Log
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dailyTrend}>
            <defs>
              <linearGradient id="barkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="whineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="silentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
              allowDecimals={false}
              width={40}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-panel)",
                border: "1px solid rgba(124,105,199,0.15)",
                borderRadius: "8px",
                fontSize: "13px",
                color: "var(--color-text)",
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
              type="monotone"
              dataKey="bark"
              stackId="1"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#barkGradient)"
              name="BARK"
            />
            <Area
              type="monotone"
              dataKey="whine"
              stackId="1"
              stroke="#f59e0b"
              strokeWidth={2}
              fill="url(#whineGradient)"
              name="WHINE"
            />
            <Area
              type="monotone"
              dataKey="silent"
              stackId="1"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#silentGradient)"
              name="SILENT"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
