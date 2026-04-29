"use client";

import { Database, CheckCircle } from "lucide-react";
import type { ScroogeDashboard } from "@/lib/scrooge-types";

const MODEL_COLORS: Record<string, string> = {
  sonnet: "bg-cm-purple",
  haiku: "bg-cm-purple/100",
  opus: "bg-dark-warn/100",
};

function formatUSD(value: number): string {
  if (value < 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
}

function ModelBars({
  models,
}: {
  models: ScroogeDashboard["modelBreakdown"];
}) {
  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-dark-muted">No model data yet</div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map((m) => (
        <div key={m.model}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-dark-text capitalize">
              {m.model}
            </span>
            <span className="text-sm text-dark-muted">
              {formatUSD(m.costUSD)} · {m.requests} req · {m.percentOfTotal.toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-dark-panel2 rounded-full h-3">
            <div
              className={`h-full rounded-full ${MODEL_COLORS[m.model] || "bg-dark-bg0"}`}
              style={{ width: `${Math.max(m.percentOfTotal, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function StrategiesTable({
  strategies,
}: {
  strategies: ScroogeDashboard["strategies"];
}) {
  if (strategies.length === 0) {
    return (
      <div className="text-center py-8 text-dark-muted">
        No optimization strategies tracked yet
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-dark-border">
          <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
            Strategy
          </th>
          <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
            Uses
          </th>
          <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
            Tokens Saved
          </th>
          <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
            Cost Saved
          </th>
        </tr>
      </thead>
      <tbody>
        {strategies.map((s) => (
          <tr key={s.name} className="border-b border-slate-50">
            <td className="py-2 text-sm font-medium text-dark-text capitalize">
              {s.name}
            </td>
            <td className="py-2 text-sm text-dark-muted text-right">
              {s.uses}
            </td>
            <td className="py-2 text-sm text-dark-muted text-right">
              {s.tokensSaved.toLocaleString()}
            </td>
            <td className="py-2 text-sm text-dark-muted text-right">
              {formatUSD(s.costSavedUSD)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DataSources({
  dataSources,
}: {
  dataSources: ScroogeDashboard["dataSources"];
}) {
  const { metricsJson } = dataSources;

  return (
    <div className="flex items-center gap-3 text-sm">
      <Database size={16} className="text-dark-muted" />
      <span className="text-dark-muted">metrics.json</span>
      {metricsJson.available ? (
        <>
          <CheckCircle size={14} className="text-dark-success" />
          <span className="text-dark-muted">
            {metricsJson.recordCount} records
          </span>
        </>
      ) : (
        <span className="text-dark-muted">Not found</span>
      )}
    </div>
  );
}

export default function ModelBreakdown({
  modelBreakdown,
  strategies,
  dataSources,
}: {
  modelBreakdown: ScroogeDashboard["modelBreakdown"];
  strategies: ScroogeDashboard["strategies"];
  dataSources: ScroogeDashboard["dataSources"];
}) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="text-lg font-bold  text-dark-text mb-4">
            Cost by Model
          </h3>
          <ModelBars models={modelBreakdown} />
        </div>

        <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
          <h3 className="text-lg font-bold  text-dark-text mb-4">
            Optimization Strategies
          </h3>
          <StrategiesTable strategies={strategies} />
        </div>
      </div>

      <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
        <h3 className="text-sm font-medium text-dark-text mb-2">
          Data Sources
        </h3>
        <DataSources dataSources={dataSources} />
      </div>
    </>
  );
}
