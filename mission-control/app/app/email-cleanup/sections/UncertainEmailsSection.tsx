"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  CheckSquare,
  Square,
  Loader2,
  Search,
  ExternalLink,
  Shield,
  ChevronDown,
  ChevronRight,
  Clock,
  Mail,
  BarChart3,
} from "lucide-react";

type FilterTab = "pending" | "all" | "approved" | "denied";

interface UncertainEmail {
  id: string;
  messageId: string;
  from: string;
  subject: string;
  snippet: string;
  receivedAt: number;
  flaggedAt: number;
  reason: string;
  suggestedAction: string;
  status: "pending" | "approved" | "denied";
  resolvedAt?: number;
  resolvedAction?: string;
}

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  const entities: Record<string, string> = {
    "&#39;": "'",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#x27;": "'",
    "&#x2F;": "/",
    "&nbsp;": " ",
  };
  let decoded = text;
  for (const [entity, char] of Object.entries(entities)) {
    decoded = decoded.split(entity).join(char);
  }
  // Handle decimal entities like &#123;
  decoded = decoded.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10))
  );
  // Handle hex entities like &#xAB;
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16))
  );
  return decoded;
}

function formatRelativeDate(timestamp: number): string {
  if (!timestamp || isNaN(timestamp) || timestamp === 0) return "Unknown";
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 0) return new Date(timestamp).toLocaleDateString();

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return new Date(timestamp).toLocaleDateString();
}

function extractSenderDomain(from: string): string {
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/[\w.-]+@[\w.-]+/);
  if (emailMatch) {
    const email = emailMatch[1] || emailMatch[0];
    const parts = email.split("@");
    return parts.length > 1 ? parts[1] : email;
  }
  return from;
}

function extractSenderEmail(from: string): string {
  const match = from.match(/<([^>]+)>/);
  if (match) return match[1];
  const emailMatch = from.match(/[\w.-]+@[\w.-]+/);
  return emailMatch ? emailMatch[0] : from;
}

function extractSenderName(from: string): string {
  const match = from.match(/^"?([^"<]+)"?\s*</);
  if (match) return match[1].trim();
  return from.split("@")[0];
}

export default function UncertainEmailsSection() {
  const [allEmails, setAllEmails] = useState<UncertainEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [groupBySender, setGroupBySender] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [whitelistSuccess, setWhitelistSuccess] = useState<Set<string>>(
    new Set()
  );
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmails = useCallback(async () => {
    try {
      const response = await fetch(
        "/api/emmie/uncertain?status=all&limit=500"
      );
      const data = await response.json();

      if (data.success && data.emails) {
        setAllEmails(data.emails);
        setError(null);
      } else {
        setError("Failed to load uncertain emails");
      }
    } catch (err) {
      console.error("Error fetching uncertain emails:", err);
      setError("Error loading uncertain emails");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(fetchEmails, 30000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  // Filter by tab
  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return allEmails;
    return allEmails.filter((e) => e.status === activeTab);
  }, [allEmails, activeTab]);

  // Filter by search
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return tabFiltered;
    const q = searchQuery.toLowerCase();
    return tabFiltered.filter(
      (e) =>
        e.from.toLowerCase().includes(q) ||
        e.subject.toLowerCase().includes(q) ||
        e.reason.toLowerCase().includes(q) ||
        decodeHtmlEntities(e.snippet || "")
          .toLowerCase()
          .includes(q)
    );
  }, [tabFiltered, searchQuery]);

  // Group by sender domain
  const senderGroups = useMemo(() => {
    if (!groupBySender) return null;
    const groups: Record<string, UncertainEmail[]> = {};
    for (const email of filteredEmails) {
      const domain = extractSenderDomain(email.from);
      if (!groups[domain]) groups[domain] = [];
      groups[domain].push(email);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredEmails, groupBySender]);

  // Stats
  const stats = useMemo(() => {
    const pending = allEmails.filter((e) => e.status === "pending").length;
    const approved = allEmails.filter((e) => e.status === "approved").length;
    const denied = allEmails.filter((e) => e.status === "denied").length;
    const total = allEmails.length;

    const now = Date.now();
    const todayStart = new Date().setHours(0, 0, 0, 0);
    const weekStart = now - 7 * 86400000;

    const flaggedToday = allEmails.filter(
      (e) => e.flaggedAt >= todayStart
    ).length;
    const flaggedThisWeek = allEmails.filter(
      (e) => e.flaggedAt >= weekStart
    ).length;
    const approvalRate =
      approved + denied > 0
        ? Math.round((approved / (approved + denied)) * 100)
        : 0;

    return {
      pending,
      approved,
      denied,
      total,
      flaggedToday,
      flaggedThisWeek,
      approvalRate,
    };
  }, [allEmails]);

  const tabCounts: Record<FilterTab, number> = {
    pending: stats.pending,
    all: stats.total,
    approved: stats.approved,
    denied: stats.denied,
  };

  const handleResolve = async (
    id: string,
    newStatus: "approved" | "denied",
    action?: string
  ) => {
    setProcessingIds((prev) => new Set(prev).add(id));
    try {
      const response = await fetch(`/api/emmie/uncertain?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, action }),
      });

      if (response.ok) {
        const resolvedAction = action || (newStatus === "denied" ? "keep" : undefined);
        setAllEmails((prev) =>
          prev.map((e) =>
            e.id === id
              ? {
                  ...e,
                  status: newStatus,
                  resolvedAt: Date.now(),
                  resolvedAction,
                }
              : e
          )
        );
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        showToast(`Failed to ${newStatus === "approved" ? "approve" : "deny"} email`, "error");
      }
    } catch (err) {
      console.error(`Failed to ${newStatus} email:`, err);
      showToast(`Failed to ${newStatus === "approved" ? "approve" : "deny"} email`, "error");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkAction = async (action: "archive" | "keep") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setProcessingIds((prev) => new Set([...prev, ...ids]));

    try {
      const response = await fetch("/api/emmie/uncertain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids }),
      });

      if (response.ok) {
        const data = await response.json();
        const newStatus: UncertainEmail["status"] = action === "archive" ? "approved" : "denied";
        setAllEmails((prev) =>
          prev.map((e) =>
            ids.includes(e.id)
              ? {
                  ...e,
                  status: newStatus,
                  resolvedAt: Date.now(),
                  resolvedAction: action,
                }
              : e
          )
        );
        setSelectedIds(new Set());

        if (data.archiveErrors && data.archiveErrors.length > 0) {
          showToast(`${ids.length} processed, but ${data.archiveErrors.length} archive error(s)`, "error");
        } else {
          showToast(`${ids.length} email(s) ${action === "archive" ? "archived" : "kept"}`, "success");
        }
      } else {
        showToast("Failed to process bulk action", "error");
      }
    } catch (err) {
      console.error("Failed to process bulk action:", err);
      showToast("Failed to process bulk action", "error");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  };

  const handleAddToWhitelist = async (email: UncertainEmail) => {
    const senderEmail = extractSenderEmail(email.from);
    const senderName = extractSenderName(email.from);

    try {
      const response = await fetch("/api/emmie/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: senderEmail,
          name: senderName,
          reason: `Added from uncertain emails review`,
          pattern: "exact",
        }),
      });

      if (response.ok) {
        setWhitelistSuccess((prev) => new Set(prev).add(email.id));
        showToast(`${senderEmail} added to whitelist`, "success");
        setTimeout(() => {
          setWhitelistSuccess((prev) => {
            const next = new Set(prev);
            next.delete(email.id);
            return next;
          });
        }, 3000);
      } else {
        showToast("Failed to add sender to whitelist", "error");
      }
    } catch (err) {
      console.error("Failed to add to whitelist:", err);
      showToast("Failed to add sender to whitelist", "error");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const pendingOnly = filteredEmails.filter((e) => e.status === "pending");
    setSelectedIds(new Set(pendingOnly.map((e) => e.id)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const toggleSenderGroup = (domain: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-dark-muted mr-3" size={24} />
        <span className="text-dark-muted">Loading uncertain emails...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-dark-danger">
        <AlertCircle size={32} className="mx-auto mb-3" />
        {error}
      </div>
    );
  }

  const renderEmailCard = (email: UncertainEmail) => {
    const isProcessing = processingIds.has(email.id);
    const isResolved = email.status !== "pending";
    const isWhitelisted = whitelistSuccess.has(email.id);

    return (
      <div
        key={email.id}
        className={`bg-dark-panel rounded-lg border ${
          selectedIds.has(email.id)
            ? "border-cm-purple ring-2 ring-cm-purple/20"
            : isResolved
            ? "border-dark-border bg-dark-bg/50"
            : "border-dark-border"
        } p-4 hover:shadow-sm transition-all ${isResolved ? "opacity-75" : ""}`}
      >
        <div className="flex items-start gap-4">
          {/* Checkbox - only for pending */}
          {!isResolved && (
            <button
              onClick={() => toggleSelect(email.id)}
              className="mt-1 flex-shrink-0"
              disabled={isProcessing}
            >
              {selectedIds.has(email.id) ? (
                <CheckSquare size={20} className="text-cm-purple" />
              ) : (
                <Square size={20} className="text-dark-muted" />
              )}
            </button>
          )}

          {/* Status icon */}
          <div
            className={`p-2 rounded-lg flex-shrink-0 ${
              email.status === "approved"
                ? "bg-dark-success/20"
                : email.status === "denied"
                ? "bg-dark-danger/20"
                : "bg-dark-warn/20"
            }`}
          >
            {email.status === "approved" ? (
              <CheckCircle size={20} className="text-dark-success" />
            ) : email.status === "denied" ? (
              <XCircle size={20} className="text-dark-danger" />
            ) : (
              <AlertCircle size={20} className="text-dark-warn" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold  text-dark-text truncate">
                  {decodeHtmlEntities(email.subject)}
                </h3>
                <p className="text-sm text-dark-muted">
                  {decodeHtmlEntities(email.from)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-dark-muted">
                  {formatRelativeDate(email.receivedAt)}
                </span>
                <a
                  href={`https://mail.google.com/mail/u/0/#inbox/${email.messageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-dark-muted hover:text-cm-purple transition-colors"
                  title="Open in Gmail"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>

            {email.snippet && (
              <p className="text-sm text-dark-muted mb-3 line-clamp-2">
                {decodeHtmlEntities(email.snippet)}
              </p>
            )}

            {/* Reason */}
            <div className="mb-3 p-2 bg-dark-bg rounded text-sm">
              <span className="font-medium text-dark-text">Why flagged:</span>{" "}
              <span className="text-dark-muted">{email.reason}</span>
            </div>

            {/* Resolution info for resolved emails */}
            {isResolved && email.resolvedAt && (
              <div
                className={`mb-3 p-2 rounded text-sm ${
                  email.status === "approved"
                    ? "bg-dark-success/10 text-dark-success"
                    : "bg-dark-danger/10 text-dark-danger"
                }`}
              >
                <span className="font-medium">
                  {email.status === "approved" ? "Approved" : "Denied"}
                </span>{" "}
                {formatRelativeDate(email.resolvedAt)}
                {email.resolvedAction && (
                  <span>
                    {" "}
                    &middot; Action: <span className="capitalize">{email.resolvedAction}</span>
                  </span>
                )}
              </div>
            )}

            {/* Actions - only for pending */}
            {!isResolved && (
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() =>
                    handleResolve(email.id, "approved", email.suggestedAction || "archive")
                  }
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-success/100 text-white rounded-lg hover:bg-dark-success/30 transition-colors text-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  <span>
                    Approve ({email.suggestedAction || "archive"})
                  </span>
                </button>
                <button
                  onClick={() => handleResolve(email.id, "denied")}
                  disabled={isProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-panel2 text-dark-text rounded-lg hover:bg-dark-panel2 transition-colors text-sm disabled:opacity-50"
                >
                  {isProcessing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  <span>Keep in Inbox</span>
                </button>
                <button
                  onClick={() => handleAddToWhitelist(email)}
                  disabled={isWhitelisted}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-sm ${
                    isWhitelisted
                      ? "bg-dark-success/20 text-dark-success"
                      : "bg-cm-purple/10 text-cm-purple hover:bg-cm-purple/20"
                  }`}
                >
                  <Shield size={14} />
                  <span>{isWhitelisted ? "Whitelisted" : "Whitelist Sender"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg shadow-black/30 text-sm font-medium transition-all ${
            toast.type === "error"
              ? "bg-red-600 text-white"
              : "bg-dark-success text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold  text-dark-text mb-2">
          Uncertain Emails
        </h1>
        <p className="text-dark-muted">
          Review emails Emmie wasn&apos;t sure about
        </p>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-orange-500" />
            <p className="text-sm text-dark-muted">Pending</p>
          </div>
          <p className="text-2xl font-bold text-dark-text">{stats.pending}</p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle size={16} className="text-cm-purple" />
            <p className="text-sm text-dark-muted">Flagged Today</p>
          </div>
          <p className="text-2xl font-bold text-dark-text">
            {stats.flaggedToday}
          </p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={16} className="text-purple-500" />
            <p className="text-sm text-dark-muted">This Week</p>
          </div>
          <p className="text-2xl font-bold text-dark-text">
            {stats.flaggedThisWeek}
          </p>
        </div>
        <div className="bg-dark-panel rounded-lg border border-dark-border p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={16} className="text-dark-success" />
            <p className="text-sm text-dark-muted">Approval Rate</p>
          </div>
          <p className="text-2xl font-bold text-dark-text">
            {stats.approvalRate}%
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden">
        <div className="flex border-b border-dark-border">
          {(["pending", "all", "approved", "denied"] as FilterTab[]).map(
            (tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedIds(new Set());
                }}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? "bg-cm-purple/10 text-cm-purple border-b-2 border-cm-purple"
                    : "text-dark-muted hover:bg-dark-bg"
                }`}
              >
                <span className="capitalize">{tab}</span>
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab
                      ? "bg-cm-purple/20 text-cm-purple"
                      : "bg-dark-panel2 text-dark-muted"
                  }`}
                >
                  {tabCounts[tab]}
                </span>
              </button>
            )
          )}
        </div>

        {/* Search & Controls */}
        <div className="p-4 flex items-center gap-4 border-b border-dark-border">
          <div className="flex-1 relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by sender, subject, or reason..."
              className="w-full pl-9 pr-4 py-2 border border-dark-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setGroupBySender(!groupBySender)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors whitespace-nowrap ${
              groupBySender
                ? "bg-cm-purple/20 text-cm-purple"
                : "bg-dark-panel2 text-dark-muted hover:bg-dark-panel2"
            }`}
          >
            Group by Sender
          </button>
        </div>

        {/* Selection Bar */}
        {activeTab === "pending" && (
          <div className="px-4 py-3 flex items-center justify-between bg-dark-bg border-b border-dark-border">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-muted">
                  {filteredEmails.length} emails
                </span>
                {selectedIds.size > 0 && (
                  <span className="text-sm font-medium text-cm-purple">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={selectAll}
                  className="px-2 py-1 text-xs text-cm-purple hover:bg-cm-purple/10 rounded transition-colors"
                >
                  Select All
                </button>
                {selectedIds.size > 0 && (
                  <button
                    onClick={clearSelection}
                    className="px-2 py-1 text-xs text-dark-muted hover:bg-dark-panel2 rounded transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleBulkAction("archive")}
                  disabled={processingIds.size > 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-success text-white rounded-lg hover:bg-dark-success/30 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {processingIds.size > 0 ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} />
                  )}
                  Archive {selectedIds.size}
                </button>
                <button
                  onClick={() => handleBulkAction("keep")}
                  disabled={processingIds.size > 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {processingIds.size > 0 ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <XCircle size={14} />
                  )}
                  Keep {selectedIds.size}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Email List */}
      <div className="space-y-3">
        {filteredEmails.length === 0 ? (
          <div className="bg-dark-panel rounded-lg border border-dark-border p-8 text-center">
            {activeTab === "pending" ? (
              <>
                <CheckCircle
                  size={48}
                  className="mx-auto mb-4 text-dark-success"
                />
                <h3 className="text-lg font-bold  text-dark-text mb-2">
                  All Caught Up!
                </h3>
                <p className="text-dark-muted mb-4">
                  No uncertain emails to review at the moment.
                </p>
                <div className="text-sm text-dark-muted space-y-1">
                  <p>Next scan: 4:00 AM daily</p>
                  {stats.total > 0 && (
                    <p>
                      This week: {stats.flaggedThisWeek} flagged,{" "}
                      {stats.approvalRate}% approval rate
                    </p>
                  )}
                </div>
              </>
            ) : searchQuery ? (
              <>
                <Search size={48} className="mx-auto mb-4 text-dark-muted" />
                <h3 className="text-lg font-bold  text-dark-text mb-2">
                  No Results
                </h3>
                <p className="text-dark-muted">
                  No emails match &quot;{searchQuery}&quot;
                </p>
              </>
            ) : (
              <>
                <Mail size={48} className="mx-auto mb-4 text-dark-muted" />
                <h3 className="text-lg font-bold  text-dark-text mb-2">
                  No {activeTab} Emails
                </h3>
                <p className="text-dark-muted">
                  Nothing in this category yet.
                </p>
              </>
            )}
          </div>
        ) : groupBySender && senderGroups ? (
          // Grouped view
          senderGroups.map(([domain, emails]) => (
            <div
              key={domain}
              className="bg-dark-panel rounded-lg border border-dark-border overflow-hidden"
            >
              <button
                onClick={() => toggleSenderGroup(domain)}
                className="w-full flex items-center justify-between p-4 hover:bg-dark-bg transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedGroups.has(domain) ? (
                    <ChevronDown size={16} className="text-dark-muted" />
                  ) : (
                    <ChevronRight size={16} className="text-dark-muted" />
                  )}
                  <span className="font-medium text-dark-text">{domain}</span>
                  <span className="px-2 py-0.5 bg-dark-panel2 text-dark-muted text-xs rounded-full">
                    {emails.length} email{emails.length !== 1 ? "s" : ""}
                  </span>
                </div>
                {activeTab === "pending" &&
                  emails.some((e) => e.status === "pending") && (
                    <button
                      onClick={(ev) => {
                        ev.stopPropagation();
                        const pendingIds = emails
                          .filter((e) => e.status === "pending")
                          .map((e) => e.id);
                        setSelectedIds(
                          (prev) => new Set([...prev, ...pendingIds])
                        );
                      }}
                      className="text-xs text-cm-purple hover:text-cm-purple px-2 py-1 hover:bg-cm-purple/10 rounded"
                    >
                      Select All from Sender
                    </button>
                  )}
              </button>
              {expandedGroups.has(domain) && (
                <div className="border-t border-dark-border p-3 space-y-3">
                  {emails.map(renderEmailCard)}
                </div>
              )}
            </div>
          ))
        ) : (
          // Flat view
          filteredEmails.map(renderEmailCard)
        )}
      </div>
    </div>
  );
}
