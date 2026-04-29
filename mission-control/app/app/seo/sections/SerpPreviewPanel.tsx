"use client";

import { useState, useEffect } from "react";
import { RotateCcw } from "lucide-react";
import SerpPreview from "./SerpPreview";
import type { AutopilotResult } from "@/lib/seo-types";

interface SerpPreviewPanelProps {
  domain: string;
  autopilotResult: AutopilotResult | null;
}

export default function SerpPreviewPanel({ domain, autopilotResult: _autopilotResult }: SerpPreviewPanelProps) {
  // autopilotResult reserved for future pre-population from homepage crawl data

  // Default to domain name + homepage URL
  const defaultTitle = domain ? `${domain}` : "";
  const defaultUrl = domain ? `https://${domain}` : "";
  const defaultDesc = "";

  const [title, setTitle] = useState(defaultTitle);
  const [url, setUrl] = useState(defaultUrl);
  const [desc, setDesc] = useState(defaultDesc);

  // Reset when domain changes
  useEffect(() => {
    setTitle(domain ? `${domain}` : "");
    setUrl(domain ? `https://${domain}` : "");
    setDesc("");
  }, [domain]);

  function handleReset() {
    setTitle(domain ? `${domain}` : "");
    setUrl(domain ? `https://${domain}` : "");
    setDesc("");
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-text">SERP Preview Builder</h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 text-xs text-dark-muted hover:text-dark-text transition-colors px-2 py-1 rounded bg-dark-panel2 border border-dark-border"
        >
          <RotateCcw size={12} />
          Reset to homepage
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {/* Title input */}
        <div>
          <label className="block text-xs text-dark-muted mb-1 font-medium">
            Title <span className="text-dark-muted font-normal">(0–60 chars)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page title..."
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple/50"
          />
        </div>

        {/* URL input */}
        <div>
          <label className="block text-xs text-dark-muted mb-1 font-medium">URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/page"
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple/50"
          />
        </div>

        {/* Meta description */}
        <div>
          <label className="block text-xs text-dark-muted mb-1 font-medium">
            Meta Description <span className="text-dark-muted font-normal">(0–160 chars)</span>
          </label>
          <textarea
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Meta description..."
            rows={3}
            className="w-full bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-sm text-dark-text placeholder:text-dark-muted focus:outline-none focus:border-cm-purple/50 resize-y"
          />
        </div>
      </div>

      {/* Live preview */}
      <SerpPreview title={title} url={url} description={desc} />
    </div>
  );
}
