"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  RefreshCw,
  BookOpen,
  Sparkles,
  Clock,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface StoryEntry {
  id: string;
  title: string;
  childName: string;
  age: number;
  theme: string;
  challenge: string;
  moral: string;
  readingTimeMinutes: number;
  generatedAt: string;
}

interface DashboardData {
  status: string;
  lastRun: string | null;
  totalStories: number;
  recentStories: StoryEntry[];
  config: {
    model: string;
    themes: string[];
    challenges: string[];
    lengths: string[];
  };
  stats: {
    uniqueChildren: number;
    themes: Record<string, number>;
    challenges: Record<string, number>;
    totalTokens: number;
  };
}

export default function StoryEnginePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("5");
  const [interests, setInterests] = useState("");
  const [challenge, setChallenge] = useState("");
  const [theme, setTheme] = useState("");
  const [length, setLength] = useState("medium");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/story-engine");
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    if (!childName || !age) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await fetch("/api/story-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childName,
          age: parseInt(age),
          interests: interests || undefined,
          challenge: challenge || undefined,
          theme: theme || undefined,
          length,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const story = await res.json();
      setGenResult(story);
      fetchData(); // refresh stats
    } catch (err: any) {
      setGenResult({ error: err.message });
    } finally {
      setGenerating(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple mb-4" size={32} />
        <p className="text-dark-muted">Loading Story Engine...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <AlertCircle className="text-dark-danger mb-4" size={32} />
        <h3 className="text-lg font-semibold  text-dark-text mb-2">
          Failed to load Story Engine
        </h3>
        <p className="text-dark-muted mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-dark-text flex items-center gap-2">
            <Sparkles className="text-cm-purple" size={28} />
            Bedtime Story Engine
          </h1>
          <p className="text-sm text-dark-muted">
            AI-personalized bedtime stories for kids
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-dark-panel border border-dark-border rounded-lg hover:bg-dark-panel2 text-sm text-dark-text"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BookOpen size={20} className="text-cm-purple" />}
          label="Total Stories"
          value={data.totalStories}
        />
        <StatCard
          icon={<Users size={20} className="text-cm-purple" />}
          label="Unique Children"
          value={data.stats.uniqueChildren}
        />
        <StatCard
          icon={<Zap size={20} className="text-dark-warn" />}
          label="Tokens Used"
          value={data.stats.totalTokens.toLocaleString()}
        />
        <StatCard
          icon={<Clock size={20} className="text-dark-success" />}
          label="Status"
          value={data.status}
        />
      </div>

      {/* Generate Story */}
      <div className="bg-dark-panel rounded-xl border border-dark-border overflow-hidden">
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-between p-4 hover:bg-dark-panel2"
        >
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-cm-purple" />
            <span className="font-semibold  text-dark-text">
              Generate New Story
            </span>
          </div>
          {showForm ? (
            <ChevronUp size={18} />
          ) : (
            <ChevronDown size={18} />
          )}
        </button>
        {showForm && (
          <div className="p-4 border-t border-dark-border space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Child&apos;s Name *
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Luna"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Age *
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="2"
                  max="12"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Interests
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="dinosaurs, space, painting"
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text placeholder-dark-muted focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Challenge
                </label>
                <select
                  value={challenge}
                  onChange={(e) => setChallenge(e.target.value)}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                >
                  <option value="">None</option>
                  {data.config.challenges.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Moral Theme
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                >
                  <option value="">Random</option>
                  {data.config.themes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">
                  Length
                </label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  className="w-full px-3 py-2 border border-dark-border rounded-lg text-sm bg-dark-panel2 text-dark-text focus:ring-2 focus:ring-cm-purple focus:border-transparent"
                >
                  {data.config.lengths.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={generating || !childName}
              className="flex items-center gap-2 px-6 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {generating ? "Generating..." : "Generate Story"}
            </button>

            {/* Generated Story Result */}
            {genResult && !genResult.error && (
              <div className="mt-4 p-4 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                <h3 className="font-bold  text-cm-purple text-lg mb-2">
                  {genResult.title}
                </h3>
                <div className="text-dark-text whitespace-pre-wrap text-sm leading-relaxed mb-3">
                  {genResult.story}
                </div>
                <div className="text-xs text-cm-purple font-medium">
                  Moral: {genResult.moral} | ~{genResult.readingTimeMinutes} min
                  read
                </div>
              </div>
            )}
            {genResult?.error && (
              <div className="mt-4 p-3 bg-dark-danger/10 rounded-lg border border-dark-danger/30 text-dark-danger text-sm">
                {genResult.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Stories */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
        <h2 className="font-semibold  text-dark-text mb-3 flex items-center gap-2">
          <BookOpen size={18} className="text-cm-purple" />
          Recent Stories
        </h2>
        {data.recentStories.length === 0 ? (
          <p className="text-sm text-dark-muted py-4 text-center">
            No stories generated yet. Create your first one above!
          </p>
        ) : (
          <div className="space-y-3">
            {data.recentStories.map((story) => (
              <div
                key={story.id}
                className="p-3 rounded-lg border border-dark-border hover:border-cm-purple hover:bg-cm-purple/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-dark-text text-sm">
                      {story.title}
                    </h3>
                    <p className="text-xs text-dark-muted mt-1">
                      For {story.childName} (age {story.age})
                      {story.theme && ` · ${story.theme}`}
                      {story.challenge && ` · ${story.challenge}`}
                    </p>
                    <p className="text-xs text-dark-muted mt-1 italic">
                      {story.moral}
                    </p>
                  </div>
                  <div className="text-xs text-dark-muted whitespace-nowrap ml-3">
                    {new Date(story.generatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Themes & Challenges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <h2 className="font-semibold  text-dark-text mb-3">
            Available Themes
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.config.themes.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium"
              >
                {t}
                {data.stats.themes[t] && (
                  <span className="ml-1 text-cm-purple/60">
                    ({data.stats.themes[t]})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
          <h2 className="font-semibold  text-dark-text mb-3">
            Supported Challenges
          </h2>
          <div className="flex flex-wrap gap-2">
            {data.config.challenges.map((c) => (
              <span
                key={c}
                className="px-3 py-1 bg-cm-purple/10 text-cm-purple rounded-full text-xs font-medium"
              >
                {c}
                {data.stats.challenges[c] && (
                  <span className="ml-1 text-cm-purple/60">
                    ({data.stats.challenges[c]})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
      <div className="flex items-center gap-2 mb-1">{icon}</div>
      <p className="text-2xl font-bold text-dark-text">{value}</p>
      <p className="text-xs text-dark-muted">{label}</p>
    </div>
  );
}
