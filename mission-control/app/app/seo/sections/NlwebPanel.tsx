"use client";

import { useState, useEffect } from "react";
import { Loader2, AlertCircle, Copy, Check, RefreshCw } from "lucide-react";

interface NlwebPanelProps {
  domain: string;
}

export default function NlwebPanel({ domain }: NlwebPanelProps) {
  const [metaTag, setMetaTag] = useState<string | null>(null);
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [llmsTxt, setLlmsTxt] = useState<string | null>(null);
  const [llmsLoading, setLlmsLoading] = useState(false);
  const [llmsError, setLlmsError] = useState<string | null>(null);
  const [showFullLlms, setShowFullLlms] = useState(false);

  const endpointUrl = domain ? `http://localhost:3000/api/seo/nlweb/${domain}` : "";

  useEffect(() => {
    if (!domain) return;
    loadMeta();
    loadLlms();
  }, [domain]);

  async function loadMeta() {
    setMetaLoading(true);
    setMetaError(null);
    try {
      const res = await fetch(`/api/seo/nlweb/${encodeURIComponent(domain)}?meta=true`);
      const data = await res.json();
      setMetaTag(data.metaTag ?? null);
    } catch (e: any) {
      setMetaError(e.message || "Failed to load NLWeb meta tag");
    } finally {
      setMetaLoading(false);
    }
  }

  async function loadLlms(refresh = false) {
    setLlmsLoading(true);
    setLlmsError(null);
    try {
      const url = `/api/seo/llms-txt/${encodeURIComponent(domain)}${refresh ? "?refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setLlmsError(j.error || `HTTP ${res.status}`);
        setLlmsTxt(null);
        return;
      }
      const text = await res.text();
      setLlmsTxt(text || null);
    } catch (e: any) {
      setLlmsError(e.message || "Failed to load llms.txt");
    } finally {
      setLlmsLoading(false);
    }
  }

  async function handleCopy() {
    if (!metaTag) return;
    await navigator.clipboard.writeText(metaTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const previewText = llmsTxt ? llmsTxt.slice(0, 500) : "";
  const hasMore = llmsTxt && llmsTxt.length > 500;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-dark-text">NLWeb & llms.txt</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* NLWeb section */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">NLWeb</p>

          {/* Endpoint URL */}
          <div>
            <p className="text-xs text-dark-muted mb-1">Endpoint URL</p>
            <code className="block text-xs bg-dark-panel2 border border-dark-border rounded px-2 py-1.5 text-dark-text break-all">
              {endpointUrl || "—"}
            </code>
          </div>

          {/* Meta tag */}
          <div>
            <p className="text-xs text-dark-muted mb-1">
              &lt;link rel=&quot;nlweb&quot;&gt; tag
            </p>
            {metaLoading && (
              <div className="flex items-center gap-2 text-dark-muted text-xs">
                <Loader2 size={12} className="animate-spin" />
                Loading...
              </div>
            )}
            {metaError && !metaLoading && (
              <div className="flex items-center gap-1.5 text-dark-danger text-xs">
                <AlertCircle size={12} />
                {metaError}
              </div>
            )}
            {!metaLoading && !metaError && metaTag && (
              <div className="relative">
                <code className="block text-xs bg-dark-panel2 border border-dark-border rounded px-2 py-1.5 text-dark-text break-all pr-8">
                  {metaTag}
                </code>
                <button
                  onClick={handleCopy}
                  className="absolute top-1.5 right-1.5 text-dark-muted hover:text-dark-text transition-colors"
                  title="Copy meta tag"
                >
                  {copied ? <Check size={12} className="text-dark-success" /> : <Copy size={12} />}
                </button>
              </div>
            )}
            {!metaLoading && !metaError && !metaTag && (
              <p className="text-xs text-dark-muted italic">No meta tag generated yet</p>
            )}
          </div>

          <p className="text-xs text-dark-muted bg-dark-panel2 border border-dark-border rounded px-2 py-1.5">
            Add this to your Wix site Custom Code in the{" "}
            <code className="text-cm-purple">&lt;head&gt;</code>
          </p>
        </div>

        {/* llms.txt section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide">llms.txt</p>
            <button
              onClick={() => loadLlms(true)}
              disabled={llmsLoading}
              className="flex items-center gap-1 text-xs text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={llmsLoading ? "animate-spin" : ""} />
              Regenerate
            </button>
          </div>

          {llmsLoading && (
            <div className="flex items-center gap-2 text-dark-muted text-xs">
              <Loader2 size={12} className="animate-spin" />
              Loading...
            </div>
          )}
          {llmsError && !llmsLoading && (
            <div className="flex items-center gap-1.5 text-dark-danger text-xs">
              <AlertCircle size={12} />
              {llmsError}
            </div>
          )}
          {!llmsLoading && !llmsError && llmsTxt && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-1.5 py-0.5 rounded bg-dark-success/20 text-dark-success border border-dark-success/30 font-medium">
                  Generated
                </span>
                <span className="text-xs text-dark-muted">{llmsTxt.length.toLocaleString()} chars</span>
              </div>
              <pre className="text-xs bg-dark-panel2 border border-dark-border rounded p-2 text-dark-text overflow-x-auto whitespace-pre-wrap break-words">
                {showFullLlms ? llmsTxt : previewText}
                {!showFullLlms && hasMore && "…"}
              </pre>
              {hasMore && (
                <button
                  onClick={() => setShowFullLlms((v) => !v)}
                  className="text-xs text-cm-purple hover:text-cm-purple/80 transition-colors"
                >
                  {showFullLlms ? "Show less" : "View full"}
                </button>
              )}
            </div>
          )}
          {!llmsLoading && !llmsError && !llmsTxt && (
            <div className="space-y-2">
              <span className="inline-block text-xs px-1.5 py-0.5 rounded bg-dark-warn/20 text-dark-warn border border-dark-warn/30 font-medium">
                Not generated
              </span>
              <p className="text-xs text-dark-muted">
                Click Regenerate to create the llms.txt file for this domain.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
