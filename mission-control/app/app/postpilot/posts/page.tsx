"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  FileText,
  ExternalLink,
  X,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface Post {
  id: string;
  clientId?: string;
  clientName?: string;
  title?: string;
  platform?: string;
  status?: "published" | "draft" | "failed";
  publishedAt?: string;
  url?: string;
  seoScore?: number;
}

interface ClientOption {
  id: string;
  name: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const POST_STATUS_COLORS: Record<string, string> = {
  published: "bg-dark-success/20 text-dark-success",
  draft: "bg-dark-panel2 text-dark-muted",
  failed: "bg-dark-danger/20 text-dark-danger",
};

// ── Page ─────────────────────────────────────────────────────────────

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterClient) params.set("clientId", filterClient);
      if (filterStatus) params.set("status", filterStatus);
      const qs = params.toString();
      const res = await fetch(`/api/postpilot/posts${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load posts");
      setPosts(await res.json());
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [filterClient, filterStatus]);

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/postpilot/clients");
      if (!res.ok) return;
      const data = await res.json();
      setClients(data.map((c: ClientOption) => ({ id: c.id, name: c.name })));
    } catch {
      // silently handle
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const clearFilters = () => {
    setFilterClient("");
    setFilterStatus("");
  };

  const hasFilters = filterClient || filterStatus;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight text-dark-text">Posts</h1>
          <span className="text-sm text-dark-muted">{posts.length} total</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-dark-muted mb-1">Client</label>
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple min-w-[160px]"
            >
              <option value="">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-muted mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple min-w-[140px]"
            >
              <option value="">All</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-2 text-sm text-dark-muted hover:text-dark-text transition-colors mt-5"
              >
                <X size={14} />
                Clear
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Posts Table */}
      {loading && posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
          <p className="text-dark-muted">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-dark-panel rounded-xl border border-dark-border">
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <FileText size={40} className="text-dark-muted mb-3" />
            <p className="text-dark-muted font-medium mb-1">No posts found</p>
            <p className="text-sm text-dark-muted">
              {hasFilters ? "Try adjusting your filters." : "Posts will appear here once the agent publishes."}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-panel2">
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Date</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Client</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Title</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Platform</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">SEO</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Link</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => {
                  const status = post.status ?? "published";
                  const seoScore = post.seoScore;
                  const seoColorClass =
                    seoScore == null
                      ? "bg-dark-panel2 text-dark-muted"
                      : seoScore >= 70
                      ? "bg-dark-success/20 text-dark-success"
                      : seoScore >= 50
                      ? "bg-dark-warn/20 text-dark-warn"
                      : "bg-dark-danger/20 text-dark-danger";

                  return (
                    <tr key={post.id} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                      <td className="px-5 py-3 text-dark-muted whitespace-nowrap">{fmtDate(post.publishedAt)}</td>
                      <td className="px-5 py-3 text-dark-text">{post.clientName ?? "\u2014"}</td>
                      <td className="px-5 py-3 text-dark-text max-w-xs truncate" title={post.title}>
                        {post.title ?? "\u2014"}
                      </td>
                      <td className="px-5 py-3 text-dark-muted">{post.platform ?? "\u2014"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${POST_STATUS_COLORS[status] ?? "bg-dark-panel2 text-dark-muted"}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {seoScore != null ? (
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${seoColorClass}`}>
                            {seoScore}
                          </span>
                        ) : (
                          <span className="text-dark-muted text-xs">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {post.url ? (
                          <a
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cm-purple hover:text-cm-purple transition-colors"
                          >
                            <ExternalLink size={14} />
                          </a>
                        ) : (
                          <span className="text-dark-muted">{"\u2014"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
