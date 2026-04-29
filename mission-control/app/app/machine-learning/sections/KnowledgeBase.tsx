"use client";

import { useState } from "react";
import { BookOpen, TrendingUp, TrendingDown, Minus, Award, ChevronDown, ChevronRight } from "lucide-react";
import type { KnowledgeStats, KnowledgeLesson } from "@/lib/ml-types";

const TREND_CONFIG = {
  improving: { icon: TrendingUp, color: "text-dark-success", bg: "bg-dark-success/10", label: "Improving" },
  declining: { icon: TrendingDown, color: "text-dark-danger", bg: "bg-dark-danger/15 border border-dark-danger/30", label: "Declining" },
  stable: { icon: Minus, color: "text-cm-purple", bg: "bg-cm-purple/10", label: "Stable" },
  none: { icon: Minus, color: "text-dark-muted", bg: "bg-dark-panel2", label: "No data" },
};

export default function KnowledgeBase({
  knowledge,
}: {
  knowledge: (KnowledgeStats & { lessons?: KnowledgeLesson[] }) | undefined;
}) {
  if (!knowledge || knowledge.total_lessons === 0) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Knowledge Base</h3>
        </div>
        <div className="flex items-center justify-center py-8 text-dark-muted">
          No lessons learned yet — knowledge compounds after each evolution cycle
        </div>
      </div>
    );
  }

  const trend = TREND_CONFIG[knowledge.improvement_trend] || TREND_CONFIG.none;
  const TrendIcon = trend.icon;

  return (
    <div className="bg-dark-panel rounded-lg border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-dark-muted" />
          <h3 className="text-lg font-semibold tracking-tight text-dark-text">Knowledge Base</h3>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trend.bg} ${trend.color}`}>
          <TrendIcon size={12} />
          {trend.label}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-dark-panel2 rounded-lg p-3">
          <p className="text-2xl font-bold text-dark-text">{knowledge.total_lessons}</p>
          <p className="text-xs text-dark-muted">Total Lessons</p>
        </div>
        <div className="bg-dark-panel2 rounded-lg p-3">
          <p className="text-2xl font-bold text-dark-text">{(knowledge.avg_confidence * 100).toFixed(0)}%</p>
          <p className="text-xs text-dark-muted">Avg Confidence</p>
        </div>
      </div>

      {/* Top performing genes */}
      {knowledge.top_genes.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Award size={14} className="text-dark-warn" />
            <p className="text-xs font-medium text-dark-muted">Top Performing Genes</p>
          </div>
          <div className="space-y-2">
            {knowledge.top_genes.map((gene) => (
              <div key={gene.gene_id} className="flex items-center justify-between">
                <span className="text-sm font-mono font-dm-mono text-dark-text">
                  {gene.gene_id?.replace("gene_gep_", "") ?? gene.gene_id}
                </span>
                <div className="flex items-center gap-3 text-xs text-dark-muted">
                  <span>{gene.successes}/{gene.applications} success</span>
                  <div className="w-16 h-2 bg-dark-panel2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cm-purple rounded-full"
                      style={{ width: `${gene.avg_confidence * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-medium">
                    {(gene.avg_confidence * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-dark-muted mt-3">
        Lessons never expire — confidence adjusts with each outcome
      </p>

      {/* Individual lessons */}
      {knowledge.lessons && knowledge.lessons.length > 0 && (
        <LessonsList lessons={knowledge.lessons} />
      )}
    </div>
  );
}

function LessonsList({ lessons }: { lessons: KnowledgeLesson[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 border-t border-dark-border pt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-dark-muted hover:text-dark-text transition-colors w-full"
      >
        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        All Lessons ({lessons.length})
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 max-h-80 overflow-y-auto">
          {lessons.map((lesson, i) => (
            <div key={`${lesson.key}-${i}`} className="p-2 bg-dark-panel2 rounded-lg text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-dm-mono text-dark-text truncate">
                  {lesson.key}
                </span>
                <span className="text-dark-muted flex-shrink-0 ml-2">
                  {(lesson.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <div className="flex items-center gap-3 text-dark-muted">
                <span>
                  Gene: {lesson.gene_id?.replace("gene_gep_", "") ?? lesson.gene_id}
                </span>
                <span>
                  {lesson.times_succeeded}/{lesson.times_applied} success
                </span>
                {lesson.environment && <span>Env: {lesson.environment}</span>}
              </div>
              {lesson.last_applied && (
                <p className="text-dark-muted mt-0.5">
                  Last applied {new Date(lesson.last_applied).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
