"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2, AlertCircle, RefreshCw, DollarSign, Zap, FileText,
  ExternalLink, Copy, Check, TrendingUp, Target, Sparkles,
} from "lucide-react";

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  count: number;
}

interface Service {
  id: string;
  name: string;
  enabled: boolean;
  pricing: Record<string, number>;
}

interface BlogTier {
  name: string;
  posts_per_week?: number;
  posts_per_day?: number;
  includes: string[];
  stripe_link: string;
}

interface BlogService {
  pricing: Record<string, number>;
  tiers: Record<string, BlogTier>;
}

interface CashClawData {
  earnings: EarningsSummary;
  services: Service[];
  missions: any[];
  blogService: BlogService | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="p-1 text-dark-muted hover:text-dark-text transition-colors"
      title="Copy link"
    >
      {copied ? <Check size={14} className="text-dark-success" /> : <Copy size={14} />}
    </button>
  );
}

export default function CashClawPage() {
  const [data, setData] = useState<CashClawData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cashclaw");
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading CashClaw...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <p className="text-dark-muted mb-4">{error}</p>
        <button onClick={refresh} className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  const { earnings, services, missions, blogService } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <DollarSign className="text-cm-purple" size={28} /> CashClaw
          </h1>
          <p className="text-sm text-dark-muted">Autonomous revenue engine</p>
        </div>
        <button onClick={refresh} disabled={loading} className="p-1.5 text-dark-muted hover:text-dark-text" title="Refresh">
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Earnings Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today", value: earnings.today, icon: Zap },
          { label: "This Week", value: earnings.week, icon: TrendingUp },
          { label: "This Month", value: earnings.month, icon: Target },
          { label: "All Time", value: earnings.total, icon: Sparkles },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} className="text-cm-purple" />
              <span className="text-xs text-dark-muted uppercase tracking-wide">{label}</span>
            </div>
            <p className="text-2xl font-bold text-dark-text">${(value / 100).toFixed(2)}</p>
          </div>
        ))}
      </div>

      {/* Blog-as-a-Service Section */}
      {blogService && (
        <div className="bg-gradient-to-br from-cm-purple/10 to-dark-panel rounded-xl border border-dark-border p-6">
          <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-1 flex items-center gap-2">
            <FileText size={20} className="text-cm-purple" />
            Blog-as-a-Service
          </h2>
          <p className="text-sm text-dark-muted mb-4">Autonomous blog content -- AI writes, images, publishes, tracks SEO</p>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(blogService.tiers).map(([key, tier]) => (
              <div key={key} className={`bg-dark-panel rounded-lg border p-4 ${key === "growth" ? "border-cm-purple ring-2 ring-cm-purple/20" : "border-dark-border"}`}>
                {key === "growth" && (
                  <span className="text-xs bg-cm-purple text-white px-2 py-0.5 rounded-full mb-2 inline-block">Primary Offer</span>
                )}
                <h3 className="font-semibold tracking-tight text-dark-text">{tier.name}</h3>
                <p className="text-3xl font-bold text-cm-purple my-2">
                  ${blogService.pricing[key]}<span className="text-sm text-dark-muted font-normal">/mo</span>
                </p>
                <p className="text-sm text-dark-muted mb-3">
                  {tier.posts_per_day ? `${tier.posts_per_day} posts/day (${tier.posts_per_day * 30}/mo)` : `${tier.posts_per_week} posts/week`}
                </p>
                <ul className="text-xs text-dark-muted space-y-1 mb-4">
                  {tier.includes.map((item, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Check size={12} className="text-dark-success mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-1">
                  <a
                    href={tier.stripe_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center text-sm px-3 py-1.5 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors flex items-center justify-center gap-1"
                  >
                    Payment Link <ExternalLink size={12} />
                  </a>
                  <CopyButton text={tier.stripe_link} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Services */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-3">All Services</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc) => (
            <div key={svc.id} className="bg-dark-panel rounded-lg border border-dark-border p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-dark-text text-sm">{svc.id.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${svc.enabled ? "bg-dark-success/20 text-dark-success" : "bg-dark-panel2 text-dark-muted"}`}>
                  {svc.enabled ? "Active" : "Disabled"}
                </span>
              </div>
              <p className="text-xs text-dark-muted mb-2">{svc.name}</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(svc.pricing).map(([tier, price]) => (
                  <span key={tier} className="text-xs bg-dark-panel2 text-dark-text px-2 py-0.5 rounded">
                    {tier}: ${typeof price === "number" ? price : price}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Templates */}
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-3">Mission Templates</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-3 text-dark-muted font-medium">Template</th>
                <th className="text-left py-2 px-3 text-dark-muted font-medium">Type</th>
                <th className="text-left py-2 px-3 text-dark-muted font-medium">Tier</th>
                <th className="text-right py-2 px-3 text-dark-muted font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m, i) => (
                <tr key={i} className="border-b border-dark-border/40 hover:bg-dark-panel2">
                  <td className="py-2 px-3 font-medium text-dark-text">{m.name}</td>
                  <td className="py-2 px-3 text-dark-muted">{m.service_type}</td>
                  <td className="py-2 px-3">
                    <span className="text-xs bg-cm-purple/20 text-cm-purple px-2 py-0.5 rounded">{m.tier}</span>
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-cm-purple">
                    ${m.default_price_usd}{m.recurring ? "/mo" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
