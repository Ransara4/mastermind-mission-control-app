"use client";

import type { Gene, EvolutionEvent } from "@/lib/ml-types";

interface GenePerf {
  timesUsed: number;
  successes: number;
  lastUsed: string | null;
}

function computeGenePerf(events: EvolutionEvent[]): Record<string, GenePerf> {
  const map: Record<string, GenePerf> = {};
  for (const evt of events) {
    for (const geneId of evt.genes_used || []) {
      if (!map[geneId]) {
        map[geneId] = { timesUsed: 0, successes: 0, lastUsed: null };
      }
      map[geneId].timesUsed++;
      if (evt.outcome?.status === "success") map[geneId].successes++;
      const ts = evt.meta?.at as string | undefined;
      if (ts && (!map[geneId].lastUsed || ts > map[geneId].lastUsed!)) {
        map[geneId].lastUsed = ts;
      }
    }
  }
  return map;
}

const CATEGORY_COLORS: Record<string, string> = {
  repair: "bg-dark-danger/20 text-dark-danger",
  optimize: "bg-cm-purple/20 text-cm-purple",
  innovate: "bg-dark-success/20 text-dark-success",
};

function categoryBadge(category: string) {
  const colors = CATEGORY_COLORS[category] || "bg-dark-panel2 text-dark-text";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors}`}>
      {category}
    </span>
  );
}

export default function GenesTable({ genes, events }: { genes: Gene[]; events?: EvolutionEvent[] }) {
  const perfMap = computeGenePerf(events || []);
  if (genes.length === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Genes</h3>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No genes registered
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-4">Genes</h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                ID
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                Category
              </th>
              <th className="text-left text-xs font-medium text-dark-muted uppercase pb-2">
                Signal Matches
              </th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
                Max Files
              </th>
              <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                Used
              </th>
              <th className="text-center text-xs font-medium text-dark-muted uppercase pb-2">
                Success
              </th>
              <th className="text-right text-xs font-medium text-dark-muted uppercase pb-2">
                Last Used
              </th>
            </tr>
          </thead>
          <tbody>
            {genes.map((gene) => (
              <tr key={gene.id} className="border-b border-dark-border/50">
                <td className="py-3 text-sm font-mono font-dm-mono text-dark-text">
                  {gene.id?.replace("gene_gep_", "") ?? gene.id}
                </td>
                <td className="py-3">{categoryBadge(gene.category)}</td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-1">
                    {gene.signals_match.map((sig) => (
                      <span
                        key={sig}
                        className="inline-block px-1.5 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 text-sm text-dark-muted text-right">
                  {gene.constraints.max_files}
                </td>
                <td className="py-3 text-sm text-dark-muted text-center">
                  {perfMap[gene.id]?.timesUsed ?? 0}
                </td>
                <td className="py-3 text-sm text-dark-muted text-center">
                  {perfMap[gene.id]
                    ? `${perfMap[gene.id].successes}/${perfMap[gene.id].timesUsed}`
                    : "—"}
                </td>
                <td className="py-3 text-xs text-dark-muted text-right">
                  {perfMap[gene.id]?.lastUsed
                    ? new Date(perfMap[gene.id].lastUsed!).toLocaleDateString()
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
