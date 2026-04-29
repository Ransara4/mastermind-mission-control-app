"use client";

import { useState, useEffect } from "react";
import {
  MousePointerClick,
  Eye,
  Percent,
  Hash,
  FileText,
  Loader2,
  Terminal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DailyMetric {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface PageRow {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface HealthItem {
  check: string;
  status: "pass" | "fail" | "warn";
  detail?: string;
}

interface GscData {
  domain: string;
  hasData: boolean;
  dailyMetrics: DailyMetric[];
  topQueries: QueryRow[];
  topPages: PageRow[];
  healthCheck: HealthItem[] | Record<string, any> | null;
  lastFetched: { timestamp: string } | null;
}

function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toLocaleString();
}

function shortenUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/" : u.pathname;
  } catch {
    return url;
  }
}

function formatDate(d: string): string {
  const date = new Date(d);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function HealthBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm py-1.5 px-3 rounded-lg bg-dark-panel2">
      {ok ? (
        <CheckCircle2 size={14} className="text-dark-success shrink-0" />
      ) : (
        <XCircle size={14} className="text-dark-danger shrink-0" />
      )}
      <span className={ok ? "text-dark-muted" : "text-dark-danger"}>{label}</span>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-dark-text mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.dataKey === "ctr" ? (p.value * 100).toFixed(1) + "%" : p.dataKey === "position" ? p.value.toFixed(1) : formatNum(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

type TimeRange = "7d" | "30d" | "all";

const TIME_RANGES: { key: TimeRange; label: string }[] = [
  { key: "7d",  label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "all", label: "All time" },
];

export default function GscDashboard({ domain }: { domain: string }) {
  const [data, setData] = useState<GscData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  useEffect(() => {
    if (!domain) return;
    setLoading(true);
    setError(null);
    fetch(`/api/seo/gsc?domain=${encodeURIComponent(domain)}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, [domain]);

  if (loading) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6 flex items-center justify-center gap-2 text-dark-muted">
        <Loader2 className="animate-spin" size={18} />
        <span className="text-sm">Loading Google Search Console data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-dark-danger/10 border border-dark-danger/30 rounded-xl p-6 text-center text-sm text-dark-danger">
        Failed to load GSC data: {error}
      </div>
    );
  }

  if (!data || !data.hasData) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">
          Google Search Console
        </h3>
        <p className="text-sm text-dark-muted mb-4">
          No GSC data found for <span className="font-medium">{domain}</span>.
          Run the SEO monitor auth flow to connect your Search Console account.
        </p>
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 font-mono text-xs text-dark-text flex items-start gap-2">
          <Terminal size={14} className="mt-0.5 shrink-0 text-dark-muted" />
          <span>cd ~/.openclaw/workspace/agents/seo-monitor && npm run auth</span>
        </div>
      </div>
    );
  }

  const allMetrics = data.dailyMetrics;

  // Filter by selected time range
  const metrics = timeRange === "all" ? allMetrics
    : timeRange === "7d"  ? allMetrics.slice(-7)
    : allMetrics.slice(-30);

  const totalClicks = metrics.reduce((s, m) => s + m.clicks, 0);
  const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);
  const avgCtr = metrics.length > 0 ? metrics.reduce((s, m) => s + m.ctr, 0) / metrics.length : 0;
  const avgPosition = metrics.length > 0 ? metrics.reduce((s, m) => s + m.position, 0) / metrics.length : 0;
  const indexedPages = data.topPages.length;

  const statCards = [
    { label: "Total Clicks",      value: formatNum(totalClicks),          icon: MousePointerClick, color: "text-cm-purple",    bg: "bg-cm-purple/10" },
    { label: "Total Impressions", value: formatNum(totalImpressions),     icon: Eye,               color: "text-purple-400",   bg: "bg-purple-500/10" },
    { label: "Avg CTR",           value: (avgCtr * 100).toFixed(1) + "%", icon: Percent,           color: "text-dark-success", bg: "bg-dark-success/10" },
    { label: "Avg Position",      value: avgPosition.toFixed(1),          icon: Hash,              color: "text-dark-warn",    bg: "bg-dark-warn/10" },
    { label: "Indexed Pages",     value: indexedPages.toString(),         icon: FileText,          color: "text-cm-purple",    bg: "bg-cm-purple/10" },
  ];

  const chartData = metrics.map((m) => ({
    date: formatDate(m.date),
    clicks: m.clicks,
    impressions: m.impressions,
    ctr: m.ctr,
    position: m.position,
  }));

  return (
    <div className="space-y-5">
      {/* Section header + time range */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-dark-text">Google Search Console</h2>
          {data.lastFetched && (
            <p className="text-xs text-dark-muted mt-0.5">
              Last updated: {new Date(data.lastFetched.timestamp).toLocaleDateString()}
            </p>
          )}
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as TimeRange)}
          className="bg-dark-panel2 border border-dark-border text-dark-text text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-cm-purple cursor-pointer"
        >
          {TIME_RANGES.map((r) => (
            <option key={r.key} value={r.key}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <div key={card.label} className="bg-dark-panel border border-dark-border rounded-xl p-4 flex items-center gap-3">
            <div className={`${card.bg} p-2 rounded-lg shrink-0`}>
              <card.icon size={16} className={card.color} />
            </div>
            <div>
              <p className="text-xs text-dark-muted">{card.label}</p>
              <p className="text-lg font-bold text-dark-text">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Daily performance line chart */}
      {chartData.length > 0 && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4">
            Daily Performance — Last {chartData.length} days
          </h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                interval={Math.floor(chartData.length / 6)}
              />
              <YAxis
                tick={{ fill: "#6b7280", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="clicks" stroke="#a855f7" strokeWidth={2} dot={false} name="Clicks" />
              <Line type="monotone" dataKey="impressions" stroke="#7c3aed" strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="Impressions" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-5 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-cm-purple rounded" />
              <span className="text-[11px] text-dark-muted">Clicks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-purple-700 rounded" style={{ borderTop: "2px dashed #7c3aed" }} />
              <span className="text-[11px] text-dark-muted">Impressions</span>
            </div>
          </div>
        </div>
      )}

      {/* Top Queries + Top Pages (Indexed) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {data.topQueries.length > 0 && (
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Top Queries</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-2 pr-2 text-xs font-medium text-dark-muted">#</th>
                    <th className="text-left py-2 pr-2 text-xs font-medium text-dark-muted">Query</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">Clicks</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">Imp</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">CTR</th>
                    <th className="text-right py-2 text-xs font-medium text-dark-muted">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topQueries.slice(0, 15).map((q, i) => (
                    <tr key={i} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                      <td className="py-1.5 pr-2 text-dark-muted text-xs">{i + 1}</td>
                      <td className="py-1.5 pr-2 text-dark-text font-medium truncate max-w-[200px]">{q.query}</td>
                      <td className="py-1.5 pr-2 text-right text-dark-text font-semibold">{q.clicks}</td>
                      <td className="py-1.5 pr-2 text-right text-dark-muted">{formatNum(q.impressions)}</td>
                      <td className="py-1.5 pr-2 text-right text-dark-muted">{(q.ctr * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-right text-dark-muted">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {data.topPages.length > 0 && (
          <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
            <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-1">
              Indexed Pages
            </h3>
            <p className="text-xs text-dark-muted mb-3">{data.topPages.length} pages indexed on Google</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="text-left py-2 pr-2 text-xs font-medium text-dark-muted">Page</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">Clicks</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">Imp</th>
                    <th className="text-right py-2 pr-2 text-xs font-medium text-dark-muted">CTR</th>
                    <th className="text-right py-2 text-xs font-medium text-dark-muted">Pos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topPages.slice(0, 15).map((p, i) => (
                    <tr key={i} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                      <td className="py-1.5 pr-2 text-dark-text font-medium truncate max-w-[220px]" title={p.page}>
                        {shortenUrl(p.page)}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-dark-text font-semibold">{p.clicks}</td>
                      <td className="py-1.5 pr-2 text-right text-dark-muted">{formatNum(p.impressions)}</td>
                      <td className="py-1.5 pr-2 text-right text-dark-muted">{(p.ctr * 100).toFixed(1)}%</td>
                      <td className="py-1.5 text-right text-dark-muted">{p.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Health check */}
      {data.healthCheck && (
        <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
          <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-3">Site Health Check</h3>
          {Array.isArray(data.healthCheck) ? (
            <div className="space-y-2">
              {data.healthCheck.map((h: any, i: number) => (
                <div key={i} className="flex items-center gap-3 py-1.5 px-3 rounded-lg bg-dark-panel2">
                  {h.status === "pass" && <CheckCircle2 size={16} className="text-dark-success shrink-0" />}
                  {h.status === "fail" && <XCircle size={16} className="text-dark-danger shrink-0" />}
                  {h.status === "warn" && <AlertTriangle size={16} className="text-dark-warn shrink-0" />}
                  <span className="text-sm text-dark-text font-medium">{h.check}</span>
                  {h.detail && <span className="text-xs text-dark-muted ml-auto">{h.detail}</span>}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.healthCheck.title && (
                <HealthBadge ok={data.healthCheck.title.present && data.healthCheck.title.optimal} label={`Title tag (${data.healthCheck.title.length || 0} chars)`} />
              )}
              {data.healthCheck.metaDescription && (
                <HealthBadge ok={data.healthCheck.metaDescription.present && data.healthCheck.metaDescription.optimal} label={`Meta desc (${data.healthCheck.metaDescription.length || 0} chars)`} />
              )}
              {data.healthCheck.h1 && (
                <HealthBadge ok={data.healthCheck.h1.optimal} label={`H1 tags (${data.healthCheck.h1.count})`} />
              )}
              {data.healthCheck.openGraph && (
                <HealthBadge ok={data.healthCheck.openGraph.complete} label="OG tags" />
              )}
              {data.healthCheck.robotsTxt && (
                <HealthBadge ok={data.healthCheck.robotsTxt.accessible} label="robots.txt" />
              )}
              {data.healthCheck.sitemapXml && (
                <HealthBadge ok={data.healthCheck.sitemapXml.accessible} label="sitemap.xml" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
