"use client";

import { useState } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Youtube,
  Eye,
  Film,
  TrendingUp,
  Plus,
  Trash2,
  ExternalLink,
  Users,
} from "lucide-react";
import {
  useYoutubeData,
  type YouTubeVideo,
  type YouTubeChannel,
} from "@/hooks/useYoutubeData";
import ApiKeyBanner from "@/components/ApiKeyBanner";

// ── Helpers ─────────────────────────────────────────────────────────

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months === 1) return "1 month ago";
  return `${months} months ago`;
}

function getVideoId(v: YouTubeVideo): string {
  return v.videoId || v.video_id || "";
}

function getThumbnail(v: YouTubeVideo): string {
  if (v.thumbnail) {
    if (typeof v.thumbnail === "string") return v.thumbnail;
    if (typeof v.thumbnail === "object" && (v.thumbnail as any).url) return (v.thumbnail as any).url;
  }
  const id = getVideoId(v);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : "";
}

// ── Stat Card ───────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    red: "bg-dark-danger/10 text-dark-danger",
    blue: "bg-cm-purple/10 text-cm-purple",
    green: "bg-dark-success/10 text-dark-success",
    purple: "bg-purple-500/10 text-purple-300",
  };
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorMap[color] || colorMap.blue}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-dark-muted">{label}</p>
        <p className="text-2xl font-bold text-dark-text">{value}</p>
      </div>
    </div>
  );
}

// ── Add Channel Form ────────────────────────────────────────────────

function AddChannelForm({
  onAdd,
}: {
  onAdd: (handle: string, label?: string) => Promise<void>;
}) {
  const [handle, setHandle] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!handle.trim()) return;
    setAdding(true);
    setErr("");
    try {
      await onAdd(handle.trim(), label.trim() || undefined);
      setHandle("");
      setLabel("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <h3 className="text-sm font-semibold text-dark-text mb-3 flex items-center gap-2">
        <Plus size={16} /> Track a Channel
      </h3>
      <div className="flex gap-2 items-end flex-wrap">
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs text-dark-muted mb-1 block">
            Handle (e.g. @MrBeast)
          </label>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-cm-purple focus:border-cm-purple outline-none"
            placeholder="@ChannelHandle"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="text-xs text-dark-muted mb-1 block">
            Label (optional)
          </label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm focus:ring-2 focus:ring-cm-purple focus:border-cm-purple outline-none"
            placeholder="My Channel"
          />
        </div>
        <button
          onClick={submit}
          disabled={adding || !handle.trim()}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </div>
      {err && <p className="text-xs text-dark-danger mt-2">{err}</p>}
    </div>
  );
}

// ── Channel Card ────────────────────────────────────────────────────

function ChannelCard({
  channel,
  onRemove,
}: {
  channel: YouTubeChannel;
  onRemove: (handle: string) => void;
}) {
  const videos = channel.videos || channel.results || [];
  const totalViews = videos.reduce((sum, v) => {
    return sum + parseInt(v.viewCount || v.view_count || String(v.views || 0), 10);
  }, 0);

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Youtube size={18} className="text-dark-danger" />
          <h3 className="font-semibold  text-dark-text">{channel.label}</h3>
          <span className="text-xs text-dark-muted">{channel.handle}</span>
        </div>
        <button
          onClick={() => onRemove(channel.handle)}
          className="p-1.5 rounded-lg hover:bg-dark-danger/10 text-dark-muted hover:text-dark-danger transition-colors"
          title="Remove channel"
        >
          <Trash2 size={14} />
        </button>
      </div>
      {channel.error ? (
        <p className="text-sm text-dark-danger">{channel.error}</p>
      ) : (
        <div className="flex items-center gap-4 text-sm text-dark-muted">
          <span className="flex items-center gap-1">
            <Film size={14} /> {videos.length} videos
          </span>
          <span className="flex items-center gap-1">
            <Eye size={14} /> {formatNumber(totalViews)} views
          </span>
          {videos.length > 0 && (
            <span className="flex items-center gap-1">
              <TrendingUp size={14} />
              {formatNumber(Math.round(totalViews / videos.length))} avg
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Video Row ───────────────────────────────────────────────────────

function VideoRow({ video }: { video: YouTubeVideo }) {
  const id = getVideoId(video);
  const thumb = getThumbnail(video);
  const published = video.published || video.publishedAt || "";

  return (
    <div className="flex items-center gap-4 py-3 border-b border-dark-border last:border-0">
      {thumb && (
        <img
          src={thumb}
          alt=""
          className="w-28 h-16 object-cover rounded-lg flex-shrink-0 bg-dark-panel2"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-dark-text truncate">
          {video.title || "Untitled"}
        </p>
        <div className="flex items-center gap-3 mt-1 text-xs text-dark-muted">
          <span className="flex items-center gap-1">
            <Eye size={12} /> {formatNumber(video.views)}
          </span>
          {published && <span>{timeAgo(published)}</span>}
          <span className="text-dark-muted">{video.channelLabel}</span>
        </div>
      </div>
      {id && (
        <a
          href={`https://youtube.com/watch?v=${id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-dark-panel2 text-dark-muted hover:text-dark-danger transition-colors flex-shrink-0"
        >
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function YouTubePage() {
  const { data, loading, error, refresh, addChannel, removeChannel } =
    useYoutubeData();
  const handleAdd = async (handle: string, label?: string) => {
    await addChannel(handle, label);
    await refresh();
  };

  const handleRemove = async (handle: string) => {
    await removeChannel(handle);
    await refresh();
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-dark-danger mb-4" size={32} />
        <p className="text-dark-muted">Loading YouTube analytics...</p>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">
          Failed to load YouTube data
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const channels = data.channels || [];
  const stats = data.stats;
  const recentVideos = data.recentVideos || [];
  const isEmpty = channels.length === 0;

  return (
    <div className="space-y-6">
      <ApiKeyBanner slug="youtube" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Youtube size={28} className="text-dark-danger" />
          <div>
            <h1 className="text-2xl font-extrabold  text-dark-text">
              YouTube Analytics
            </h1>
            <p className="text-sm text-dark-muted">
              Track channels and monitor video performance
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-dark-panel border border-dark-border rounded-lg hover:bg-dark-bg transition-colors text-sm text-dark-muted"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats (only if channels exist) */}
      {stats && !isEmpty && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Users}
            label="Tracked Channels"
            value={stats.trackedChannels}
            color="purple"
          />
          <StatCard
            icon={Film}
            label="Recent Videos"
            value={stats.totalRecentVideos}
            color="blue"
          />
          <StatCard
            icon={Eye}
            label="Total Views"
            value={formatNumber(stats.totalRecentViews)}
            color="green"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Views/Video"
            value={formatNumber(stats.avgViewsPerVideo)}
            color="red"
          />
        </div>
      )}

      {/* Add Channel Form */}
      <AddChannelForm onAdd={handleAdd} />

      {/* Empty State */}
      {isEmpty && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
          <Youtube size={48} className="text-dark-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold  text-dark-text mb-2">
            No channels tracked yet
          </h3>
          <p className="text-sm text-dark-muted max-w-md mx-auto">
            Add a YouTube channel handle above (e.g. @MrBeast, @TED) to start
            tracking video performance. The latest 15 videos per channel are
            fetched for free.
          </p>
        </div>
      )}

      {/* Channel Cards */}
      {channels.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold  text-dark-text mb-3">
            Tracked Channels
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {channels.map((ch: YouTubeChannel) => (
              <ChannelCard
                key={ch.handle}
                channel={ch}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <h2 className="text-lg font-semibold  text-dark-text mb-4">
            Recent Videos
          </h2>
          <div className="divide-y divide-dark-border">
            {recentVideos.map((v: YouTubeVideo, i: number) => (
              <VideoRow key={getVideoId(v) || i} video={v} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
