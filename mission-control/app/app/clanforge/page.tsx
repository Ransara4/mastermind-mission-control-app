"use client";

import { useClanforgeData } from "@/hooks/useClanforgeData";
import {
  RefreshCw,
  Loader2,
  AlertCircle,
  Gamepad2,
  DollarSign,
  Image,
  Palette,
  TrendingUp,
} from "lucide-react";

export default function ClonforgePage() {
  const { data, loading, error, refresh } = useClanforgeData();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cm-purple" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-dark-danger" />
        <p className="text-dark-danger">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { stats, recentOrders, config, status } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cm-purple to-cm-pink flex items-center justify-center text-white text-xl">
            🎮
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-dark-text">ClanForge</h1>
            <p className="text-sm text-dark-muted">
              AI Gaming Logo & Banner Generator
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="p-2 rounded-lg border border-dark-border hover:bg-dark-panel2 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} className="text-dark-muted" />
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Image size={20} />}
          label="Total Orders"
          value={stats.totalOrders.toString()}
          color="blue"
        />
        <StatCard
          icon={<DollarSign size={20} />}
          label="Revenue"
          value={`$${stats.totalRevenue.toFixed(2)}`}
          color="green"
        />
        <StatCard
          icon={<Palette size={20} />}
          label="Top Style"
          value={
            Object.entries(stats.byStyle).sort(
              (a, b) => (b[1] as number) - (a[1] as number)
            )[0]?.[0] || "N/A"
          }
          color="purple"
        />
        <StatCard
          icon={<Gamepad2 size={20} />}
          label="Top Game"
          value={
            Object.entries(stats.byGame).sort(
              (a, b) => (b[1] as number) - (a[1] as number)
            )[0]?.[0] || "N/A"
          }
          color="pink"
        />
      </div>

      {/* Status + Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Agent Status */}
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            <TrendingUp size={18} /> Agent Status
          </h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-muted">Status</span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  status.status === "idle"
                    ? "bg-dark-success/20 text-dark-success"
                    : "bg-dark-warn/20 text-dark-warn"
                }`}
              >
                {status.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Last Run</span>
              <span className="text-dark-text text-sm">
                {status.lastRun
                  ? new Date(status.lastRun).toLocaleString()
                  : "Never"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Available Styles</span>
              <span className="text-dark-text text-sm">
                {config.styles.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-muted">Game Categories</span>
              <span className="text-dark-text text-sm">
                {config.gameCategories.length}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
            <DollarSign size={18} /> Pricing
          </h2>
          <div className="space-y-3">
            {Object.entries(config.pricing).map(([type, price]) => (
              <div key={type} className="flex justify-between items-center">
                <span className="text-dark-text capitalize font-medium">
                  {type}
                </span>
                <span className="text-lg font-bold text-dark-text">
                  ${(price as number).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-dark-border">
            <p className="text-xs text-dark-muted">
              Powered by DALL-E 3 HD • Instant delivery
            </p>
          </div>
        </div>
      </div>

      {/* Breakdown Charts */}
      {stats.totalOrders > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <BreakdownCard title="By Type" data={stats.byType} />
          <BreakdownCard title="By Style" data={stats.byStyle} />
          <BreakdownCard title="By Game" data={stats.byGame} />
        </div>
      )}

      {/* Recent Orders */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Recent Orders
        </h2>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-dark-muted">
            <Image size={40} className="mx-auto mb-2 opacity-50" />
            <p>No orders yet. Generate your first logo!</p>
            <p className="text-xs mt-1">
              CLI: <code className="bg-dark-panel2 px-1 rounded font-dm-mono">node ~/.openclaw/workspace/agents/gaming-logo-gen/src/index.js generate --name &quot;TeamName&quot; --type bundle --style aggressive --game FPS</code>
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-dark-muted border-b border-dark-border">
                  <th className="pb-2 font-medium">Team</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium">Style</th>
                  <th className="pb-2 font-medium">Game</th>
                  <th className="pb-2 font-medium">Price</th>
                  <th className="pb-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-dark-border hover:bg-dark-panel2"
                  >
                    <td className="py-2 font-medium text-dark-text">
                      {order.teamName}
                    </td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 bg-cm-purple/10 text-cm-purple rounded text-xs capitalize">
                        {order.type}
                      </span>
                    </td>
                    <td className="py-2 text-dark-muted capitalize">
                      {order.style}
                    </td>
                    <td className="py-2 text-dark-muted">{order.game}</td>
                    <td className="py-2 font-medium text-dark-text">${order.cost}</td>
                    <td className="py-2 text-dark-muted">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4">
          Quick Reference
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-dark-panel2 rounded-lg p-4">
            <h3 className="font-semibold tracking-tight text-dark-text mb-2">CLI Usage</h3>
            <code className="text-xs text-dark-muted block whitespace-pre-wrap font-dm-mono">
{`node ~/.openclaw/workspace/agents/gaming-logo-gen/src/index.js generate \\
  --name "Shadow Wolves" \\
  --type bundle \\
  --style aggressive \\
  --game FPS \\
  --colors "red,black" \\
  --motto "No mercy"`}
            </code>
          </div>
          <div className="bg-dark-panel2 rounded-lg p-4">
            <h3 className="font-semibold tracking-tight text-dark-text mb-2">Web Server</h3>
            <code className="text-xs text-dark-muted block whitespace-pre-wrap font-dm-mono">
{`# Start the customer-facing landing page
node ~/.openclaw/workspace/agents/gaming-logo-gen/src/web-server.js

# Runs on http://localhost:3847
# Landing page with order form + API endpoints`}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-cm-purple/10 text-cm-purple",
    green: "bg-dark-success/10 text-dark-success",
    purple: "bg-cm-purple/10 text-cm-purple",
    pink: "bg-cm-pink-light text-cm-pink",
  };
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>{icon}</div>
        <div>
          <p className="text-xs text-dark-muted">{label}</p>
          <p className="text-xl font-bold text-dark-text">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BreakdownCard({
  title,
  data,
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="font-semibold tracking-tight text-dark-text mb-3">{title}</h3>
      <div className="space-y-2">
        {entries.map(([key, val]) => (
          <div key={key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-dark-muted capitalize">{key}</span>
              <span className="text-dark-muted">{val}</span>
            </div>
            <div className="w-full bg-dark-panel2 rounded-full h-1.5">
              <div
                className="bg-cm-purple h-1.5 rounded-full"
                style={{ width: `${(val / total) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
