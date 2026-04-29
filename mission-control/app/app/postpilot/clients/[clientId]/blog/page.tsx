"use client";

import { use, useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  Search,
  FileText,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
} from "lucide-react";

interface Post {
  id: number;
  title: string;
  slug: string | null;
  excerpt: string | null;
  content_markdown: string | null;
  quality_score: number | null;
  quality_notes: string | null;
  status: string;
  content_pillar: string | null;
  word_count: number | null;
  topic_source: string | null;
  target_segment: string | null;
  generated_at: string;
  rejection_reason: string | null;
}

interface Stats {
  pending: number;
  queued: number;
  published: number;
  rejected: number;
  total: number;
  avg_quality: number;
}

const STATUS_COLORS: Record<string, string> = {
  needs_review: "bg-dark-warn/20 text-dark-warn",
  queued: "bg-cm-purple/20 text-cm-purple",
  published: "bg-dark-success/20 text-dark-success",
  rejected: "bg-dark-danger/20 text-dark-danger",
};

function QualityBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) return null;
  const color =
    score >= 8
      ? "bg-dark-success/20 text-dark-success"
      : score >= 5
      ? "bg-dark-warn/20 text-dark-warn"
      : "bg-dark-danger/20 text-dark-danger";
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
      {score}/10
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        STATUS_COLORS[status] || "bg-dark-panel2 text-dark-muted"
      }`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default function BlogPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = use(params);
  const base = `/api/postpilot/clients/${clientId}`;

  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`${base}/posts?${params.toString()}`);
      const data = await res.json();
      setPosts(data.posts || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [base, statusFilter, search]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  async function generateBlogs() {
    setGenerating(true);
    try {
      await fetch(`${base}/generate`, { method: "POST" });
      setTimeout(() => {
        fetchPosts().finally(() => setGenerating(false));
      }, 10000);
    } catch (err) {
      console.error("Failed to generate blogs:", err);
      setGenerating(false);
    }
  }

  async function postAction(
    action: "approve" | "reject" | "delete",
    postId: number,
    reason?: string
  ) {
    setActionLoading(postId);
    try {
      await fetch(`${base}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, postId, reason }),
      });
      setSelectedPost(null);
      await fetchPosts();
    } catch (err) {
      console.error(`Failed to ${action} post:`, err);
    } finally {
      setActionLoading(null);
    }
  }

  function handleReject(postId: number) {
    const reason = window.prompt("Rejection reason:");
    if (reason !== null) {
      postAction("reject", postId, reason);
    }
  }

  function handleDelete(postId: number) {
    if (window.confirm("Delete this post?")) {
      postAction("delete", postId);
    }
  }

  const statItems = stats
    ? [
        {
          label: "Needs Review",
          value: stats.pending,
          color: "bg-dark-warn/10 border-dark-warn/30 text-dark-warn",
          filter: "needs_review",
        },
        {
          label: "Queued",
          value: stats.queued,
          color: "bg-cm-purple/10 border-cm-purple/30 text-cm-purple",
          filter: "queued",
        },
        {
          label: "Published",
          value: stats.published,
          color: "bg-dark-success/10 border-dark-success/30 text-dark-success",
          filter: "published",
        },
        {
          label: "Rejected",
          value: stats.rejected,
          color: "bg-dark-danger/10 border-dark-danger/30 text-dark-danger",
          filter: "rejected",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {statItems.map((item) => (
            <button
              key={item.label}
              onClick={() =>
                setStatusFilter(statusFilter === item.filter ? "" : item.filter)
              }
              className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-all ${
                item.color
              } ${
                statusFilter === item.filter
                  ? "ring-2 ring-offset-1 ring-current"
                  : "hover:shadow-sm"
              }`}
            >
              <span className="text-2xl font-bold">{item.value}</span>
              <span className="text-xs font-medium mt-0.5">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={generateBlogs}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-all disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Sparkles size={15} />
            )}
            {generating ? "Generating..." : "Generate Blogs"}
          </button>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple bg-dark-panel"
          >
            <option value="">All statuses</option>
            <option value="needs_review">Needs Review</option>
            <option value="queued">Queued</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div className="relative flex-1 max-w-xs">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-cm-purple"
          />
        </div>
      </div>

      {/* Posts Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2
            size={20}
            className="animate-spin text-cm-purple mr-2"
          />
          <span className="text-dark-muted text-sm">Loading posts...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 bg-dark-panel rounded-xl border border-dark-border">
          <FileText size={40} className="mx-auto text-dark-muted mb-3" />
          <p className="text-dark-muted font-medium">No posts found</p>
          <p className="text-dark-muted text-sm mt-1">
            Generate some blogs or adjust your filters
          </p>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border bg-dark-panel2">
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[35%]">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[12%]">
                  Pillar
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[12%]">
                  Status
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  Quality
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[8%]">
                  Words
                </th>
                <th className="text-left px-4 py-3 font-medium text-dark-muted w-[10%]">
                  Date
                </th>
                <th className="px-4 py-3 w-[13%]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {posts.map((post) => (
                <tr
                  key={post.id}
                  className="hover:bg-dark-panel2/50 transition-colors group"
                >
                  <td className="px-4 py-3 align-top">
                    <button
                      onClick={() => setSelectedPost(post)}
                      className="text-left font-medium text-dark-text hover:text-cm-purple transition-colors leading-tight"
                    >
                      {post.title.length > 60
                        ? post.title.slice(0, 60) + "..."
                        : post.title}
                    </button>
                  </td>
                  <td className="px-4 py-3 align-top">
                    {post.content_pillar && (
                      <span className="text-xs text-dark-muted">
                        {post.content_pillar}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={post.status} />
                  </td>
                  <td className="px-4 py-3 align-top">
                    <QualityBadge score={post.quality_score} />
                  </td>
                  <td className="px-4 py-3 align-top text-dark-muted text-xs">
                    {post.word_count?.toLocaleString() ?? "-"}
                  </td>
                  <td className="px-4 py-3 align-top text-dark-muted text-xs">
                    {post.generated_at
                      ? new Date(post.generated_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3 align-top text-right">
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {post.status === "needs_review" && (
                        <button
                          onClick={() => postAction("approve", post.id)}
                          disabled={actionLoading === post.id}
                          className="p-1.5 text-dark-success hover:bg-dark-success/10 rounded-lg transition-all"
                          title="Approve"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      {post.status === "needs_review" && (
                        <button
                          onClick={() => handleReject(post.id)}
                          disabled={actionLoading === post.id}
                          className="p-1.5 text-dark-warn hover:bg-dark-warn/10 rounded-lg transition-all"
                          title="Reject"
                        >
                          <XCircle size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(post.id)}
                        disabled={actionLoading === post.id}
                        className="p-1.5 text-dark-muted hover:text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-dark-panel rounded-2xl shadow-2xl shadow-black/40 w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-dark-border">
              <div className="flex-1 min-w-0 mr-4">
                <h2 className="text-lg  font-semibold tracking-tight text-dark-text leading-tight">
                  {selectedPost.title}
                </h2>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <StatusBadge status={selectedPost.status} />
                  <QualityBadge score={selectedPost.quality_score} />
                  {selectedPost.word_count && (
                    <span className="text-xs text-dark-muted">
                      {selectedPost.word_count.toLocaleString()} words
                    </span>
                  )}
                  {selectedPost.content_pillar && (
                    <span className="text-xs px-2 py-0.5 bg-dark-panel2 text-dark-muted rounded-full">
                      {selectedPost.content_pillar}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-panel2 rounded-lg transition-all flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {selectedPost.excerpt && (
                <div>
                  <h3 className="text-xs  font-semibold tracking-tight text-dark-muted uppercase tracking-wider mb-1">
                    Excerpt
                  </h3>
                  <p className="text-sm text-dark-text leading-relaxed">
                    {selectedPost.excerpt}
                  </p>
                </div>
              )}
              {selectedPost.quality_notes && (
                <div>
                  <h3 className="text-xs  font-semibold tracking-tight text-dark-muted uppercase tracking-wider mb-1">
                    Quality Notes
                  </h3>
                  <p className="text-sm text-dark-muted leading-relaxed">
                    {selectedPost.quality_notes}
                  </p>
                </div>
              )}
              {selectedPost.rejection_reason && (
                <div className="bg-dark-danger/10 border border-dark-danger/20 rounded-lg p-3">
                  <h3 className="text-xs  font-semibold tracking-tight text-dark-danger uppercase tracking-wider mb-1">
                    Rejection Reason
                  </h3>
                  <p className="text-sm text-dark-danger">
                    {selectedPost.rejection_reason}
                  </p>
                </div>
              )}
              {selectedPost.content_markdown && (
                <div>
                  <h3 className="text-xs  font-semibold tracking-tight text-dark-muted uppercase tracking-wider mb-1">
                    Content
                  </h3>
                  <pre className="text-sm text-dark-text whitespace-pre-wrap leading-relaxed font-mono bg-dark-panel2 rounded-lg p-4 max-h-[50vh] overflow-y-auto border border-dark-border">
                    {selectedPost.content_markdown}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-dark-border bg-dark-panel2 rounded-b-2xl">
              {selectedPost.status === "needs_review" && (
                <>
                  <button
                    onClick={() => postAction("approve", selectedPost.id)}
                    disabled={actionLoading === selectedPost.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-dark-success text-white rounded-lg hover:bg-cm-purple/80 transition-all disabled:opacity-50"
                  >
                    {actionLoading === selectedPost.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CheckCircle2 size={14} />
                    )}
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(selectedPost.id)}
                    disabled={actionLoading === selectedPost.id}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm bg-dark-warn/100 text-white rounded-lg hover:bg-dark-warn transition-all disabled:opacity-50"
                  >
                    <XCircle size={14} />
                    Reject
                  </button>
                </>
              )}
              <button
                onClick={() => handleDelete(selectedPost.id)}
                disabled={actionLoading === selectedPost.id}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-dark-danger bg-dark-panel border border-dark-danger/30 rounded-lg hover:bg-dark-danger/10 transition-all disabled:opacity-50"
              >
                <Trash2 size={14} />
                Delete
              </button>
              <button
                onClick={() => setSelectedPost(null)}
                className="px-4 py-2 text-sm text-dark-muted bg-dark-panel border border-dark-border rounded-lg hover:border-dark-border transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
