"use client";

import { use, useState, useEffect, useCallback } from "react";
import {
  Search,
  ExternalLink,
  Trash2,
  RefreshCw,
  Plus,
  Tag,
  TrendingUp,
  X,
  Filter,
  BookOpen,
  Sparkles,
  Loader2,
} from "lucide-react";

interface Discovery {
  id: number;
  source_name: string;
  platform: string;
  url: string | null;
  description: string | null;
  why_it_matters: string | null;
  content_category: string | null;
  tags: string;
  audience_relevance_score: number | null;
  confidence_score: number | null;
  keywords: string;
  content_opportunity: string | null;
  status: string;
  date_discovered: string;
}

interface Keyword {
  id: number;
  keyword: string;
  category: string;
  signal_strength: number;
  status: string;
  times_used: number;
  added_at: string;
}

const PLATFORMS = ["Reddit", "X", "Instagram", "TikTok", "YouTube", "Website"];
const PLATFORM_COLORS: Record<string, string> = {
  Reddit: "bg-dark-warn/20 text-dark-warn",
  X: "bg-dark-panel2 text-dark-text",
  Instagram: "bg-cm-pink-light text-cm-pink",
  TikTok: "bg-cm-purple/20 text-cm-purple",
  YouTube: "bg-dark-danger/20 text-dark-danger",
  Website: "bg-cm-purple/20 text-cm-purple",
};

const OPPORTUNITY_COLORS: Record<string, string> = {
  prompt: "bg-cm-purple/20 text-cm-purple-mid",
  tutorial: "bg-sky-500/20 text-sky-300",
  automation_template: "bg-dark-success/20 text-dark-success",
  agent_skill: "bg-cm-purple/20 text-cm-purple",
  tool_review: "bg-dark-warn/20 text-dark-warn",
  workflow_breakdown: "bg-cm-purple/20 text-cm-purple",
};

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (!score) return null;
  const color =
    score >= 8
      ? "bg-dark-success/20 text-dark-success"
      : score >= 5
      ? "bg-dark-warn/20 text-dark-warn"
      : "bg-dark-panel2 text-dark-muted";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {label}: {score}/10
    </span>
  );
}

export default function DiscoveriesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const base = `/api/postpilot/clients/${clientId}/discoveries`;

  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [showKeywords, setShowKeywords] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<
    "date_discovered" | "audience_relevance_score" | "confidence_score" | "source_name"
  >("date_discovered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [scoreFilter, setScoreFilter] = useState("");

  const fetchDiscoveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (platformFilter) params.set("platform", platformFilter);
      params.set("limit", "100");

      const res = await fetch(`${base}?${params.toString()}`);
      const data = await res.json();
      setDiscoveries(data.discoveries || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch discoveries:", err);
    } finally {
      setLoading(false);
    }
  }, [base, search, platformFilter]);

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch(`${base}?type=keywords`);
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (err) {
      console.error("Failed to fetch keywords:", err);
    }
  }, [base]);

  useEffect(() => {
    fetchDiscoveries();
  }, [fetchDiscoveries]);

  useEffect(() => {
    if (showKeywords) fetchKeywords();
  }, [showKeywords, fetchKeywords]);

  async function deleteDiscovery(id: number) {
    setDeletingId(id);
    try {
      await fetch(base, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setDiscoveries((prev) => prev.filter((d) => d.id !== id));
      setTotal((prev) => prev - 1);
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeletingId(null);
    }
  }

  async function removeKeyword(id: number) {
    await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_keyword", id }),
    });
    setKeywords((prev) => prev.filter((k) => k.id !== id));
  }

  async function addKeyword() {
    if (!newKeyword.trim()) return;
    setAddingKeyword(true);
    try {
      await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_keyword",
          keyword: newKeyword.trim(),
          category: "manual",
          signal_strength: 5,
        }),
      });
      setNewKeyword("");
      await fetchKeywords();
    } finally {
      setAddingKeyword(false);
    }
  }

  async function runDiscovery() {
    setDiscovering(true);
    try {
      await fetch(`/api/postpilot/clients/${clientId}/discover`, {
        method: "POST",
      });
      setTimeout(() => {
        fetchDiscoveries().finally(() => setDiscovering(false));
      }, 75000);
    } catch (err) {
      console.error("Failed to start discovery:", err);
      setDiscovering(false);
    }
  }

  const parseTags = (tags: string): string[] => {
    try {
      return JSON.parse(tags) || [];
    } catch {
      return [];
    }
  };

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sortedDiscoveries = [...discoveries]
    .filter(
      (d) =>
        !scoreFilter ||
        (d.audience_relevance_score ?? 0) >= parseInt(scoreFilter, 10)
    )
    .sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortField === "date_discovered") {
        aVal = a.date_discovered;
        bVal = b.date_discovered;
      } else if (sortField === "audience_relevance_score") {
        aVal = a.audience_relevance_score ?? 0;
        bVal = b.audience_relevance_score ?? 0;
      } else if (sortField === "confidence_score") {
        aVal = a.confidence_score ?? 0;
        bVal = b.confidence_score ?? 0;
      } else if (sortField === "source_name") {
        aVal = a.source_name.toLowerCase();
        bVal = b.source_name.toLowerCase();
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field)
      return <span className="text-dark-muted ml-1">↕</span>;
    return (
      <span className="text-cm-purple ml-1">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const activeKeywords = keywords.filter((k) => k.status === "active");

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg  font-semibold tracking-tight text-dark-text">
            Source Discoveries
          </h2>
          <p className="text-sm text-dark-muted">
            {sortedDiscoveries.length !== total
              ? `${sortedDiscoveries.length} of ${total}`
              : total}{" "}
            high-signal sources
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
              showKeywords
                ? "bg-cm-purple/10 border-cm-purple/30 text-cm-purple"
                : "bg-dark-panel border-dark-border text-dark-muted hover:border-dark-border"
            }`}
          >
            <Tag size={15} />
            Keywords{" "}
            {activeKeywords.length > 0 && `(${activeKeywords.length})`}
          </button>
          <button
            onClick={runDiscovery}
            disabled={discovering}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-all disabled:opacity-50"
          >
            {discovering ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {discovering ? "Discovering..." : "Run Discovery"}
          </button>
          <button
            onClick={fetchDiscoveries}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-dark-panel border border-dark-border text-dark-muted rounded-lg hover:border-dark-border transition-all disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Keywords Panel */}
      {showKeywords && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-cm-purple" />
              <span className="text-sm font-semibold text-dark-text">
                Research Keywords
              </span>
              <span className="text-xs text-dark-muted">
                -- used by discovery agent each run
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {activeKeywords.map((kw) => (
              <span
                key={kw.id}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium group"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    kw.signal_strength >= 8
                      ? "bg-dark-success/100"
                      : kw.signal_strength >= 6
                      ? "bg-dark-warn"
                      : "bg-dark-muted"
                  }`}
                />
                {kw.keyword}
                <button
                  onClick={() => removeKeyword(kw.id)}
                  className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-dark-danger transition-all"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addKeyword()}
              placeholder="Add keyword..."
              className="flex-1 px-3 py-1.5 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
            />
            <button
              onClick={addKeyword}
              disabled={addingKeyword || !newKeyword.trim()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-all"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sources..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Filter
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-muted"
            />
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="pl-8 pr-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel"
            >
              <option value="">All platforms</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <select
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel"
          >
            <option value="">Any relevance</option>
            <option value="9">≥ 9 (top)</option>
            <option value="7">≥ 7 (high)</option>
            <option value="5">≥ 5 (medium)</option>
          </select>
        </div>
      </div>

      {/* Discoveries Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw
            size={20}
            className="animate-spin text-cm-purple mr-2"
          />
          <span className="text-dark-muted text-sm">
            Loading discoveries...
          </span>
        </div>
      ) : sortedDiscoveries.length === 0 ? (
        <div className="text-center py-16 bg-dark-panel rounded-xl border border-dark-border">
          <BookOpen size={40} className="mx-auto text-dark-muted mb-3" />
          <p className="text-dark-muted font-medium">No discoveries yet</p>
          <p className="text-dark-muted text-sm mt-1">
            The discovery agent will populate this on its next run
          </p>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-panel2">
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[22%]">
                  <button
                    onClick={() => toggleSort("source_name")}
                    className="flex items-center hover:text-cm-purple transition-colors"
                  >
                    Source Name
                    <SortIcon field="source_name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  Platform
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[32%]">
                  Description
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  <button
                    onClick={() => toggleSort("audience_relevance_score")}
                    className="flex items-center hover:text-cm-purple transition-colors"
                  >
                    Relevance
                    <SortIcon field="audience_relevance_score" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[18%]">
                  <button
                    onClick={() => toggleSort("date_discovered")}
                    className="flex items-center hover:text-cm-purple transition-colors"
                  >
                    Opportunity
                    <SortIcon field="date_discovered" />
                  </button>
                </th>
                <th className="px-4 py-3 w-[8%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sortedDiscoveries.map((d) => {
                const tags = parseTags(d.tags);
                return (
                  <tr
                    key={d.id}
                    className="hover:bg-dark-panel2/50 transition-colors group"
                  >
                    {/* Source Name + URL */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="font-medium text-dark-text leading-tight">
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-cm-purple flex items-start gap-1.5 group/link"
                          >
                            <span>{d.source_name}</span>
                            <ExternalLink
                              size={12}
                              className="mt-0.5 opacity-0 group-hover/link:opacity-100 text-indigo-400 flex-shrink-0 transition-opacity"
                            />
                          </a>
                        ) : (
                          <span>{d.source_name}</span>
                        )}
                      </div>
                      {d.content_category && (
                        <div className="mt-1 text-xs text-dark-muted">
                          {d.content_category}
                        </div>
                      )}
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-dark-panel2 text-dark-muted rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-xs text-dark-muted">
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Platform */}
                    <td className="px-4 py-3.5 align-top">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          PLATFORM_COLORS[d.platform] ||
                          "bg-dark-panel2 text-dark-muted"
                        }`}
                      >
                        {d.platform}
                      </span>
                    </td>

                    {/* Description + Why */}
                    <td className="px-4 py-3.5 align-top">
                      <p className="text-dark-text leading-snug line-clamp-2">
                        {d.description}
                      </p>
                      {d.why_it_matters && (
                        <p className="text-dark-muted text-xs mt-1 line-clamp-2">
                          {d.why_it_matters}
                        </p>
                      )}
                    </td>

                    {/* Scores */}
                    <td className="px-4 py-3.5 align-top">
                      <div className="flex flex-col gap-1">
                        <ScoreBadge
                          score={d.audience_relevance_score}
                          label="Relevance"
                        />
                        <ScoreBadge
                          score={d.confidence_score}
                          label="Confidence"
                        />
                      </div>
                    </td>

                    {/* Content Opportunity */}
                    <td className="px-4 py-3.5 align-top">
                      {d.content_opportunity && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            OPPORTUNITY_COLORS[d.content_opportunity] ||
                            "bg-dark-panel2 text-dark-muted"
                          }`}
                        >
                          {d.content_opportunity.replace(/_/g, " ")}
                        </span>
                      )}
                      <div className="text-xs text-dark-muted mt-1">
                        {d.date_discovered}
                      </div>
                    </td>

                    {/* Delete */}
                    <td className="px-4 py-3.5 align-top text-right">
                      <button
                        onClick={() => deleteDiscovery(d.id)}
                        disabled={deletingId === d.id}
                        className="p-1.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete discovery"
                      >
                        {deletingId === d.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
