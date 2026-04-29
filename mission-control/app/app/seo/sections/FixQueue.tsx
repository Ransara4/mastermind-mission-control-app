"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Check, X, ChevronDown, ChevronRight, Filter, Sparkles, Copy, CheckCheck, ShieldCheck } from "lucide-react";
import type { FixQueueItem } from "@/lib/seo-types";
import VerifyPanel from "./VerifyPanel";

interface Props {
  domain: string;
  items: FixQueueItem[];
  hosting: string;
  onRefresh: () => void;
}

type FilterType = "all" | "auto" | "claude" | "manual";

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-dark-danger/20 border-dark-danger text-dark-danger";
    case "warning":
      return "bg-dark-warn/20 border-dark-warn text-dark-warn";
    default:
      return "bg-cm-purple/20 border-cm-purple text-cm-purple";
  }
}

function truncateUrl(url: string, maxLen = 50): string {
  try {
    const u = new URL(url);
    const path = u.pathname;
    if (path.length > maxLen) return path.slice(0, maxLen - 3) + "...";
    return path || "/";
  } catch {
    return url.length > maxLen ? url.slice(0, maxLen - 3) + "..." : url;
  }
}

export default function FixQueue({ domain, items, hosting: _hosting, onRefresh }: Props) {
  const storageKey = `seo-fix-status-${domain}`;

  const [filter, setFilter] = useState<FilterType>("all");
  const [fixingId, setFixingId] = useState<string | null>(null);
const [expandedSteps, setExpandedSteps] = useState<string | null>(null);
  const [itemStatuses, setItemStatuses] = useState<Record<string, "fixed" | "dismissed" | "sent">>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Persist status changes to localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(itemStatuses));
    } catch {}
  }, [itemStatuses, storageKey]);

  // Wrap onRefresh to clear persisted statuses (fix-queue.json is source of truth after refresh)
  const handleRefresh = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    setItemStatuses({});
    onRefresh();
  }, [onRefresh, storageKey]);

  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const [suggestingId, setSuggestingId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const isSuggestEligible = (item: FixQueueItem): boolean => {
    const msg = item.message?.toLowerCase() ?? "";
    return msg.includes("title") || msg.includes("description") || msg.includes("meta");
  };

  const inferSuggestType = (item: FixQueueItem): "title" | "description" => {
    const msg = item.message?.toLowerCase() ?? "";
    if (msg.includes("description")) return "description";
    return "title";
  };

  const fetchSuggestions = async (item: FixQueueItem) => {
    setSuggestingId(item.id);
    try {
      const type = inferSuggestType(item);
      const currentValue = item.fixParams?.value ?? item.fixParams?.currentValue ?? "";
      const res = await fetch("/api/seo/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          type,
          currentValue,
          pageUrl: item.page,
          keywords: [],
        }),
      });
      const data = await res.json();
      if (data.suggestions?.length) {
        setSuggestions((prev) => ({ ...prev, [item.id]: data.suggestions }));
      }
    } catch (err) {
      console.error("Suggest failed:", err);
    } finally {
      setSuggestingId(null);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {}
  };

  const pendingItems = items.filter((i) => i.status === "pending" && !itemStatuses[i.id]);
  const filteredItems = pendingItems.filter((i) => filter === "all" || i.fixType === filter);

  const autoCount = pendingItems.filter((i) => i.fixType === "auto").length;
  const claudeCount = pendingItems.filter((i) => i.fixType === "claude").length;
  const manualCount = pendingItems.filter((i) => i.fixType === "manual").length;

  const updateItemStatus = async (id: string, status: "fixed" | "dismissed") => {
    try {
      await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-fix-item", domain, id, status }),
      });
      setItemStatuses((prev) => ({ ...prev, [id]: status }));
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  // Returns true if the API actually fixed it, false if it failed or had nothing to do
  const fixAuto = async (item: FixQueueItem): Promise<boolean> => {
    setFixingId(item.id);
    try {
      if (!item.fixAction || !item.fixParams?.value) return false;
      const res = await fetch("/api/seo/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          directAction: { type: item.fixAction, value: item.fixParams.value },
        }),
      });
      const data = await res.json();
      const result = data.results?.[0];
      if (res.ok && result?.status === "fixed") {
        await updateItemStatus(item.id, "fixed");
        handleRefresh();
        return true;
      }
      return false;
    } catch (err) {
      console.error("Auto fix failed:", err);
      return false;
    } finally {
      setFixingId(null);
    }
  };

  // Send a batch of items to Claude Code as a single task card
  const sendItemsToClaude = async (items: FixQueueItem[]) => {
    if (items.length === 0) return;
    const commandLines = items
      .map((i) => `- [${i.severity}] ${i.message} — ${i.page}${i.steps ? `\n  Steps: ${i.steps.join(" → ")}` : ""}`)
      .join("\n");
    const command = `Fix the following SEO issues for ${domain}. Use the Wix API for meta/title updates, edit content directly for copy issues, and escalate to a human (leave a note) for anything requiring visual editor access.\n\n${commandLines}`;
    await fetch("/api/seo/claude-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        domain,
        command,
        issues: items.map((i) => ({ severity: i.severity, message: i.message })),
      }),
    });
    const updates: Record<string, "sent"> = {};
    for (const item of items) {
      updates[item.id] = "sent";
      await fetch("/api/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-fix-item", domain, id: item.id, status: "fixed" }),
      });
    }
    setItemStatuses((prev) => ({ ...prev, ...updates }));
  };

  const sendToClaude = async (item: FixQueueItem) => {
    setFixingId(item.id);
    try {
      await sendItemsToClaude([item]);
    } catch (err) {
      console.error("Claude task failed:", err);
    } finally {
      setFixingId(null);
    }
  };

// Hide entirely when no items — only show after autopilot runs
  if (items.length === 0) return null;

  if (pendingItems.length === 0) return null;

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "All", count: pendingItems.length },
    { key: "auto", label: "Auto", count: autoCount },
    { key: "claude", label: "Claude", count: claudeCount },
    { key: "manual", label: "Manual", count: manualCount },
  ];

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Fix Queue</h2>
          <span className="text-xs text-dark-muted bg-dark-panel2 px-2 py-0.5 rounded-full">
            {pendingItems.length} issues
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Filter size={14} className="text-dark-muted" />
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                filter === f.key
                  ? "bg-cm-purple text-white"
                  : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
      </div>


      {/* Item list */}
      <div className="divide-y divide-dark-border">
        {filteredItems.map((item) => {
          const localStatus = itemStatuses[item.id];

          // Already handled
          if (localStatus === "fixed" || localStatus === "dismissed") {
            return (
              <div key={item.id} className="py-2">
                <div className="flex items-center gap-2 px-2 bg-dark-success/10 rounded text-sm">
                  <Check size={14} className="text-dark-success" />
                  <span className="text-dark-success">Fixed</span>
                  <span className="text-dark-muted ml-2 flex-1">{item.message}</span>
                  {localStatus === "fixed" && item.fixType !== "manual" && (
                    <button
                      onClick={() => setVerifyingId(verifyingId === item.id ? null : item.id)}
                      className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-dark-border text-dark-muted hover:text-dark-text hover:border-cm-purple transition-colors"
                    >
                      <ShieldCheck size={11} />
                      Verify
                    </button>
                  )}
                </div>
                {verifyingId === item.id && (
                  <VerifyPanel
                    domain={domain}
                    url={item.page || `https://${domain}/`}
                    onClose={() => setVerifyingId(null)}
                  />
                )}
              </div>
            );
          }

          if (localStatus === "sent") {
            return (
              <div key={item.id} className="flex items-center gap-2 py-2 px-2 bg-cm-purple/10 rounded text-sm">
                <Check size={14} className="text-cm-purple" />
                <span className="text-cm-purple">Sent to Claude Code</span>
                <span className="text-dark-muted ml-2">{item.message}</span>
              </div>
            );
          }

          return (
            <div key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-2">
                {/* Severity badge */}
                <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold uppercase rounded border ${severityBadge(item.severity)}`}>
                  {item.severity}
                </span>

                {/* Category */}
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium uppercase rounded bg-dark-panel2 text-dark-muted">
                  {item.category}
                </span>

                {/* Message + URL */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-text">{item.message}</p>
                  <p className="text-xs text-dark-muted truncate">{truncateUrl(item.page)}</p>
                </div>

                {/* Action button */}
                <div className="flex items-center gap-1 shrink-0">
                  {item.fixType === "auto" && (
                    <button
                      onClick={() => fixAuto(item)}
                      disabled={fixingId === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-cm-purple text-white rounded-md hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
                    >
                      {fixingId === item.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Fix Now
                    </button>
                  )}

                  {item.fixType === "claude" && (
                    <button
                      onClick={() => sendToClaude(item)}
                      disabled={fixingId === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-cm-purple text-white rounded-md hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
                    >
                      {fixingId === item.id ? <Loader2 size={12} className="animate-spin" /> : null}
                      Claude Code
                    </button>
                  )}

                  {item.fixType === "manual" && item.steps && (
                    <button
                      onClick={() => setExpandedSteps(expandedSteps === item.id ? null : item.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-dark-panel2 text-dark-text rounded-md hover:bg-dark-panel2 transition-colors"
                    >
                      {expandedSteps === item.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      View Steps
                    </button>
                  )}

                  {/* AI Suggestions */}
                  {isSuggestEligible(item) && !suggestions[item.id] && (
                    <button
                      onClick={() => fetchSuggestions(item)}
                      disabled={suggestingId === item.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs bg-cm-purple text-white rounded-md hover:bg-cm-purple/80 transition-colors disabled:opacity-50"
                    >
                      {suggestingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      AI Suggest
                    </button>
                  )}

                  {/* Dismiss */}
                  <button
                    onClick={() => updateItemStatus(item.id, "dismissed")}
                    className="p-1 text-dark-muted hover:text-dark-text transition-colors"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded steps */}
              {item.fixType === "manual" && expandedSteps === item.id && item.steps && (
                <div className="mt-2 ml-8 p-3 bg-dark-panel2 rounded-lg">
                  <ol className="space-y-1">
                    {item.steps.map((step, i) => (
                      <li key={i} className="text-xs text-dark-muted flex gap-2">
                        <span className="text-dark-muted font-mono">{i + 1}.</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* AI Suggestions */}
              {suggestions[item.id] && suggestions[item.id].length > 0 && (
                <div className="mt-2 ml-8 flex flex-wrap gap-2">
                  {suggestions[item.id].map((s, i) => {
                    const chipKey = `${item.id}-${i}`;
                    return (
                      <button
                        key={i}
                        onClick={() => copyToClipboard(s, chipKey)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cm-purple/10 text-cm-purple border border-cm-purple/20 rounded-full hover:bg-cm-purple/20 transition-colors"
                        title="Click to copy"
                      >
                        <span className="max-w-[300px] truncate">{s}</span>
                        {copiedKey === chipKey ? <CheckCheck size={12} className="text-dark-success shrink-0" /> : <Copy size={12} className="text-cm-purple shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
