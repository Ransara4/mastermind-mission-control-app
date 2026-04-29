"use client";

import { useState, useEffect } from "react";
import { Loader2, BookOpen, RefreshCw } from "lucide-react";
import dynamic from "next/dynamic";
import type { Components } from "react-markdown";
const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const md: Components = {
  h1: ({ children }) => (
    <h1 className="text-xl font-bold text-dark-text tracking-tight mt-0 mb-4 pb-3 border-b border-dark-border">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-bold text-dark-text tracking-tight mt-7 mb-3 pb-2 border-b border-dark-border/60">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-cm-purple mt-5 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-sm text-dark-text leading-relaxed my-2">{children}</p>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-cm-purple hover:underline">{children}</a>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-dark-text">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-dark-muted">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.startsWith("language-");
    if (isBlock) {
      return (
        <code className="block bg-dark-panel2 border border-dark-border rounded-lg p-3 text-xs text-cm-purple font-mono overflow-x-auto whitespace-pre my-3">
          {children}
        </code>
      );
    }
    return (
      <code className="bg-dark-panel2 text-cm-purple px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
    );
  },
  pre: ({ children }) => <div className="my-3">{children}</div>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-cm-purple pl-4 py-1 my-3 bg-dark-panel2 rounded-r-lg">
      {children}
    </blockquote>
  ),
  ul: ({ children }) => (
    <ul className="my-2 space-y-1 list-disc list-inside text-sm text-dark-text">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-2 space-y-1 list-decimal list-inside text-sm text-dark-text">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-sm text-dark-text leading-relaxed pl-1">{children}</li>
  ),
  hr: () => <hr className="my-6 border-dark-border" />,
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="border-b border-dark-border">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-dark-border/40">{children}</tbody>,
  th: ({ children }) => (
    <th className="text-left py-2 px-3 text-xs font-semibold text-dark-text uppercase tracking-wide">{children}</th>
  ),
  td: ({ children }) => (
    <td className="py-2 px-3 text-sm text-dark-muted">{children}</td>
  ),
};

export default function InfoTab() {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/docs");
      const data = await res.json();
      setContent(data.content || "");
    } catch {
      setError("Could not load documentation.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-4">
      <div className="bg-dark-panel border border-dark-border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cm-purple/15 rounded-lg">
              <BookOpen size={18} className="text-cm-purple" />
            </div>
            <div>
              <h2 className="text-base font-bold text-dark-text tracking-tight">How the SEO Autopilot Works</h2>
              <p className="text-xs text-dark-muted mt-0.5">
                Source:{" "}
                <code className="bg-dark-panel2 px-1 py-0.5 rounded text-[11px]">~/seo/SEO-AUTOPILOT-EXPLAINED.md</code>
                {" "}— edit the file to update this page
              </p>
            </div>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors bg-dark-panel2 border border-dark-border rounded-lg disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        {loading && (
          <div className="flex items-center gap-3 py-10 justify-center">
            <Loader2 size={20} className="animate-spin text-cm-purple" />
            <span className="text-sm text-dark-muted">Loading documentation...</span>
          </div>
        )}
        {error && !loading && (
          <div className="py-10 text-center">
            <p className="text-sm text-dark-danger mb-3">{error}</p>
            <button onClick={load} className="text-xs text-cm-purple hover:underline">Retry</button>
          </div>
        )}
        {content && !loading && (
          <ReactMarkdown components={md}>{content}</ReactMarkdown>
        )}
      </div>
    </div>
  );
}
