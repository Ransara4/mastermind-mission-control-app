"use client";

import { useState, useEffect, useCallback } from "react";
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
  Check,
  Pencil,
  Sparkles,
  Loader2,
} from "lucide-react";
import WebsiteSwitcher from "@/components/WebsiteSwitcher";
import { useWebsites } from "@/hooks/useWebsites";

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
const CATEGORIES = [
  "AI Automation",
  "Prompt Engineering",
  "Agent Systems",
  "Developer Tools",
  "AI Business Tools",
  "Automation Workflows",
  "AI Infrastructure",
  "Open Source AI",
];
const PLATFORM_COLORS: Record<string, string> = {
  Reddit: "bg-cm-purple/20 text-cm-purple",
  X: "bg-dark-panel2 text-dark-text",
  Instagram: "bg-cm-purple-mid/20 text-cm-purple",
  TikTok: "bg-cm-purple/15 text-cm-purple",
  YouTube: "bg-dark-danger/20 text-dark-danger",
  Website: "bg-dark-success/20 text-dark-success",
};

const OPPORTUNITY_COLORS: Record<string, string> = {
  prompt: "bg-cm-purple/20 text-cm-purple",
  tutorial: "bg-dark-success/20 text-dark-success",
  automation_template: "bg-dark-success/15 text-dark-success",
  agent_skill: "bg-cm-purple/15 text-cm-purple",
  tool_review: "bg-dark-warn/20 text-dark-warn",
  workflow_breakdown: "bg-cm-purple-mid/20 text-cm-purple",
};

function ScoreBadge({ score, label }: { score: number | null; label: string }) {
  if (!score) return null;
  const dot =
    score >= 8
      ? "bg-cm-purple"
      : score >= 5
      ? "bg-dark-muted/50"
      : "bg-dark-muted/25";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium bg-dark-panel2 border border-dark-border text-dark-muted">
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}: {score}/10
    </span>
  );
}

export default function DiscoveriesPage() {
  const { websites } = useWebsites();
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [discoveries, setDiscoveries] = useState<Discovery[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showKeywords, setShowKeywords] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [sortField, setSortField] = useState<"date_discovered" | "audience_relevance_score" | "confidence_score" | "source_name">("date_discovered");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [scoreFilter, setScoreFilter] = useState("");

  // Discovery Instructions state
  const [showInstructions, setShowInstructions] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [savedInstructions, setSavedInstructions] = useState(false);

  const fetchDiscoveries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (platformFilter) params.set("platform", platformFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      if (selectedDomain) params.set("site_domain", selectedDomain);
      params.set("limit", "100");

      const res = await fetch(
        `/api/cohorts/discoveries?${params.toString()}`
      );
      const data = await res.json();
      setDiscoveries(data.discoveries || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Failed to fetch discoveries:", err);
    } finally {
      setLoading(false);
    }
  }, [search, platformFilter, categoryFilter, selectedDomain]);

  const fetchKeywords = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: "keywords" });
      if (selectedDomain) params.set("site_domain", selectedDomain);
      const res = await fetch(
        `/api/cohorts/discoveries?${params.toString()}`
      );
      const data = await res.json();
      setKeywords(data.keywords || []);
    } catch (err) {
      console.error("Failed to fetch keywords:", err);
    }
  }, [selectedDomain]);

  useEffect(() => {
    fetchDiscoveries();
  }, [fetchDiscoveries]);

  useEffect(() => {
    if (showKeywords) fetchKeywords();
  }, [showKeywords, fetchKeywords]);

  useEffect(() => {
    fetchDiscoveries();
    if (showKeywords) fetchKeywords();
  }, [selectedDomain]); // eslint-disable-line react-hooks/exhaustive-deps

  async function deleteDiscovery(id: number) {
    setDeletingId(id);
    try {
      await fetch("/api/cohorts/discoveries", {
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
    await fetch("/api/cohorts/discoveries", {
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
      await fetch("/api/cohorts/discoveries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_keyword",
          keyword: newKeyword.trim(),
          category: "manual",
          signal_strength: 5,
          site_domain: selectedDomain || "mastermindshq.business",
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
      await fetch("/api/cohorts/discover", { method: "POST" });
      // Script runs ~60-90s in background — keep spinner, then refresh and clear
      setTimeout(() => {
        fetchDiscoveries().finally(() => setDiscovering(false));
      }, 75000);
    } catch (err) {
      console.error("Failed to start discovery:", err);
      setDiscovering(false);
    }
  }

  const fetchInstructions = useCallback(async () => {
    try {
      const res = await fetch("/api/cohorts/discovery-instructions");
      const data = await res.json();
      setInstructions(data.content || "");
      setInstructionsDraft(data.content || "");
    } catch (err) {
      console.error("Failed to fetch instructions:", err);
    }
  }, []);

  useEffect(() => {
    if (showInstructions && !instructions) fetchInstructions();
  }, [showInstructions, instructions, fetchInstructions]);

  async function saveInstructions() {
    setSavingInstructions(true);
    try {
      await fetch("/api/cohorts/discovery-instructions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: instructionsDraft }),
      });
      setInstructions(instructionsDraft);
      setEditingInstructions(false);
      setSavedInstructions(true);
      setTimeout(() => setSavedInstructions(false), 2000);
    } catch (err) {
      console.error("Failed to save instructions:", err);
    } finally {
      setSavingInstructions(false);
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
    .filter((d) => !scoreFilter || (d.audience_relevance_score ?? 0) >= parseInt(scoreFilter, 10))
    .sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortField === "date_discovered") { aVal = a.date_discovered; bVal = b.date_discovered; }
      else if (sortField === "audience_relevance_score") { aVal = a.audience_relevance_score ?? 0; bVal = b.audience_relevance_score ?? 0; }
      else if (sortField === "confidence_score") { aVal = a.confidence_score ?? 0; bVal = b.confidence_score ?? 0; }
      else if (sortField === "source_name") { aVal = a.source_name.toLowerCase(); bVal = b.source_name.toLowerCase(); }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <span className="text-dark-muted ml-1">↕</span>;
    return <span className="text-cm-purple ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const activeKeywords = keywords.filter((k) => k.status === "active");

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-dark-text">
            Source Discoveries
          </h2>
          <p className="text-sm text-dark-muted">
            {sortedDiscoveries.length !== total ? `${sortedDiscoveries.length} of ${total}` : total} high-signal sources
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
              showInstructions
                ? "bg-dark-success/10 border-dark-success/30 text-dark-success"
                : "bg-dark-panel border-dark-border text-dark-muted hover:border-cm-purple/30"
            }`}
          >
            <BookOpen size={15} />
            Instructions
          </button>
          <button
            onClick={() => setShowKeywords(!showKeywords)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-all ${
              showKeywords
                ? "bg-cm-purple/10 border-cm-purple/30 text-cm-purple"
                : "bg-dark-panel border-dark-border text-dark-muted hover:border-cm-purple/30"
            }`}
          >
            <Tag size={15} />
            Keywords {activeKeywords.length > 0 && `(${activeKeywords.length})`}
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
            className="flex items-center gap-2 px-3 py-2 text-sm bg-dark-panel border border-dark-border text-dark-muted rounded-lg hover:border-cm-purple/30 transition-all disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Discovery Instructions Panel */}
      {showInstructions && (
        <div className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-dark-border bg-dark-bg">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-dark-success" />
              <span className="text-sm font-semibold text-dark-text">
                Discovery Instructions
              </span>
              <span className="text-xs text-dark-muted">
                — guides the discovery agent each run
              </span>
            </div>
            <div className="flex items-center gap-2">
              {savedInstructions && (
                <span className="flex items-center gap-1 text-xs text-dark-success">
                  <Check size={13} />
                  Saved
                </span>
              )}
              {editingInstructions ? (
                <>
                  <button
                    onClick={() => {
                      setInstructionsDraft(instructions);
                      setEditingInstructions(false);
                    }}
                    className="px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:border-cm-purple/30 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveInstructions}
                    disabled={savingInstructions}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 transition-all"
                  >
                    {savingInstructions ? (
                      <RefreshCw size={12} className="animate-spin" />
                    ) : (
                      <Check size={12} />
                    )}
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditingInstructions(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-dark-border rounded-lg text-dark-muted hover:border-cm-purple/30 transition-all"
                >
                  <Pencil size={12} />
                  Edit
                </button>
              )}
            </div>
          </div>
          <div className="p-4">
            {editingInstructions ? (
              <textarea
                value={instructionsDraft}
                onChange={(e) => setInstructionsDraft(e.target.value)}
                onBlur={saveInstructions}
                className="w-full h-64 text-sm font-mono text-dark-text border border-dark-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-cm-purple resize-y"
                placeholder="Enter discovery agent instructions in Markdown..."
              />
            ) : (
              <pre className="text-sm text-dark-text whitespace-pre-wrap leading-relaxed font-mono bg-dark-bg rounded-lg p-3 min-h-[4rem]">
                {instructions || (
                  <span className="text-dark-muted italic">
                    No instructions yet. Click Edit to add some.
                  </span>
                )}
              </pre>
            )}
            <p className="text-xs text-dark-muted mt-2">
              File:{" "}
              <code className="bg-dark-panel2 px-1.5 py-0.5 rounded text-dark-muted">
                ~/.openclaw/workspace/projects/mastermind/DISCOVERY_INSTRUCTIONS.md
              </code>
            </p>
          </div>
        </div>
      )}

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
                — used by discovery agent each run
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
                      ? "bg-dark-success"
                      : kw.signal_strength >= 6
                      ? "bg-cm-purple"
                      : "bg-dark-muted/40"
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

      {/* Website Switcher */}
      <div className="flex items-center gap-3">
        <WebsiteSwitcher
          websites={websites}
          selectedDomain={selectedDomain}
          onSelect={setSelectedDomain}
          label="Site"
        />
      </div>

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
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel"
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
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
          <RefreshCw size={20} className="animate-spin text-cm-purple mr-2" />
          <span className="text-dark-muted text-sm">Loading discoveries...</span>
        </div>
      ) : sortedDiscoveries.length === 0 ? (
        <div className="text-center py-16 bg-dark-panel rounded-xl border border-dark-border">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-dark-muted font-medium">No discoveries yet</p>
          <p className="text-dark-muted text-sm mt-1">
            The discovery agent will populate this on its next run
          </p>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-bg">
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[22%]">
                  <button onClick={() => toggleSort("source_name")} className="flex items-center hover:text-cm-purple transition-colors">
                    Source Name<SortIcon field="source_name" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  Platform
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[32%]">
                  Description
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  <button onClick={() => toggleSort("audience_relevance_score")} className="flex items-center hover:text-cm-purple transition-colors">
                    Relevance<SortIcon field="audience_relevance_score" />
                  </button>
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[18%]">
                  <button onClick={() => toggleSort("date_discovered")} className="flex items-center hover:text-cm-purple transition-colors">
                    Opportunity<SortIcon field="date_discovered" />
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
                    className="hover:bg-dark-bg/50 transition-colors group"
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
                              className="mt-0.5 opacity-0 group-hover/link:opacity-100 text-cm-purple flex-shrink-0 transition-opacity"
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
                    <td className="px-4 py-3.5 align-middle">
                      <div className="flex flex-col gap-1 items-start">
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
