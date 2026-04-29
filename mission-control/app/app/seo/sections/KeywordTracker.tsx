"use client";

import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { SeoKeyword } from "@/hooks/useSeoData";

interface Props {
  keywords: SeoKeyword[];
}

function RankIndicator({ rank, target }: { rank: string; target: string }) {
  const r = parseInt(rank);
  const t = parseInt(target);
  if (isNaN(r) || isNaN(t)) return <Minus size={14} className="text-dark-muted" />;
  if (r <= t) return <TrendingUp size={14} className="text-dark-success" />;
  if (r <= t + 5) return <Minus size={14} className="text-dark-warn" />;
  return <TrendingDown size={14} className="text-dark-danger" />;
}

export default function KeywordTracker({ keywords }: Props) {
  if (keywords.length === 0) {
    return (
      <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
        <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3 flex items-center gap-2">
          <Target size={16} className="text-cm-purple" />
          Keyword Rankings
        </h3>
        <div className="bg-dark-panel2 border border-dashed border-dark-border rounded-xl p-8 text-center">
          <p className="text-sm text-dark-muted italic">
            No keywords tracked yet. Add rows to this site&apos;s keywords.md file.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
        <Target size={16} className="text-cm-purple" />
        Keyword Rankings
        <span className="ml-auto text-xs text-dark-muted font-normal">
          {keywords.length} tracked
        </span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-dark-muted border-b border-dark-border">
              <th className="pb-2 font-medium">Keyword</th>
              <th className="pb-2 font-medium text-center">Rank</th>
              <th className="pb-2 font-medium text-center">Target</th>
              <th className="pb-2 font-medium text-center">KD</th>
              <th className="pb-2 font-medium text-center">Vol</th>
              <th className="pb-2 font-medium text-center">Status</th>
              <th className="pb-2 font-medium text-right">Checked</th>
            </tr>
          </thead>
          <tbody>
            {keywords.map((kw) => (
              <tr key={kw.keyword} className="border-b border-dark-border hover:bg-dark-panel2">
                <td className="py-2.5 font-medium text-dark-text">{kw.keyword}</td>
                <td className="py-2.5 text-center">
                  <span className="inline-flex items-center justify-center w-8 h-6 rounded bg-dark-panel2 text-xs font-bold text-dark-text">
                    {kw.rank}
                  </span>
                </td>
                <td className="py-2.5 text-center text-dark-muted">{kw.target}</td>
                <td className="py-2.5 text-center text-dark-muted">{kw.difficulty}</td>
                <td className="py-2.5 text-center text-dark-muted">{kw.volume}</td>
                <td className="py-2.5 flex justify-center">
                  <RankIndicator rank={kw.rank} target={kw.target} />
                </td>
                <td className="py-2.5 text-right text-xs text-dark-muted">{kw.lastChecked}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
