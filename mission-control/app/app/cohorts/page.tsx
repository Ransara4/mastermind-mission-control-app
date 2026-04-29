"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  FileText,
  Clock,
  CheckCircle2,
  Star,
  Calendar,
  Sparkles,
  Target,
  TrendingUp,
  ArrowRight,
  Save,
  Users,
  X,
} from "lucide-react";
import { useCohortData } from "@/hooks/useCohortData";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-dark-muted">{label}</span>
        <div className="p-1.5 rounded-lg bg-cm-purple/15">
          <Icon size={16} className="text-cm-purple" />
        </div>
      </div>
      <p className="text-2xl font-bold text-dark-text">{value}</p>
    </div>
  );
}

function GoalCard({
  title,
  description,
  status,
  metric,
}: {
  title: string;
  description: string;
  status: "on-track" | "at-risk" | "not-started";
  metric?: string;
}) {
  const statusStyles = {
    "on-track": "bg-cm-purple/15 text-cm-purple",
    "at-risk": "bg-cm-pink-light text-[#9b5b5e]",
    "not-started": "bg-dark-panel2 text-dark-muted",
  };
  const statusLabel = {
    "on-track": "on track",
    "at-risk": "at risk",
    "not-started": "not started",
  };
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <h4 className="font-semibold text-dark-text">{title}</h4>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[status]}`}>
          {statusLabel[status]}
        </span>
      </div>
      <p className="text-sm text-dark-muted mb-2">{description}</p>
      {metric && <p className="text-xs font-medium text-cm-purple">{metric}</p>}
    </div>
  );
}

export default function CohortsOverview() {
  const { stats, posts, loading, error, settings, updateSettings, triggerGeneration, refresh } =
    useCohortData();
  const [generating, setGenerating] = useState(false);

  // Content Strategy local state
  const [strategyLocal, setStrategyLocal] = useState<Record<string, string>>({});
  const [savingStrategy, setSavingStrategy] = useState(false);
  const [savedStrategy, setSavedStrategy] = useState(false);
  const [pillarInput, setPillarInput] = useState("");
  const [exclusionInput, setExclusionInput] = useState("");

  useEffect(() => {
    if (Object.keys(settings).length > 0) setStrategyLocal({ ...settings });
  }, [settings]);

  const parseJson = (key: string): string[] => {
    try { return JSON.parse(strategyLocal[key] || "[]"); } catch { return []; }
  };

  const setJson = (key: string, value: unknown) => {
    setStrategyLocal((prev) => ({ ...prev, [key]: JSON.stringify(value) }));
  };

  const addTag = (key: string, input: string, setInput: (v: string) => void) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const current = parseJson(key);
    if (!current.includes(trimmed)) setJson(key, [...current, trimmed]);
    setInput("");
  };

  const removeTag = (key: string, tag: string) => {
    setJson(key, parseJson(key).filter((t) => t !== tag));
  };

  const saveStrategy = async () => {
    setSavingStrategy(true);
    try { await updateSettings(strategyLocal); setSavedStrategy(true); setTimeout(() => setSavedStrategy(false), 3000); } finally { setSavingStrategy(false); }
  };

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading dashboard...</p>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={() => refresh()}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8]"
        >
          Retry
        </button>
      </div>
    );
  }

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await triggerGeneration();
      setTimeout(refresh, 3000);
    } catch {
      // ignore
    } finally {
      setGenerating(false);
    }
  };

  const recentPosts = [...posts]
    .sort((a, b) => {
      const da = a.generated_at || a.published_at || "";
      const db = b.generated_at || b.published_at || "";
      return db.localeCompare(da);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cm-purple/15">
              <TrendingUp size={20} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-dark-text tracking-tight">Online Program HQ</h1>
              <p className="text-sm text-dark-muted">Content pipeline and strategy overview</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/app/cohorts/blog"
              className="flex items-center gap-2 px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] transition-colors text-sm"
            >
              <FileText size={15} />
              Review Posts
              <ArrowRight size={13} />
            </Link>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="flex items-center gap-2 px-4 py-2 bg-dark-panel2 border border-dark-border text-dark-muted rounded-lg hover:text-dark-text disabled:opacity-50 transition-colors text-sm"
            >
              {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
              {generating ? "Generating..." : "Generate Posts"}
            </button>
          </div>
        </div>
      </div>

      {/* Content Pipeline — stat cards at top for at-a-glance status */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-dark-text mb-3 flex items-center gap-2">
          <TrendingUp size={18} className="text-cm-purple" />
          Content Pipeline
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Pending Review"
            value={stats?.pending ?? 0}
            icon={FileText}
          />
          <StatCard
            label="In Queue"
            value={stats?.queued ?? 0}
            icon={Clock}
          />
          <StatCard
            label="Published This Week"
            value={stats?.publishedWeek ?? 0}
            icon={CheckCircle2}
          />
          <StatCard
            label="Avg Quality Score"
            value={stats?.avgQuality ?? "N/A"}
            icon={Star}
          />
        </div>
      </div>

      {/* Business Goals */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-dark-text mb-3 flex items-center gap-2">
          <Target size={18} className="text-cm-purple" />
          Business Goals
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <GoalCard
            title="SEO Content Engine"
            description="Publish 2 high-quality blog posts per day to drive organic traffic to your program's website"
            status={stats?.publishedWeek && stats.publishedWeek >= 7 ? "on-track" : stats?.publishedWeek ? "at-risk" : "not-started"}
            metric={`${stats?.publishedWeek ?? 0}/14 posts this week`}
          />
          <GoalCard
            title="Inbound Lead Generation"
            description="Convert blog readers → VSL viewers → application submissions through embedded CTAs"
            status="on-track"
            metric="CTAs: /program-vsl, /apply"
          />
          <GoalCard
            title="Thought Leadership"
            description="Establish your program as the go-to resource for your niche through consistent expert content"
            status={stats?.publishedTotal && stats.publishedTotal >= 5 ? "on-track" : "at-risk"}
            metric={`${stats?.publishedTotal ?? 0} articles published`}
          />
        </div>
      </div>

      {/* Content Strategy */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight text-dark-text flex items-center gap-2">
            <Users size={18} className="text-cm-purple" />
            Content Strategy
          </h2>
          <button
            onClick={saveStrategy}
            disabled={savingStrategy}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-cm-purple text-white rounded-lg hover:bg-[#5b4fa8] disabled:opacity-50"
          >
            {savingStrategy ? <Loader2 size={14} className="animate-spin" /> : savedStrategy ? <CheckCircle2 size={14} /> : <Save size={14} />}
            {savingStrategy ? "Saving..." : savedStrategy ? "Saved!" : "Save"}
          </button>
        </div>
        <div className="bg-dark-panel border border-dark-border rounded-xl p-4 space-y-4">
          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Target Audience</label>
            <textarea
              value={strategyLocal.target_audience || ""}
              onChange={(e) => setStrategyLocal((prev) => ({ ...prev, target_audience: e.target.value }))}
              className="w-full bg-dark-panel2 border border-dark-border rounded-lg p-2.5 text-sm text-dark-text h-24 resize-y focus:outline-none focus:ring-2 focus:ring-cm-purple"
              placeholder="Describe the target audience..."
            />
          </div>
          {/* Content Pillars */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Content Pillars</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {parseJson("content_pillars").map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-cm-purple/15 text-cm-purple rounded-full text-xs">
                  {tag}
                  <button onClick={() => removeTag("content_pillars", tag)} className="hover:text-cm-purple-mid"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={pillarInput}
                onChange={(e) => setPillarInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("content_pillars", pillarInput, setPillarInput))}
                placeholder="Add pillar..."
                className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => addTag("content_pillars", pillarInput, setPillarInput)}
                className="px-3 py-1.5 text-xs bg-cm-purple-light text-cm-purple rounded-lg hover:bg-cm-purple/20"
              >
                Add
              </button>
            </div>
          </div>
          {/* Competitor Exclusions */}
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">
              Competitor Exclusions <span className="text-dark-muted font-normal">(tools to never mention)</span>
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {parseJson("competitor_exclusions").map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-cm-pink-light text-[#9b5b5e] rounded-full text-xs">
                  {tag}
                  <button onClick={() => removeTag("competitor_exclusions", tag)} className="hover:opacity-70"><X size={10} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={exclusionInput}
                onChange={(e) => setExclusionInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("competitor_exclusions", exclusionInput, setExclusionInput))}
                placeholder="Add exclusion..."
                className="flex-1 bg-dark-panel2 border border-dark-border rounded-lg px-3 py-1.5 text-sm text-dark-text focus:outline-none focus:ring-2 focus:ring-cm-purple"
              />
              <button
                onClick={() => addTag("competitor_exclusions", exclusionInput, setExclusionInput)}
                className="px-3 py-1.5 text-xs bg-cm-pink-light text-[#9b5b5e] rounded-lg hover:opacity-80"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-dark-panel border border-dark-border rounded-xl">
        <div className="px-4 py-3 border-b border-dark-border flex items-center justify-between">
          <h3 className="font-semibold text-dark-text flex items-center gap-2">
            <Calendar size={16} className="text-cm-purple" />
            Recent Activity
          </h3>
          <Link href="/app/cohorts/blog" className="text-xs text-cm-purple hover:text-[#5b4fa8]">
            View all
          </Link>
        </div>
        <div className="divide-y divide-dark-border">
          {recentPosts.length === 0 ? (
            <div className="p-8 text-center text-dark-muted">
              No posts yet. Click &quot;Generate Posts&quot; to create your first batch.
            </div>
          ) : (
            recentPosts.map((post) => (
              <div
                key={post.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-text truncate">
                    {post.title}
                  </p>
                  <p className="text-xs text-dark-muted">
                    {post.content_pillar && (
                      <span className="mr-2">{post.content_pillar}</span>
                    )}
                    {post.generated_at &&
                      new Date(post.generated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  {post.quality_score && (
                    <span
                      className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        post.quality_score >= 8
                          ? "bg-cm-purple/15 text-cm-purple"
                          : post.quality_score >= 5
                          ? "bg-cm-pink-light text-[#9b5b5e]"
                          : "bg-dark-panel2 text-dark-muted"
                      }`}
                    >
                      {post.quality_score}
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      post.status === "published"
                        ? "bg-cm-purple/15 text-cm-purple"
                        : post.status === "generated"
                        ? "bg-cm-pink-light text-[#9b5b5e]"
                        : post.status === "approved" || post.status === "queued"
                        ? "bg-cm-purple-light text-cm-purple"
                        : post.status === "rejected"
                        ? "bg-dark-panel2 text-dark-muted"
                        : post.status === "publishing"
                        ? "bg-cm-purple/15 text-cm-purple"
                        : "bg-dark-panel2 text-dark-muted"
                    }`}
                  >
                    {post.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
