"use client";

import { useState } from "react";
import { FileText, Loader2, Copy, Check, RotateCcw, ChevronDown, ChevronRight, Link2, HelpCircle } from "lucide-react";
import type { BlogBrief } from "@/lib/seo-types";

interface BlogBriefGeneratorProps {
  domain: string;
  existingKeywords?: string[];
}

const INTENT_COLORS: Record<string, string> = {
  informational:  "bg-cm-purple/15 text-cm-purple border-cm-purple/30",
  commercial:     "bg-dark-warn/15 text-dark-warn border-dark-warn/30",
  transactional:  "bg-dark-success/15 text-dark-success border-dark-success/30",
  navigational:   "bg-dark-panel2 text-dark-muted border-dark-border",
};

function useCopyText() {
  const [copied, setCopied] = useState(false);
  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return { copied, copy };
}

function briefToMarkdown(brief: BlogBrief): string {
  const lines: string[] = [];
  lines.push(`# Blog Brief: ${brief.keyword}`);
  lines.push("");
  lines.push(`**Domain:** ${brief.domain}`);
  lines.push(`**Generated:** ${new Date(brief.generatedAt).toLocaleString()}`);
  lines.push("");
  lines.push(`## Title`);
  lines.push(brief.title);
  lines.push("");
  lines.push(`## Meta Description`);
  lines.push(brief.metaDescription);
  lines.push("");
  lines.push(`## Slug`);
  lines.push(`\`/${brief.slug}\``);
  lines.push("");
  lines.push(`## Details`);
  lines.push(`- **Intent:** ${brief.intent}`);
  lines.push(`- **Target Word Count:** ${brief.wordCount}`);
  lines.push(`- **Target Audience:** ${brief.targetAudience}`);
  lines.push(`- **Tone:** ${brief.tone}`);
  lines.push("");
  lines.push(`## Outline`);
  brief.outline.forEach((section, i) => {
    const prefix = section.level === 2 ? "##" : "###";
    lines.push(`${i + 1}. ${prefix} ${section.heading} *(~${section.wordCount} words)*`);
    lines.push(`   ${section.description}`);
  });
  lines.push("");
  lines.push(`## Internal Links`);
  brief.internalLinks.forEach((link) => lines.push(`- ${link}`));
  lines.push("");
  lines.push(`## FAQ Questions`);
  brief.faqQuestions.forEach((q, i) => lines.push(`${i + 1}. ${q}`));
  return lines.join("\n");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-dark-muted uppercase tracking-wide font-medium mb-1.5">{children}</p>
  );
}

function BriefCard({ brief, onReset }: { brief: BlogBrief; onReset: () => void }) {
  const { copied: copiedTitle, copy: copyTitle } = useCopyText();
  const { copied: copiedMd, copy: copyMd } = useCopyText();
  const [outlineExpanded, setOutlineExpanded] = useState(true);

  return (
    <div className="mt-5 space-y-4">
      {/* Header row */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <SectionLabel>Title</SectionLabel>
            <p className="text-sm font-semibold text-dark-text leading-snug">{brief.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${INTENT_COLORS[brief.intent] || INTENT_COLORS.navigational}`}>
              {brief.intent}
            </span>
            <button
              onClick={() => copyTitle(brief.title)}
              className="p-1.5 rounded-lg bg-dark-panel border border-dark-border text-dark-muted hover:text-dark-text transition-colors"
              title="Copy title"
            >
              {copiedTitle ? <Check size={13} className="text-dark-success" /> : <Copy size={13} />}
            </button>
          </div>
        </div>

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-dark-border">
          <div>
            <SectionLabel>Slug</SectionLabel>
            <p className="text-xs font-mono text-dark-text truncate">/{brief.slug}</p>
          </div>
          <div>
            <SectionLabel>Word Count</SectionLabel>
            <p className="text-xs text-dark-text">{brief.wordCount} words</p>
          </div>
          <div>
            <SectionLabel>Tone</SectionLabel>
            <p className="text-xs text-dark-text truncate">{brief.tone}</p>
          </div>
          <div>
            <SectionLabel>Audience</SectionLabel>
            <p className="text-xs text-dark-text truncate">{brief.targetAudience}</p>
          </div>
        </div>
      </div>

      {/* Meta description */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-1.5">
          <SectionLabel>Meta Description</SectionLabel>
          <span className={`text-[10px] font-mono ${brief.metaDescription.length >= 150 && brief.metaDescription.length <= 160 ? "text-dark-success" : "text-dark-warn"}`}>
            {brief.metaDescription.length} chars
          </span>
        </div>
        <p className="text-sm text-dark-text leading-relaxed">{brief.metaDescription}</p>
      </div>

      {/* Outline */}
      <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4">
        <button
          className="w-full flex items-center gap-2 text-left hover:opacity-80 transition-opacity mb-1"
          onClick={() => setOutlineExpanded((v) => !v)}
        >
          {outlineExpanded
            ? <ChevronDown size={13} className="text-dark-muted shrink-0" />
            : <ChevronRight size={13} className="text-dark-muted shrink-0" />}
          <SectionLabel>Outline ({brief.outline.length} sections)</SectionLabel>
        </button>
        {outlineExpanded && (
          <ol className="space-y-2 mt-2">
            {brief.outline.map((section, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="text-xs font-mono text-dark-muted shrink-0 w-5 mt-0.5">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-mono text-dark-muted border border-dark-border bg-dark-panel px-1 rounded">
                      H{section.level}
                    </span>
                    <span className="text-sm font-medium text-dark-text">{section.heading}</span>
                    <span className="text-xs text-dark-muted">~{section.wordCount}w</span>
                  </div>
                  <p className="text-xs text-dark-muted mt-0.5 leading-relaxed">{section.description}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Internal links */}
      {brief.internalLinks.length > 0 && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4">
          <SectionLabel>Internal Links</SectionLabel>
          <ul className="space-y-1">
            {brief.internalLinks.map((link, i) => (
              <li key={i} className="flex items-center gap-2">
                <Link2 size={12} className="text-dark-muted shrink-0" />
                <span className="text-xs font-mono text-cm-purple truncate">{link}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* FAQ Questions */}
      {brief.faqQuestions.length > 0 && (
        <div className="bg-dark-panel2 border border-dark-border rounded-xl p-4">
          <SectionLabel>FAQ Questions</SectionLabel>
          <ol className="space-y-1.5">
            {brief.faqQuestions.map((q, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono text-dark-muted shrink-0 w-4 mt-0.5">{i + 1}.</span>
                <div className="flex items-start gap-1.5 flex-1 min-w-0">
                  <HelpCircle size={12} className="text-dark-muted shrink-0 mt-0.5" />
                  <span className="text-sm text-dark-text">{q}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => copyMd(briefToMarkdown(brief))}
          className="flex items-center gap-1.5 px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-text rounded-lg hover:border-cm-purple/50 transition-colors text-sm font-medium"
        >
          {copiedMd ? <Check size={14} className="text-dark-success" /> : <Copy size={14} />}
          {copiedMd ? "Copied!" : "Copy as Markdown"}
        </button>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-muted rounded-lg hover:text-dark-text hover:border-dark-border transition-colors text-sm"
        >
          <RotateCcw size={14} />
          Generate Another
        </button>
      </div>
    </div>
  );
}

export default function BlogBriefGenerator({ domain, existingKeywords }: BlogBriefGeneratorProps) {
  const [keyword, setKeyword] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<BlogBrief | null>(null);
  const [history, setHistory] = useState<BlogBrief[]>([]);

  const handleGenerate = async () => {
    if (!keyword.trim() || !domain) return;
    setLoading(true);
    setError(null);
    setBrief(null);

    try {
      const res = await fetch("/api/seo/blog-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, keyword: keyword.trim(), extraContext: extraContext.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      setBrief(data as BlogBrief);
      setHistory((prev) => [data as BlogBrief, ...prev.slice(0, 9)]);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setBrief(null);
    setKeyword("");
    setExtraContext("");
    setError(null);
  };

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
      {/* Header */}
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
        <span className="p-1.5 bg-cm-purple/15 rounded-lg">
          <FileText size={14} className="text-cm-purple" />
        </span>
        Blog Brief Generator
      </h3>

      {!brief && (
        <div className="space-y-3">
          {/* Keyword input */}
          <div>
            <label className="text-xs text-dark-muted font-medium block mb-1">Target keyword</label>
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="Enter target keyword..."
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple/60 transition-colors"
              onKeyDown={(e) => { if (e.key === "Enter" && !loading) handleGenerate(); }}
              disabled={loading}
            />
          </div>

          {/* Quick-select chips */}
          {existingKeywords && existingKeywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {existingKeywords.map((kw) => (
                <button
                  key={kw}
                  onClick={() => setKeyword(kw)}
                  className="bg-dark-panel2 border border-dark-border rounded-full px-2 py-0.5 text-xs cursor-pointer hover:border-cm-purple transition-colors text-dark-muted hover:text-dark-text"
                  disabled={loading}
                >
                  {kw}
                </button>
              ))}
            </div>
          )}

          {/* Extra context */}
          <div>
            <label className="text-xs text-dark-muted font-medium block mb-1">Any extra context? (optional)</label>
            <textarea
              value={extraContext}
              onChange={(e) => setExtraContext(e.target.value)}
              placeholder="e.g. target beginners, include personal story, focus on Bali..."
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple/60 transition-colors resize-y min-h-[72px]"
              disabled={loading}
            />
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !keyword.trim() || !domain}
            className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Generating brief with Claude...
              </>
            ) : (
              <>
                <FileText size={14} />
                Generate Brief
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-lg p-3">
              <p className="text-sm text-dark-danger">{error}</p>
            </div>
          )}
        </div>
      )}

      {/* Brief result */}
      {brief && <BriefCard brief={brief} onReset={handleReset} />}

      {/* Session history */}
      {history.length > 1 && (
        <div className="mt-5 pt-4 border-t border-dark-border">
          <p className="text-xs text-dark-muted uppercase tracking-wide font-medium mb-2">
            This session ({history.length} briefs)
          </p>
          <div className="space-y-1">
            {history.map((b, i) => (
              <button
                key={b.generatedAt}
                onClick={() => setBrief(b)}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  brief === b
                    ? "bg-cm-purple/10 border border-cm-purple/30 text-dark-text"
                    : "bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text hover:border-cm-purple/30"
                }`}
              >
                <span className="truncate font-medium">{b.keyword}</span>
                <span className="shrink-0 ml-2 text-dark-muted">#{i + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
