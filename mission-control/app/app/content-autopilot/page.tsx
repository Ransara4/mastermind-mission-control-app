"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  Sparkles,
  Linkedin,
  Instagram,
  Youtube,
  Music2,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Send,
} from "lucide-react";

interface PlatformContent {
  copy?: string;
  hashtags?: string[];
  charCount?: number;
  title?: string;
  description?: string;
  tags?: string[];
}

interface Post {
  id: string;
  topic: string;
  tone: string;
  platforms: Record<string, PlatformContent>;
  status: string;
  scheduledFor: string | null;
  postedAt: string | null;
  postedTo: string[];
  createdAt: string;
}

interface Stats {
  total: number;
  draft: number;
  scheduled: number;
  posted: number;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={14} />,
  instagram: <Instagram size={14} />,
  youtube: <Youtube size={14} />,
  tiktok: <Music2 size={14} />,
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

const TONES = [
  "professional-casual",
  "inspirational",
  "educational",
  "motivational",
  "storytelling",
  "bold-contrarian",
];

export default function ContentAutopilotPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    draft: 0,
    scheduled: 0,
    posted: 0,
  });
  const [themes, setThemes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);

  // Form state
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState("professional-casual");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "linkedin",
    "instagram",
    "tiktok",
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-autopilot");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        setStats(data.stats || { total: 0, draft: 0, scheduled: 0, posted: 0 });
        setThemes(data.themes || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    if (!topic.trim() || selectedPlatforms.length === 0) return;
    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/content-autopilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic: topic.trim(),
          tone,
          platforms: selectedPlatforms,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setGenError(d.error || "Generation failed");
        return;
      }
      setTopic("");
      setExpandedPost(null);
      await load();
    } catch {
      setGenError("Network error");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleMarkPosted = async (postId: string, platform: string) => {
    await fetch("/api/content-autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark-posted", id: postId, platform }),
    });
    await load();
  };

  const handleDelete = async (postId: string) => {
    await fetch("/api/content-autopilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", id: postId }),
    });
    await load();
  };

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2.5 bg-cm-purple/15 rounded-lg">
              <Rocket size={22} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-dark-text">
                Content Autopilot
              </h1>
              <p className="text-sm text-dark-muted mt-0.5">
                AI-powered multi-platform content engine — built by Nightcrawler
              </p>
            </div>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-1.5 text-dark-muted hover:text-dark-text transition-colors text-sm"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: stats.total },
          { label: "Drafts", value: stats.draft },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Posted", value: stats.posted },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-dark-panel border border-dark-border rounded-xl p-4"
          >
            <p className="text-2xl font-bold text-dark-text">{s.value}</p>
            <p className="text-xs text-dark-muted mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Generate */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h2 className="text-dark-text font-semibold mb-4 flex items-center gap-2">
          <Sparkles size={16} className="text-cm-purple" />
          Generate Content
        </h2>

        <div className="space-y-4">
          {/* Topic */}
          <div>
            <label className="text-xs text-dark-muted block mb-1">
              Topic / Idea
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., 5 things I learned building AI agents as a solopreneur in Bali..."
              className="w-full px-3 py-2 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple resize-y"
              rows={3}
            />
          </div>

          {/* Theme suggestions */}
          {themes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-3 py-1 text-xs hover:text-dark-text hover:border-cm-purple/50 transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {/* Tone + Platforms */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="text-xs text-dark-muted block mb-1">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-1.5 bg-dark-panel2 border border-dark-border rounded-lg text-sm text-dark-text focus:outline-none focus:border-cm-purple"
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-xs text-dark-muted block mb-1">
                Platforms
              </label>
              <div className="flex gap-2">
                {["linkedin", "instagram", "tiktok", "youtube"].map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePlatform(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                      selectedPlatforms.includes(p)
                        ? "bg-cm-purple/15 border-cm-purple/50 text-cm-purple"
                        : "bg-dark-panel2 border-dark-border text-dark-muted hover:text-dark-text"
                    }`}
                  >
                    {PLATFORM_ICONS[p]}
                    {PLATFORM_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generate button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerate}
              disabled={generating || !topic.trim() || selectedPlatforms.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Content
                </>
              )}
            </button>
            {genError && (
              <span className="text-dark-danger text-sm">{genError}</span>
            )}
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-3">
        <h2 className="text-dark-text font-semibold">
          Content Queue ({posts.length})
        </h2>

        {loading && posts.length === 0 && (
          <p className="text-dark-muted text-sm">Loading...</p>
        )}

        {posts.map((post) => (
          <div
            key={post.id}
            className="bg-dark-panel border border-dark-border rounded-xl overflow-hidden"
          >
            {/* Post header */}
            <div
              className="p-4 cursor-pointer hover:bg-dark-panel2/30 transition-colors"
              onClick={() =>
                setExpandedPost(expandedPost === post.id ? null : post.id)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-dark-text font-medium text-sm truncate">
                    {post.topic}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {Object.keys(post.platforms).map((p) => (
                      <span
                        key={p}
                        className={`flex items-center gap-1 text-xs ${
                          post.postedTo.includes(p)
                            ? "text-dark-success"
                            : "text-dark-muted"
                        }`}
                      >
                        {PLATFORM_ICONS[p]}
                        {post.postedTo.includes(p) ? "Posted" : "Ready"}
                      </span>
                    ))}
                    <span className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                      {post.tone}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span
                    className={`text-xs ${
                      post.status === "posted"
                        ? "text-dark-success"
                        : post.status === "draft"
                        ? "text-dark-muted"
                        : "text-dark-warn"
                    }`}
                  >
                    {post.status}
                  </span>
                  <span className="text-xs text-dark-muted">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Expanded: platform content */}
            {expandedPost === post.id && (
              <div className="border-t border-dark-border p-4 space-y-4">
                {Object.entries(post.platforms).map(([platform, content]) => (
                  <div
                    key={platform}
                    className="bg-dark-panel2 border border-dark-border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-dark-text">
                        {PLATFORM_ICONS[platform]}
                        {PLATFORM_LABELS[platform]}
                        {content.charCount && (
                          <span className="text-xs text-dark-muted">
                            ({content.charCount} chars)
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        {!post.postedTo.includes(platform) && (
                          <button
                            onClick={() => handleMarkPosted(post.id, platform)}
                            className="flex items-center gap-1 px-2 py-1 text-xs text-dark-success hover:bg-dark-success/10 rounded transition-colors"
                          >
                            <Send size={12} />
                            Mark Posted
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleCopy(
                              content.copy ||
                                content.description ||
                                content.title ||
                                "",
                              `${post.id}-${platform}`
                            )
                          }
                          className="flex items-center gap-1 px-2 py-1 text-xs text-dark-muted hover:text-dark-text rounded transition-colors"
                        >
                          {copied === `${post.id}-${platform}` ? (
                            <>
                              <Check size={12} className="text-dark-success" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Content display */}
                    {platform === "youtube" ? (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-dark-text">
                          {(content as PlatformContent).title}
                        </p>
                        <p className="text-sm text-dark-muted whitespace-pre-wrap">
                          {(content as PlatformContent).description}
                        </p>
                        {(content as PlatformContent).tags && (
                          <div className="flex flex-wrap gap-1">
                            {(content as PlatformContent).tags!.map(
                              (tag: string) => (
                                <span
                                  key={tag}
                                  className="bg-dark-panel border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs"
                                >
                                  {tag}
                                </span>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm text-dark-text whitespace-pre-wrap">
                          {content.copy}
                        </p>
                        {content.hashtags && content.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {content.hashtags.map((tag: string) => (
                              <span
                                key={tag}
                                className="text-cm-purple/70 text-xs"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Delete button */}
                <div className="flex justify-end">
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-dark-danger hover:bg-dark-danger/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                    Delete Post
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
