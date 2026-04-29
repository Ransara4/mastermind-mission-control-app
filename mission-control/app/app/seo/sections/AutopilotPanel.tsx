"use client";

import { useState } from "react";
import { Loader2, Play, RotateCw, ChevronDown, ChevronRight, Check, X } from "lucide-react";
import type { AutopilotResult } from "@/lib/seo-types";
import SerpPreview from "./SerpPreview";

interface Props {
  domain: string;
  lastResult: AutopilotResult | null;
  onComplete: (result: AutopilotResult) => void;
}

const PHASES = [
  { icon: "\u{1F577}\uFE0F", label: "Crawling site pages..." },
  { icon: "\u{1F50D}", label: "Running deep page audit..." },
  { icon: "\u2699\uFE0F", label: "Technical check..." },
  { icon: "\u{1F4CA}", label: "Analyzing schema markup..." },
  { icon: "\u{1F4C8}", label: "Checking keyword rankings..." },
  { icon: "\u{1F4CB}", label: "Building fix queue..." },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function gradeColor(grade: string): string {
  if (grade === "A") return "text-dark-success";
  if (grade === "B") return "text-dark-success";
  if (grade === "C") return "text-dark-warn";
  if (grade === "D") return "text-dark-muted";
  return "text-dark-danger";
}

function gradeBg(grade: string): string {
  if (grade === "A" || grade === "B") return "bg-dark-success/10 border-dark-success/30";
  if (grade === "C") return "bg-dark-warn/10 border-dark-warn/30";
  if (grade === "F") return "bg-dark-danger/10 border-dark-danger/30";
  return "bg-dark-panel2 border-dark-border";
}

export default function AutopilotPanel({ domain, lastResult, onComplete }: Props) {
  const [running, setRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhases, setExpandedPhases] = useState(false);

  const runAutopilot = async () => {
    setRunning(true);
    setCurrentPhase(0);
    setError(null);

    // Simulate phase progression based on time (visual only)
    const phaseInterval = setInterval(() => {
      setCurrentPhase((prev) => Math.min(prev + 1, PHASES.length - 1));
    }, 5000);

    try {
      const res = await fetch("/api/seo/autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
      });

      clearInterval(phaseInterval);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Autopilot failed");
      }

      const result: AutopilotResult = await res.json();
      setCurrentPhase(PHASES.length - 1);
      onComplete(result);
    } catch (err: any) {
      clearInterval(phaseInterval);
      setError(err.message || "Autopilot failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text">SEO Autopilot</h2>
        {lastResult && (
          <span className="text-xs text-dark-muted">
            Last run: {timeAgo(lastResult.runAt)} ({(lastResult.durationMs / 1000).toFixed(1)}s)
          </span>
        )}
      </div>

      {/* Running state */}
      {running && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-dark-muted">
            <Loader2 size={16} className="animate-spin text-cm-purple" />
            <span>Running autopilot... this takes ~30 seconds</span>
          </div>
          <div className="space-y-2">
            {PHASES.map((phase, i) => (
              <div
                key={i}
                className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-all ${
                  i < currentPhase
                    ? "text-dark-text bg-dark-success/10"
                    : i === currentPhase
                    ? "text-cm-purple bg-cm-purple/10 font-medium"
                    : "text-dark-muted"
                }`}
              >
                {i < currentPhase ? (
                  <Check size={14} className="text-dark-success" />
                ) : i === currentPhase ? (
                  <Loader2 size={14} className="animate-spin text-cm-purple" />
                ) : (
                  <span className="w-3.5" />
                )}
                <span>{phase.icon}</span>
                <span>{phase.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !running && (
        <div className="flex items-center gap-3 p-3 bg-dark-danger/10 border border-dark-danger/30 rounded-lg mb-4">
          <X size={16} className="text-dark-danger" />
          <p className="text-sm text-dark-danger flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-dark-danger hover:text-dark-danger text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* No result yet */}
      {!lastResult && !running && (
        <div className="text-center py-6">
          <p className="text-sm text-dark-muted mb-4">
            No autopilot run yet. Run a full analysis to crawl your site, audit every page, check technical SEO, analyze schema, and check keyword rankings.
          </p>
          <button
            onClick={runAutopilot}
            className="inline-flex items-center gap-2 px-6 py-3 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors font-medium"
          >
            <Play size={18} />
            Run Full SEO Autopilot
          </button>
        </div>
      )}

      {/* Has result */}
      {lastResult && !running && (
        <div className="space-y-4">
          {/* Score summary */}
          <div className={`flex items-center gap-6 p-4 rounded-lg border ${gradeBg(lastResult.summary.grade)}`}>
            <div className={`text-4xl font-bold ${gradeColor(lastResult.summary.grade)}`}>
              {lastResult.summary.grade}
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-dark-text">{lastResult.summary.score}/100
                <span className="ml-2 text-xs font-normal text-dark-muted">{domain}</span>
              </p>
              <p className="text-sm text-dark-muted">
                {lastResult.summary.pagesScanned} pages scanned
                {" \u2022 "}
                {lastResult.summary.critical} critical
                {" \u2022 "}
                {lastResult.summary.warnings} warnings
                {" \u2022 "}
                {timeAgo(lastResult.runAt)}
              </p>
            </div>
            <button
              onClick={runAutopilot}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors font-medium text-sm"
            >
              <RotateCw size={15} />
              Run Again
            </button>
          </div>

          {/* Fix type breakdown */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-dark-success/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-dark-success">{lastResult.summary.autoFixable}</p>
              <p className="text-xs text-dark-success">Auto-fixable</p>
            </div>
            <div className="p-3 bg-cm-purple/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-cm-purple">{lastResult.summary.claudeFixable}</p>
              <p className="text-xs text-cm-purple">Claude Code</p>
            </div>
            <div className="p-3 bg-dark-panel2 rounded-lg text-center">
              <p className="text-2xl font-bold text-dark-muted">{lastResult.summary.manualItems}</p>
              <p className="text-xs text-dark-muted">Manual</p>
            </div>
          </div>

          {/* Collapsible phase results */}
          <div>
            <button
              onClick={() => setExpandedPhases(!expandedPhases)}
              className="flex items-center gap-1 text-sm text-dark-muted hover:text-dark-text transition-colors"
            >
              {expandedPhases ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Phase details
            </button>
            {expandedPhases && (
              <div className="mt-2 space-y-1 pl-1">
                <PhaseRow
                  label="Crawl"
                  ok={lastResult.phases.crawl.ok}
                  detail={`${lastResult.phases.crawl.pagesFound} pages found`}
                />
                <PhaseRow
                  label="Audit"
                  ok={lastResult.phases.audit.ok}
                  detail={`Score: ${lastResult.phases.audit.score}/100 (${lastResult.phases.audit.grade})`}
                />
                <PhaseRow
                  label="Technical"
                  ok={lastResult.phases.technical.ok}
                  detail={`${lastResult.phases.technical.issues.filter((i) => i.severity !== "pass").length} issues`}
                />
                <PhaseRow
                  label="Schema"
                  ok={lastResult.phases.schema.ok}
                  detail={`${lastResult.phases.schema.existing.length} found, ${lastResult.phases.schema.suggestions.length} suggestions`}
                />
                <PhaseRow
                  label="Rankings"
                  ok={lastResult.phases.rankings.ok}
                  detail={`${lastResult.phases.rankings.checked} keywords checked`}
                />
              </div>
            )}
          </div>

          {/* SERP Preview — show if we have title + description from crawl data */}
          {(() => {
            // Try to get homepage data: look for homepage in worstPages, else use first page
            const pages = lastResult.phases.crawl.worstPages ?? [];
            const homePage =
              pages.find(
                (p) =>
                  p.url === `https://${domain}/` ||
                  p.url === `https://www.${domain}/` ||
                  p.url === `http://${domain}/`
              ) ?? pages[0];

            const title =
              (lastResult as any).siteProps?.title ||
              homePage?.title ||
              "";
            const description =
              (lastResult as any).siteProps?.description ||
              homePage?.metaDesc ||
              "";
            const siteName =
              (lastResult as any).profile?.title ||
              domain;

            if (!title && !description) return null;

            return (
              <SerpPreview
                title={title}
                url={`https://${domain}/`}
                description={description}
                siteName={siteName}
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}

function PhaseRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1">
      {ok ? (
        <Check size={14} className="text-dark-success" />
      ) : (
        <X size={14} className="text-dark-danger" />
      )}
      <span className="font-medium text-dark-text w-20">{label}</span>
      <span className="text-dark-muted">{detail}</span>
    </div>
  );
}
