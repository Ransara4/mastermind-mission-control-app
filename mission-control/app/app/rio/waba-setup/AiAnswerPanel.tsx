"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import remarkGfm from "remark-gfm";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });
import { Zap, ChevronDown, ChevronUp, Loader2, AlertTriangle, ExternalLink, X, Clipboard, Check } from "lucide-react";

interface Source {
  file_path: string;
  heading: string;
  stage: string;
}

interface AiAnswerPanelProps {
  query: string;
  isLoading: boolean;
  answer: string | null;
  stage: string | null;
  sources: Source[];
  error: string | null;
  onSourceClick: (filePath: string, anchor?: string) => void;
  onDismiss?: () => void;
}

const WABA_ROOT = `${process.env.NEXT_PUBLIC_GC_WORKSPACE || "/Users/openclaw/golden-claw"}/projects/rio/waba-setup`;

function stageLabel(stage: string): string {
  const map: Record<string, string> = {
    "pre-setup": "Pre-Setup",
    "waba-creation": "WABA Creation",
    "number-registration": "Number Registration",
    "display-name": "Display Name",
    "business-verification": "Business Verification",
    "security": "Security",
    "coexistence": "Coexistence",
    "partner-management": "Partner Mgmt",
    "triage": "Triage",
    "errors": "Error Reference",
    "competitor-reference": "Competitor Docs",
  };
  return map[stage] || stage;
}

function headingToId(heading: string): string {
  return heading.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function AiAnswerPanel({
  query: _query,
  isLoading,
  answer,
  stage,
  sources,
  error,
  onSourceClick,
  onDismiss,
}: AiAnswerPanelProps) {
  void _query; // consumed by parent; kept in props interface
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  function cleanAnswerForCopy(raw: string): string {
    return raw
      .split("\n")
      .filter((line) => {
        const trimmed = line.trim();
        if (/^sources?:/i.test(trimmed)) return false;
        if (trimmed.includes("[competitor-docs/") || trimmed.includes("[errors/")) return false;
        return true;
      })
      .map((line) => line.replace(/^#{1,6}\s+/, ""))
      .join("\n")
      .trim();
  }

  function handleCopy() {
    if (!answer) return;
    const cleaned = cleanAnswerForCopy(answer);
    navigator.clipboard.writeText(cleaned);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (dismissed) return null;

  // Don't render if nothing to show yet and not loading
  if (!isLoading && !answer && !error) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div className="mb-4 bg-gradient-to-br from-cm-purple/10 via-dark-panel to-dark-panel border border-cm-purple/30 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel border-b border-cm-purple/20">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-cm-purple" />
          <span className="text-sm font-semibold text-dark-text">AI Answer</span>
          {stage && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-cm-purple text-white">
              {stageLabel(stage)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLoading && answer && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-dark-panel2 text-dark-muted hover:text-cm-purple hover:bg-cm-purple/15 transition-colors"
              aria-label="Copy answer for customer"
            >
              {copied ? <Check size={12} className="text-dark-success" /> : <Clipboard size={12} />}
              {copied ? "Copied!" : "Copy"}
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="text-dark-muted hover:text-dark-text transition-colors"
            aria-label="Dismiss AI answer"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isLoading && (
          <div className="flex items-center gap-3 py-3">
            <Loader2 size={16} className="animate-spin text-cm-purple flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-cm-purple/15 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-cm-purple/15 rounded animate-pulse w-1/2" />
              <div className="h-3 bg-cm-purple/15 rounded animate-pulse w-5/6" />
            </div>
          </div>
        )}

        {!isLoading && error && (
          <div className="flex items-center gap-2 text-dark-warn text-xs py-1">
            <AlertTriangle size={13} className="flex-shrink-0" />
            <span>AI answer unavailable — see search results below</span>
          </div>
        )}

        {!isLoading && answer && (
          <div className="prose prose-sm prose-invert max-w-none prose-headings:text-dark-text prose-headings:font-semibold prose-strong:text-dark-text prose-a:text-cm-purple prose-code:text-cm-purple prose-code:bg-cm-purple/10 prose-code:px-1 prose-code:rounded text-dark-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{answer}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Sources */}
      {!isLoading && sources.length > 0 && (
        <div className="border-t border-cm-purple/20 px-4 py-2">
          <button
            onClick={() => setSourcesExpanded(!sourcesExpanded)}
            className="flex items-center gap-1.5 text-xs text-cm-purple hover:text-cm-purple-mid font-medium transition-colors"
          >
            {sourcesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {sources.length} source{sources.length !== 1 ? "s" : ""}
          </button>

          {sourcesExpanded && (
            <div className="mt-2 space-y-1.5">
              {sources.map((src, i) => (
                <button
                  key={i}
                  onClick={() => onSourceClick(`${WABA_ROOT}/${src.file_path}`, headingToId(src.heading))}
                  className="flex items-start gap-2 w-full text-left hover:bg-cm-purple/10 rounded-lg px-2 py-1.5 transition-colors group"
                >
                  <ExternalLink size={12} className="text-cm-purple flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                  <div className="min-w-0">
                    <span className="text-xs font-medium text-cm-purple block truncate">{src.heading}</span>
                    <span className="text-xs text-dark-muted font-mono font-dm-mono truncate block">{src.file_path}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
