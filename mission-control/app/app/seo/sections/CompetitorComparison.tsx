"use client";

import { useState, useEffect } from "react";
import { Swords, Loader2, Plus, X, RefreshCw, AlertTriangle } from "lucide-react";
import type { Competitor, CompetitorDatabase } from "@/lib/seo-types";

interface Props {
  siteDomain: string;
}

export default function CompetitorComparison({ siteDomain }: Props) {
  const [db, setDb] = useState<CompetitorDatabase | null>(null);
  const [loading, setLoading] = useState(true);
  const [populating, setPopulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add-competitor inline state
  const [addingDomain, setAddingDomain] = useState("");
  const [addingOpen, setAddingOpen] = useState(false);
  const [addingLoading, setAddingLoading] = useState(false);

  // Load on mount
  useEffect(() => {
    loadCompetitors(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteDomain]);

  async function loadCompetitors(refresh: boolean) {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/seo/competitors?domain=${encodeURIComponent(siteDomain)}${refresh ? "&refresh=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: CompetitorDatabase = await res.json();
      setDb(data);
    } catch (err: any) {
      setError(err.message || "Failed to load competitors");
    } finally {
      setLoading(false);
    }
  }

  async function handlePopulate() {
    setPopulating(true);
    setError(null);
    try {
      const res = await fetch(`/api/seo/competitors?domain=${encodeURIComponent(siteDomain)}&refresh=true`);
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: CompetitorDatabase = await res.json();
      setDb(data);
    } catch (err: any) {
      setError(err.message || "Discovery failed");
    } finally {
      setPopulating(false);
    }
  }

  async function handleAddCompetitor() {
    const trimmed = addingDomain.trim().replace(/^https?:\/\/(www\.)?/, "").replace(/\/.*$/, "");
    if (!trimmed) return;
    setAddingLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/seo/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: siteDomain, competitors: [trimmed] }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: CompetitorDatabase = await res.json();
      setDb(data);
      setAddingDomain("");
      setAddingOpen(false);
    } catch (err: any) {
      setError(err.message || "Failed to add competitor");
    } finally {
      setAddingLoading(false);
    }
  }

  async function handleDelete(competitorDomain: string) {
    setError(null);
    try {
      const res = await fetch(
        `/api/seo/competitors?domain=${encodeURIComponent(siteDomain)}&competitor=${encodeURIComponent(competitorDomain)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: CompetitorDatabase = await res.json();
      setDb(data);
    } catch (err: any) {
      setError(err.message || "Failed to remove competitor");
    }
  }

  const isEmpty = !db || db.competitors.length === 0;
  const isStale = db?.status === "stale";

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-2">
          <Swords size={16} className="text-cm-purple" />
          <h3 className="text-sm font-semibold tracking-tight text-dark-text">Competitor Intelligence</h3>
          {db?.lastUpdated && (
            <span className="text-xs text-dark-muted ml-1">
              · updated {new Date(db.lastUpdated).toLocaleDateString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Add competitor */}
          {!addingOpen ? (
            <button
              onClick={() => setAddingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 border border-dark-border text-dark-muted text-xs font-medium rounded-lg hover:border-cm-purple/50 hover:text-cm-purple transition-colors"
            >
              <Plus size={12} /> Add
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                autoFocus
                type="text"
                value={addingDomain}
                onChange={(e) => setAddingDomain(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleAddCompetitor(); if (e.key === "Escape") { setAddingOpen(false); setAddingDomain(""); } }}
                placeholder="competitor.com"
                className="px-2.5 py-1 border border-dark-border rounded-lg text-xs bg-dark-panel2 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-1 focus:ring-cm-purple focus:border-transparent w-36"
              />
              <button
                onClick={handleAddCompetitor}
                disabled={addingLoading || !addingDomain.trim()}
                className="px-2.5 py-1 bg-cm-purple text-white text-xs font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
              >
                {addingLoading ? <Loader2 size={12} className="animate-spin" /> : "Add"}
              </button>
              <button
                onClick={() => { setAddingOpen(false); setAddingDomain(""); }}
                className="p-1 text-dark-muted hover:text-dark-danger"
              >
                <X size={12} />
              </button>
            </div>
          )}
          {/* Populate / Refresh */}
          <button
            onClick={handlePopulate}
            disabled={populating || loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white text-xs font-medium rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-colors"
          >
            {populating ? (
              <><Loader2 size={12} className="animate-spin" /> Discovering...</>
            ) : (
              <><RefreshCw size={12} /> {isEmpty ? "Populate" : "Refresh"}</>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-dark-danger/10 border border-dark-danger/30 rounded-lg">
          <AlertTriangle size={13} className="text-dark-danger shrink-0" />
          <p className="text-xs text-dark-danger">{error}</p>
        </div>
      )}

      {/* Stale banner */}
      {isStale && !populating && !loading && (
        <div className="flex items-center justify-between gap-2 mb-4 px-3 py-2 bg-dark-warn/10 border border-dark-warn/30 rounded-lg">
          <p className="text-xs text-dark-warn">Competitor data is over 7 days old.</p>
          <button onClick={handlePopulate} className="text-xs text-dark-warn underline">Refresh now</button>
        </div>
      )}

      {/* Loading state */}
      {loading && !populating && (
        <div className="flex items-center gap-2 py-8 justify-center text-dark-muted">
          <Loader2 size={16} className="animate-spin" />
          <span className="text-sm">Loading competitors...</span>
        </div>
      )}

      {/* Discovering state */}
      {populating && (
        <div className="flex flex-col items-center gap-3 py-10">
          <Loader2 size={24} className="animate-spin text-cm-purple" />
          <p className="text-sm text-dark-muted">Discovering competitors...</p>
          <p className="text-xs text-dark-muted opacity-60">Searching the web · fetching pages · analyzing with AI</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !populating && isEmpty && (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <Swords size={28} className="text-dark-muted opacity-40" />
          <p className="text-sm text-dark-muted">No competitors found yet.</p>
          <p className="text-xs text-dark-muted opacity-60 max-w-sm">
            Click <span className="text-cm-purple font-medium">Populate</span> to discover and analyze your top competitors automatically using Tavily + AI.
          </p>
        </div>
      )}

      {/* Competitor cards */}
      {!loading && !populating && db && db.competitors.length > 0 && (
        <div className="space-y-4">
          {db.competitors.map((comp) => (
            <CompetitorCard
              key={comp.domain}
              competitor={comp}
              onDelete={() => handleDelete(comp.domain)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CompetitorCard({ competitor, onDelete }: { competitor: Competitor; onDelete: () => void }) {
  const sourceBadgeClass =
    competitor.source === "manual"
      ? "text-dark-muted"
      : competitor.source === "profile"
      ? "text-cm-purple"
      : "text-dark-success";

  return (
    <div className="relative bg-dark-panel2 border border-dark-border rounded-xl p-4">
      {/* Delete button */}
      <button
        onClick={onDelete}
        className="absolute top-3 right-3 p-1 text-dark-muted hover:text-dark-danger transition-colors"
        title="Remove competitor"
      >
        <X size={13} />
      </button>

      {/* Header */}
      <div className="mb-3 pr-6">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`https://${competitor.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-dark-text hover:text-cm-purple transition-colors"
          >
            {competitor.domain}
          </a>
          <span className={`text-xs ${sourceBadgeClass} opacity-70`}>
            via {competitor.source}
          </span>
        </div>
        {competitor.name && competitor.name !== competitor.domain && (
          <p className="text-xs text-dark-muted mt-0.5 truncate">{competitor.name}</p>
        )}
        {competitor.description && (
          <p className="text-xs text-dark-muted mt-1 line-clamp-2">{competitor.description}</p>
        )}
      </div>

      {/* Tech hints */}
      {competitor.techHints.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {competitor.techHints.map((hint) => (
            <span
              key={hint}
              className="bg-dark-panel border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs"
            >
              {hint}
            </span>
          ))}
        </div>
      )}

      {/* Three-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
        <CompetitorColumn
          label="Strengths"
          items={competitor.strengths}
          emptyMsg="No data"
          dotColor="text-dark-success"
        />
        <CompetitorColumn
          label="Content Gaps"
          items={competitor.contentGaps}
          emptyMsg="No gaps identified"
          dotColor="text-dark-warn"
        />
        <CompetitorColumn
          label="Top Keywords"
          items={competitor.topKeywords}
          emptyMsg="Unknown"
          dotColor="text-cm-purple"
        />
      </div>
    </div>
  );
}

function CompetitorColumn({
  label,
  items,
  emptyMsg,
  dotColor,
}: {
  label: string;
  items: string[];
  emptyMsg: string;
  dotColor: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-dark-muted uppercase tracking-wide mb-1.5">{label}</p>
      {items.length === 0 ? (
        <p className="text-xs text-dark-muted opacity-50">{emptyMsg}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-dark-text">
              <span className={`mt-0.5 shrink-0 ${dotColor}`}>•</span>
              <span className="leading-tight">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
