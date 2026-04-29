"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  Play,
  Pause,
  ExternalLink,
  PenSquare,
  Users,
  FileText,
  DollarSign,
  Clock,
  TrendingUp,
  CheckCircle,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface PostPilotClient {
  id: string;
  name: string;
  tier?: "Starter" | "Growth" | "Agency";
  status?: "active" | "paused" | "inactive";
  platform?: string;
  monthlyFee?: number;
  postsPerWeek?: number;
  postsToday?: number;
  lastPost?: string | null;
  nextRun?: string | null;
  createdAt?: string;
  contentScoreAvg?: number;
}

interface PostPilotPost {
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

interface ContentQuality {
  overallAvgScore: number;
  thisWeekAvgScore: number;
  lastWeekAvgScore: number;
  postsAbove70ThisWeek: number;
  scoreImproving: boolean;
}

interface WeeklyChartDay {
  day: string;
  count: number;
}

interface PostPilotDashboard {
  status: "idle" | "running" | "error";
  activeClients: number;
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
  totalPosts: number;
  mrr: number;
  clients: PostPilotClient[];
  recentPosts: PostPilotPost[];
  nextScheduledRuns: { clientId: string; clientName: string; nextRun: string }[];
  lastRun: string | null;
  nextRunIn: number;
  weeklyPostsChart: WeeklyChartDay[];
  contentQuality: ContentQuality;
  revenueBreakdown: { starter: number; growth: number; agency: number };
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(dateStr?: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtUSD(n: number): string {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtNextRun(minutesUntil: number): string {
  if (minutesUntil <= 0) return "5:00 AM UTC (soon)";
  const h = Math.floor(minutesUntil / 60);
  const m = minutesUntil % 60;
  if (h === 0) return `5:00 AM UTC in ${m}m`;
  if (m === 0) return `5:00 AM UTC in ${h}h`;
  return `5:00 AM UTC in ${h}h ${m}m`;
}

// ── Sub-components ───────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
}) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-dark-muted">{label}</p>
          <p className="text-2xl font-bold text-dark-text mt-1">{value}</p>
          {sub && <p className="text-xs text-dark-muted mt-0.5">{sub}</p>}
        </div>
        <div className="p-2 bg-cm-purple/10 rounded-lg">
          <Icon size={20} className="text-cm-purple" />
        </div>
      </div>
    </div>
  );
}

const TIER_COLORS: Record<string, string> = {
  Starter: "bg-dark-panel2 text-dark-text",
  Growth: "bg-cm-purple/20 text-cm-purple",
  Agency: "bg-cm-purple/20 text-cm-purple",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-dark-success/20 text-dark-success",
  paused: "bg-dark-warn/20 text-dark-warn",
  inactive: "bg-dark-panel2 text-dark-muted",
};

const POST_STATUS_COLORS: Record<string, string> = {
  published: "bg-dark-success/20 text-dark-success",
  draft: "bg-dark-panel2 text-dark-muted",
  failed: "bg-dark-danger/20 text-dark-danger",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {label}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  if (score === 0) return <span className="text-dark-muted text-xs">{"\u2014"}</span>;
  const colorClass =
    score >= 70
      ? "bg-dark-success/20 text-dark-success"
      : score >= 50
      ? "bg-dark-warn/20 text-dark-warn"
      : "bg-dark-danger/20 text-dark-danger";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold tabular-nums ${colorClass}`}>
      {score}
    </span>
  );
}

function ContentQualitySection({ quality }: { quality: ContentQuality }) {
  const { overallAvgScore, thisWeekAvgScore, postsAbove70ThisWeek, scoreImproving } = quality;

  const avgColorClass =
    overallAvgScore >= 70
      ? "text-dark-success"
      : overallAvgScore >= 50
      ? "text-dark-warn"
      : overallAvgScore > 0
      ? "text-dark-danger"
      : "text-dark-muted";

  const weekColorClass =
    thisWeekAvgScore >= 70
      ? "text-dark-success"
      : thisWeekAvgScore >= 50
      ? "text-dark-warn"
      : thisWeekAvgScore > 0
      ? "text-dark-danger"
      : "text-dark-muted";

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base  font-semibold tracking-tight text-dark-text">Content Quality</h2>
        {scoreImproving && (
          <span className="flex items-center gap-1 text-xs text-dark-success font-medium bg-dark-success/10 px-2 py-0.5 rounded-full">
            <TrendingUp size={12} />
            Improving this week
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-dark-border">
        <div className="pr-6">
          <p className="text-xs text-dark-muted mb-1">Avg Content Score</p>
          <p className={`text-2xl font-bold tabular-nums ${avgColorClass}`}>
            {overallAvgScore > 0 ? overallAvgScore : "\u2014"}
          </p>
          <p className="text-xs text-dark-muted mt-0.5">all time</p>
        </div>
        <div className="px-6">
          <p className="text-xs text-dark-muted mb-1">This Week Avg</p>
          <p className={`text-2xl font-bold tabular-nums ${weekColorClass}`}>
            {thisWeekAvgScore > 0 ? thisWeekAvgScore : "\u2014"}
          </p>
          <p className="text-xs text-dark-muted mt-0.5">avg score</p>
        </div>
        <div className="pl-6">
          <p className="text-xs text-dark-muted mb-1">High Quality Posts</p>
          <p className="text-2xl font-bold text-dark-text tabular-nums">{postsAbove70ThisWeek}</p>
          <p className="text-xs text-dark-muted mt-0.5">score &gt; 70 this week</p>
        </div>
      </div>
    </div>
  );
}

function WeeklyChart({ chart }: { chart: WeeklyChartDay[] }) {
  const maxCount = Math.max(...chart.map((d) => d.count), 1);
  const total = chart.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base  font-semibold tracking-tight text-dark-text">Posts This Week</h2>
        <span className="text-sm text-dark-muted">{total} total</span>
      </div>
      <div className="flex items-end gap-2 h-20">
        {chart.map(({ day, count }) => {
          const heightPct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs text-dark-muted tabular-nums">{count > 0 ? count : ""}</span>
              <div className="w-full flex items-end" style={{ height: "52px" }}>
                <div
                  className={`w-full rounded-t transition-all ${count > 0 ? "bg-cm-purple" : "bg-dark-panel2"}`}
                  style={{ height: count > 0 ? `${Math.max(heightPct, 8)}%` : "4px" }}
                />
              </div>
              <span className="text-xs text-dark-muted">{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ClientsTable({
  clients,
  onToggle,
}: {
  clients: PostPilotClient[];
  onToggle: (id: string, status: string) => void;
}) {
  if (clients.length === 0) {
    return (
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <div className="p-5 border-b border-dark-border">
          <h2 className="text-base  font-semibold tracking-tight text-dark-text">Clients</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
          <Users size={40} className="text-dark-muted mb-3" />
          <p className="text-dark-muted font-medium mb-1">No clients yet</p>
          <p className="text-sm text-dark-muted">Add your first client to start publishing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
      <div className="p-5 border-b border-dark-border">
        <h2 className="text-base  font-semibold tracking-tight text-dark-text">Clients</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-dark-panel2">
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Name</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Tier</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Status</th>
              <th className="text-right px-5 py-3 text-dark-muted font-medium">Posts Today</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Last Post</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const status = client.status ?? "active";
              const score = client.contentScoreAvg ?? 0;
              return (
                <tr key={client.id} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-dark-text">{client.name}</span>
                      {score > 0 && (
                        <span title={`Avg SEO score: ${score}`}>
                          <ScoreBadge score={score} />
                        </span>
                      )}
                    </div>
                    {client.platform && (
                      <span className="text-xs text-dark-muted">{client.platform}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {client.tier ? (
                      <Badge label={client.tier} colorClass={TIER_COLORS[client.tier] ?? "bg-dark-panel2 text-dark-muted"} />
                    ) : (
                      <span className="text-dark-muted">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <Badge
                      label={status.charAt(0).toUpperCase() + status.slice(1)}
                      colorClass={STATUS_COLORS[status] ?? "bg-dark-panel2 text-dark-muted"}
                    />
                  </td>
                  <td className="px-5 py-3 text-right text-dark-text">{client.postsToday ?? 0}</td>
                  <td className="px-5 py-3 text-dark-muted">{fmtDate(client.lastPost)}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => onToggle(client.id, status)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        status === "paused"
                          ? "bg-dark-success/10 text-dark-success hover:bg-dark-success/20"
                          : "bg-dark-warn/10 text-dark-warn hover:bg-dark-warn/20"
                      }`}
                      title={status === "paused" ? "Resume" : "Pause"}
                    >
                      {status === "paused" ? (
                        <><Play size={11} /> Resume</>
                      ) : (
                        <><Pause size={11} /> Pause</>
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecentPostsTable({ posts }: { posts: PostPilotPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="bg-dark-panel rounded-xl border border-dark-border">
        <div className="p-5 border-b border-dark-border">
          <h2 className="text-base  font-semibold tracking-tight text-dark-text">Recent Posts</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <FileText size={36} className="text-dark-muted mb-3" />
          <p className="text-sm text-dark-muted">No posts published yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
      <div className="p-5 border-b border-dark-border">
        <h2 className="text-base  font-semibold tracking-tight text-dark-text">Recent Posts</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border bg-dark-panel2">
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Date</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Client</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Title</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Status</th>
              <th className="text-left px-5 py-3 text-dark-muted font-medium">Link</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((post) => {
              const status = post.status ?? "published";
              return (
                <tr key={post.id} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                  <td className="px-5 py-3 text-dark-muted whitespace-nowrap">{fmtDate(post.publishedAt)}</td>
                  <td className="px-5 py-3 text-dark-text">{post.clientName ?? "\u2014"}</td>
                  <td className="px-5 py-3 text-dark-text max-w-xs truncate" title={post.title}>{post.title ?? "\u2014"}</td>
                  <td className="px-5 py-3">
                    <Badge
                      label={status.charAt(0).toUpperCase() + status.slice(1)}
                      colorClass={POST_STATUS_COLORS[status] ?? "bg-dark-panel2 text-dark-muted"}
                    />
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
  );
}

// ── Run Now button with loading + toast ──────────────────────────────

function RunNowButton({ onRun }: { onRun: () => Promise<void> }) {
  const [running, setRunning] = useState(false);
  const [toast, setToast] = useState(false);

  const handleClick = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      await onRun();
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } finally {
      setRunning(false);
    }
  }, [running, onRun]);

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {running ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Play size={14} />
        )}
        {running ? "Running..." : "Run Now"}
      </button>
      {toast && (
        <div className="absolute right-0 top-full mt-1.5 flex items-center gap-1.5 bg-dark-success text-white text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm whitespace-nowrap z-10">
          <CheckCircle size={12} />
          Run triggered
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function PostPilotPage() {
  const [data, setData] = useState<PostPilotDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/postpilot");
      if (!res.ok) throw new Error("Failed to load PostPilot data");
      setData(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const runNow = useCallback(async (): Promise<void> => {
    await fetch("/api/postpilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run-now" }),
    });
    await fetchData();
  }, [fetchData]);

  const toggleClient = useCallback(
    async (clientId: string, currentStatus: string) => {
      const action = currentStatus === "paused" ? "resume-client" : "pause-client";
      await fetch("/api/postpilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, clientId }),
      });
      await fetchData();
    },
    [fetchData]
  );

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading PostPilot data...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg  font-semibold tracking-tight text-dark-text mb-2">Failed to load data</h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const agentStatusColor =
    data.status === "running"
      ? "bg-dark-success/20 text-dark-success"
      : data.status === "error"
      ? "bg-dark-danger/20 text-dark-danger"
      : "bg-dark-panel2 text-dark-muted";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cm-purple rounded-xl">
            <PenSquare size={22} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight text-dark-text">PostPilot</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${agentStatusColor}`}>
                {data.status.charAt(0).toUpperCase() + data.status.slice(1)}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-dark-muted">
              <span>Blog Service{data.lastRun ? ` \u00b7 Last run ${fmtDate(data.lastRun)}` : ""}</span>
              {data.nextRunIn != null && (
                <span className="flex items-center gap-1 text-dark-muted">
                  <Clock size={12} />
                  Next: {fmtNextRun(data.nextRunIn)}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-1.5 text-dark-muted hover:text-dark-text transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <RunNowButton onRun={runNow} />
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Clients"
          value={data.activeClients}
          icon={Users}
          sub={data.clients.length !== data.activeClients ? `${data.clients.length} total` : undefined}
        />
        <StatCard
          label="Posts Today"
          value={data.postsToday}
          icon={FileText}
          sub={`${data.postsThisWeek} this week`}
        />
        <StatCard
          label="Monthly Revenue"
          value={fmtUSD(data.mrr)}
          icon={DollarSign}
        />
        <StatCard
          label="Total Posts"
          value={data.totalPosts}
          icon={PenSquare}
          sub={data.postsThisMonth > 0 ? `${data.postsThisMonth} this month` : undefined}
        />
      </div>

      {/* Content Quality + Weekly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <ContentQualitySection quality={data.contentQuality} />
        </div>
        <div>
          <WeeklyChart chart={data.weeklyPostsChart} />
        </div>
      </div>

      {/* Clients Table */}
      <ClientsTable clients={data.clients} onToggle={toggleClient} />

      {/* Recent Posts Table */}
      <RecentPostsTable posts={data.recentPosts} />
    </div>
  );
}
