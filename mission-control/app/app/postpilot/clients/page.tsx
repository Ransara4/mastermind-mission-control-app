"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Play,
  Pause,
  Trash2,
  Users,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────

interface Client {
  id: string;
  name: string;
  website?: string;
  tier?: "Starter" | "Growth" | "Agency";
  status?: "active" | "paused" | "inactive";
  platform?: string;
  monthlyFee?: number;
  publishWindowStart?: string;
  publishWindowEnd?: string;
  timezone?: string;
  postsPerDay?: number;
  gscPropertyId?: string;
  lastPost?: string | null;
  createdAt?: string;
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

function csvToArray(val: string): string[] {
  return val.split(",").map((s) => s.trim()).filter(Boolean);
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

const FIELD_CLS = "w-full border border-dark-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cm-purple";
const LABEL_CLS = "block text-sm font-medium text-dark-text mb-1";

// ── Page ─────────────────────────────────────────────────────────────

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showStrategy, setShowStrategy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Basic Info
  const [formName, setFormName] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formTier, setFormTier] = useState<"Starter" | "Growth" | "Agency">("Starter");
  const [formPlatform, setFormPlatform] = useState("wordpress");
  const [formMonthlyFee, setFormMonthlyFee] = useState(0);
  const [formPublishStart, setFormPublishStart] = useState("06:00");
  const [formPublishEnd, setFormPublishEnd] = useState("09:00");
  const [formTimezone, setFormTimezone] = useState("America/New_York");
  const [formPostsPerDay, setFormPostsPerDay] = useState(1);
  const [formGscPropertyId, setFormGscPropertyId] = useState("");

  // Content Strategy
  const [formIcp, setFormIcp] = useState("");
  const [formGoals, setFormGoals] = useState("");
  const [formTargetAudience, setFormTargetAudience] = useState("");
  const [formTone, setFormTone] = useState("");
  const [formContentPillars, setFormContentPillars] = useState("");
  const [formContentRules, setFormContentRules] = useState("");
  const [formKeywordFocus, setFormKeywordFocus] = useState("");
  const [formCompetitorExclusions, setFormCompetitorExclusions] = useState("");
  const [formCtaPrimary, setFormCtaPrimary] = useState("");
  const [formCtaSecondary, setFormCtaSecondary] = useState("");
  const [formMinWordCount, setFormMinWordCount] = useState(800);
  const [formMaxWordCount, setFormMaxWordCount] = useState(1200);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/postpilot/clients");
      if (!res.ok) throw new Error("Failed to load clients");
      setClients(await res.json());
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const resetForm = () => {
    setFormName(""); setFormWebsite(""); setFormTier("Starter");
    setFormPlatform("wordpress"); setFormMonthlyFee(0);
    setFormPublishStart("06:00"); setFormPublishEnd("09:00");
    setFormTimezone("America/New_York"); setFormPostsPerDay(1);
    setFormGscPropertyId("");
    setFormIcp(""); setFormGoals(""); setFormTargetAudience("");
    setFormTone(""); setFormContentPillars(""); setFormContentRules("");
    setFormKeywordFocus(""); setFormCompetitorExclusions("");
    setFormCtaPrimary(""); setFormCtaSecondary("");
    setFormMinWordCount(800); setFormMaxWordCount(1200);
    setShowForm(false);
    setShowStrategy(false);
  };

  const handleAdd = async () => {
    if (!formName.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/api/postpilot/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          name: formName.trim(),
          website: formWebsite.trim() || undefined,
          tier: formTier,
          platform: formPlatform,
          monthlyFee: formMonthlyFee,
          publishWindowStart: formPublishStart,
          publishWindowEnd: formPublishEnd,
          timezone: formTimezone,
          postsPerDay: formPostsPerDay,
          gscPropertyId: formGscPropertyId.trim() || undefined,
          icp: formIcp.trim() || undefined,
          goals: formGoals.trim() || undefined,
          targetAudience: formTargetAudience.trim() || undefined,
          tone: formTone.trim() || undefined,
          contentPillars: csvToArray(formContentPillars),
          contentRules: formContentRules.trim()
            ? formContentRules.split("\n").map((s) => s.trim()).filter(Boolean)
            : [],
          keywordFocus: csvToArray(formKeywordFocus),
          competitorExclusions: csvToArray(formCompetitorExclusions),
          ctaPrimary: formCtaPrimary.trim() || undefined,
          ctaSecondary: formCtaSecondary.trim() || undefined,
          minWordCount: formMinWordCount,
          maxWordCount: formMaxWordCount,
        }),
      });
      resetForm();
      await fetchClients();
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (clientId: string, currentStatus: string) => {
    const action = currentStatus === "paused" ? "resume" : "pause";
    await fetch("/api/postpilot/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, clientId }),
    });
    await fetchClients();
  };

  const handleDelete = async (clientId: string) => {
    await fetch("/api/postpilot/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", clientId }),
    });
    await fetchClients();
  };

  if (loading && clients.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading clients...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">Clients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Add Client Form */}
      {showForm && (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm p-5 space-y-5">
          {/* Basic Info */}
          <div>
            <h2 className="text-base  font-semibold tracking-tight text-dark-text mb-4">Basic Info</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLS}>Name *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  placeholder="Client name" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Website URL</label>
                <input type="url" value={formWebsite} onChange={(e) => setFormWebsite(e.target.value)}
                  placeholder="https://example.com" className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Tier</label>
                <select value={formTier} onChange={(e) => setFormTier(e.target.value as "Starter" | "Growth" | "Agency")}
                  className={FIELD_CLS}>
                  <option value="Starter">Starter</option>
                  <option value="Growth">Growth</option>
                  <option value="Agency">Agency</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Platform</label>
                <select value={formPlatform} onChange={(e) => setFormPlatform(e.target.value)} className={FIELD_CLS}>
                  <option value="wordpress">WordPress</option>
                  <option value="ghost">Ghost</option>
                  <option value="wix">Wix</option>
                  <option value="squarespace">Squarespace</option>
                  <option value="webflow">Webflow</option>
                  <option value="shopify">Shopify Blog</option>
                  <option value="vercel">Vercel (MDX)</option>
                  <option value="markdown">Markdown (file output)</option>
                </select>
              </div>
              <div>
                <label className={LABEL_CLS}>Monthly Fee ($)</label>
                <input type="number" value={formMonthlyFee}
                  onChange={(e) => setFormMonthlyFee(parseInt(e.target.value) || 0)}
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Posts Per Day</label>
                <input type="number" min={1} max={10} value={formPostsPerDay}
                  onChange={(e) => setFormPostsPerDay(parseInt(e.target.value) || 1)}
                  className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Publish Window Start</label>
                <input type="time" value={formPublishStart}
                  onChange={(e) => setFormPublishStart(e.target.value)} className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Publish Window End</label>
                <input type="time" value={formPublishEnd}
                  onChange={(e) => setFormPublishEnd(e.target.value)} className={FIELD_CLS} />
              </div>
              <div>
                <label className={LABEL_CLS}>Timezone</label>
                <input type="text" value={formTimezone}
                  onChange={(e) => setFormTimezone(e.target.value)}
                  placeholder="America/New_York" className={FIELD_CLS} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className={LABEL_CLS}>Google Search Console Property</label>
                <input type="text" value={formGscPropertyId}
                  onChange={(e) => setFormGscPropertyId(e.target.value)}
                  placeholder="sc-domain:example.com" className={FIELD_CLS} />
              </div>
            </div>
          </div>

          {/* Content Strategy toggle */}
          <div className="border-t border-dark-border pt-4">
            <button
              type="button"
              onClick={() => setShowStrategy(!showStrategy)}
              className="flex items-center gap-2 text-sm font-semibold text-dark-text hover:text-dark-text transition-colors"
            >
              {showStrategy ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              Content Strategy {showStrategy ? "" : "(optional — expand to fill)"}
            </button>
          </div>

          {showStrategy && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>ICP (Ideal Customer Profile)</label>
                  <textarea rows={3} value={formIcp} onChange={(e) => setFormIcp(e.target.value)}
                    placeholder="Small business coaches and consultants with 5+ years experience..." className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Goals</label>
                  <textarea rows={3} value={formGoals} onChange={(e) => setFormGoals(e.target.value)}
                    placeholder="Drive leads for $5k coaching program, build authority in niche..." className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Target Audience</label>
                  <textarea rows={3} value={formTargetAudience} onChange={(e) => setFormTargetAudience(e.target.value)}
                    placeholder="Detailed narrative about who reads this blog..." className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Tone & Voice</label>
                  <textarea rows={3} value={formTone} onChange={(e) => setFormTone(e.target.value)}
                    placeholder="Authoritative but approachable, peer-to-peer, avoid jargon..." className={FIELD_CLS} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={LABEL_CLS}>Content Pillars (comma-separated)</label>
                  <input type="text" value={formContentPillars} onChange={(e) => setFormContentPillars(e.target.value)}
                    placeholder="Lead Generation, Systems, Mindset, AI Tools" className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Keyword Focus (comma-separated)</label>
                  <input type="text" value={formKeywordFocus} onChange={(e) => setFormKeywordFocus(e.target.value)}
                    placeholder="business coaching online, executive coach, scale business" className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Content Rules (one per line)</label>
                  <textarea rows={3} value={formContentRules} onChange={(e) => setFormContentRules(e.target.value)}
                    placeholder={"Always cite data\nNever mention Kajabi\nUse second-person voice"} className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Competitor Exclusions (comma-separated)</label>
                  <input type="text" value={formCompetitorExclusions} onChange={(e) => setFormCompetitorExclusions(e.target.value)}
                    placeholder="CompetitorA, CompetitorB" className={FIELD_CLS} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={LABEL_CLS}>Primary CTA URL</label>
                  <input type="text" value={formCtaPrimary} onChange={(e) => setFormCtaPrimary(e.target.value)}
                    placeholder="/book-a-call" className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Secondary CTA URL</label>
                  <input type="text" value={formCtaSecondary} onChange={(e) => setFormCtaSecondary(e.target.value)}
                    placeholder="/services" className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Min Word Count</label>
                  <input type="number" value={formMinWordCount}
                    onChange={(e) => setFormMinWordCount(parseInt(e.target.value) || 800)}
                    className={FIELD_CLS} />
                </div>
                <div>
                  <label className={LABEL_CLS}>Max Word Count</label>
                  <input type="number" value={formMaxWordCount}
                    onChange={(e) => setFormMaxWordCount(parseInt(e.target.value) || 1200)}
                    className={FIELD_CLS} />
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-dark-border">
            <button
              onClick={handleAdd}
              disabled={submitting || !formName.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Adding..." : "Add Client"}
            </button>
            <button onClick={resetForm}
              className="px-4 py-2 text-dark-muted hover:text-dark-text text-sm font-medium transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {clients.length === 0 ? (
        <div className="bg-dark-panel rounded-xl border border-dark-border">
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <Users size={40} className="text-dark-muted mb-3" />
            <p className="text-dark-muted font-medium mb-1">No clients yet</p>
            <p className="text-sm text-dark-muted">Click &quot;Add Client&quot; to get started.</p>
          </div>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-xl border border-dark-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-border bg-dark-panel2">
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Tier</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Platform</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-dark-muted font-medium">Monthly Fee</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Publish Window</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Last Post</th>
                  <th className="text-left px-5 py-3 text-dark-muted font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => {
                  const status = client.status ?? "active";
                  const window = client.publishWindowStart && client.publishWindowEnd
                    ? `${client.publishWindowStart}–${client.publishWindowEnd}`
                    : client.publishWindowStart ?? "\u2014";
                  return (
                    <tr key={client.id} className="border-b border-dark-border hover:bg-dark-panel2 transition-colors">
                      <td className="px-5 py-3">
                        <Link
                          href={`/app/postpilot/clients/${client.id}/setup`}
                          className="group flex items-center gap-1.5"
                        >
                          <span className="font-medium text-dark-text group-hover:text-cm-purple transition-colors">
                            {client.name}
                          </span>
                          <ExternalLink size={12} className="text-dark-muted group-hover:text-cm-purple-mid transition-colors" />
                        </Link>
                        {client.website && (
                          <div className="text-xs text-dark-muted truncate max-w-[160px] mt-0.5">{client.website}</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {client.tier ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIER_COLORS[client.tier] ?? "bg-dark-panel2 text-dark-muted"}`}>
                            {client.tier}
                          </span>
                        ) : (
                          <span className="text-dark-muted">{"\u2014"}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-dark-muted capitalize">{client.platform ?? "\u2014"}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-dark-panel2 text-dark-muted"}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right text-dark-text">{fmtUSD(client.monthlyFee ?? 0)}</td>
                      <td className="px-5 py-3 text-dark-muted text-xs">{window}</td>
                      <td className="px-5 py-3 text-dark-muted">{fmtDate(client.lastPost)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggle(client.id, status)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                              status === "paused"
                                ? "bg-dark-success/10 text-dark-success hover:bg-dark-success/20"
                                : "bg-dark-warn/10 text-dark-warn hover:bg-dark-warn/20"
                            }`}
                          >
                            {status === "paused" ? <><Play size={11} /> Resume</> : <><Pause size={11} /> Pause</>}
                          </button>
                          <button
                            onClick={() => handleDelete(client.id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-dark-danger/10 text-dark-danger hover:bg-dark-danger/20 transition-colors"
                          >
                            <Trash2 size={11} />
                            Delete
                          </button>
                        </div>
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
