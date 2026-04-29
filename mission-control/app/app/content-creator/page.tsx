"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  Loader2,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Calendar,
  FileText,
  Send,
  Clock,
  Search,
  Trash2,
} from "lucide-react";

// ── Best Posting Times (GMT+8) ──────────────────────────────────────

const BEST_TIMES: Record<string, string[]> = {
  Instagram: ["9:00 AM", "12:00 PM", "5:00 PM"],
  LinkedIn: ["8:00 AM", "10:00 AM", "12:00 PM"],
  YouTube: ["2:00 PM", "5:00 PM"],
  TikTok: ["7:00 AM", "12:00 PM", "7:00 PM"],
};

// ── Types ────────────────────────────────────────────────────────────

interface PlatformContent {
  instagram?: { copy: string; hashtags: string[]; mediaType: string };
  linkedin?: { copy: string; hashtags: string[] };
  youtube?: { title: string; description: string; tags: string[] };
  tiktok?: { copy: string; hashtags: string[]; sounds?: string[] };
}

interface ContentRecord {
  id: string;
  topic: string;
  platforms: PlatformContent;
  tone: string;
  contentType: string;
  status: "draft" | "scheduled" | "posted" | "analyzed";
  scheduledFor?: string;
  postedAt?: string;
  createdAt: string;
}

type TabKey = "calendar" | "create" | "library";

const PLATFORMS = ["instagram", "linkedin", "youtube", "tiktok"] as const;
const TONES = ["professional", "casual", "educational", "inspirational"];
const CONTENT_TYPES = ["post", "reel", "story", "carousel", "article"];
const MEDIA_TYPES = ["post", "reel", "story", "carousel"];

const PLATFORM_COLORS: Record<string, string> = {
  instagram: "bg-cm-purple/20 text-cm-purple",
  linkedin: "bg-dark-success/20 text-dark-success",
  youtube: "bg-dark-danger/20 text-dark-danger",
  tiktok: "bg-dark-warn/20 text-dark-warn",
};

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-dark-panel2 text-dark-muted",
  scheduled: "bg-cm-purple/20 text-cm-purple",
  posted: "bg-dark-success/20 text-dark-success",
  analyzed: "bg-dark-warn/20 text-dark-warn",
};

// ── Helpers ──────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.getFullYear(), d.getMonth(), diff);
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

// ── Component ────────────────────────────────────────────────────────

export default function ContentCreatorPage() {
  const [items, setItems] = useState<ContentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("calendar");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [weekStart, setWeekStart] = useState<Date>(getMonday(new Date()));
  const [monthDate, setMonthDate] = useState<Date>(new Date());

  // Create/Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState("professional");
  const [contentType, setContentType] = useState("post");
  const [scheduledFor, setScheduledFor] = useState("");
  const [status, setStatus] = useState<ContentRecord["status"]>("draft");
  const [generating, setGenerating] = useState(false);

  // Platform-specific fields
  const [igCopy, setIgCopy] = useState("");
  const [igHashtags, setIgHashtags] = useState("");
  const [igMediaType, setIgMediaType] = useState("post");
  const [liCopy, setLiCopy] = useState("");
  const [liHashtags, setLiHashtags] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [ytDescription, setYtDescription] = useState("");
  const [ytTags, setYtTags] = useState("");
  const [tkCopy, setTkCopy] = useState("");
  const [tkHashtags, setTkHashtags] = useState("");

  // Library filters
  const [filterPlatform, setFilterPlatform] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSearch, setFilterSearch] = useState("");

  // Best times panel
  const [showBestTimes, setShowBestTimes] = useState(false);

  // ── Data ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/content-creator");
      const json = await res.json();
      setItems(json.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Stats ────────────────────────────────────────────────────────

  const totalPosts = items.length;
  const drafts = items.filter((i) => i.status === "draft").length;
  const scheduled = items.filter((i) => i.status === "scheduled").length;
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const postedThisMonth = items.filter(
    (i) => i.status === "posted" && i.postedAt?.startsWith(thisMonth)
  ).length;

  // ── Editor helpers ───────────────────────────────────────────────

  function resetEditor() {
    setEditId(null);
    setTopic("");
    setSelectedPlatforms(new Set());
    setTone("professional");
    setContentType("post");
    setScheduledFor("");
    setStatus("draft");
    setIgCopy(""); setIgHashtags(""); setIgMediaType("post");
    setLiCopy(""); setLiHashtags("");
    setYtTitle(""); setYtDescription(""); setYtTags("");
    setTkCopy(""); setTkHashtags("");
  }

  function loadRecord(r: ContentRecord) {
    setEditId(r.id);
    setTopic(r.topic);
    const plats = new Set<string>();
    if (r.platforms.instagram) plats.add("instagram");
    if (r.platforms.linkedin) plats.add("linkedin");
    if (r.platforms.youtube) plats.add("youtube");
    if (r.platforms.tiktok) plats.add("tiktok");
    setSelectedPlatforms(plats);
    setTone(r.tone);
    setContentType(r.contentType);
    setScheduledFor(r.scheduledFor ? r.scheduledFor.slice(0, 16) : "");
    setStatus(r.status);

    const ig = r.platforms.instagram;
    setIgCopy(ig?.copy || "");
    setIgHashtags(ig?.hashtags?.join(", ") || "");
    setIgMediaType(ig?.mediaType || "post");

    const li = r.platforms.linkedin;
    setLiCopy(li?.copy || "");
    setLiHashtags(li?.hashtags?.join(", ") || "");

    const yt = r.platforms.youtube;
    setYtTitle(yt?.title || "");
    setYtDescription(yt?.description || "");
    setYtTags(yt?.tags?.join(", ") || "");

    const tk = r.platforms.tiktok;
    setTkCopy(tk?.copy || "");
    setTkHashtags(tk?.hashtags?.join(", ") || "");

    setTab("create");
  }

  function buildPlatforms(): PlatformContent {
    const p: PlatformContent = {};
    if (selectedPlatforms.has("instagram")) {
      p.instagram = {
        copy: igCopy,
        hashtags: igHashtags.split(",").map((s) => s.trim()).filter(Boolean),
        mediaType: igMediaType,
      };
    }
    if (selectedPlatforms.has("linkedin")) {
      p.linkedin = {
        copy: liCopy,
        hashtags: liHashtags.split(",").map((s) => s.trim()).filter(Boolean),
      };
    }
    if (selectedPlatforms.has("youtube")) {
      p.youtube = {
        title: ytTitle,
        description: ytDescription,
        tags: ytTags.split(",").map((s) => s.trim()).filter(Boolean),
      };
    }
    if (selectedPlatforms.has("tiktok")) {
      p.tiktok = {
        copy: tkCopy,
        hashtags: tkHashtags.split(",").map((s) => s.trim()).filter(Boolean),
      };
    }
    return p;
  }

  async function handleSave(asStatus: "draft" | "scheduled") {
    const platforms = buildPlatforms();
    const payload: Record<string, unknown> = {
      topic,
      platforms,
      tone,
      contentType,
      status: asStatus,
      scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
    };

    if (editId) {
      payload.action = "update";
      payload.id = editId;
    }

    await fetch("/api/content-creator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    resetEditor();
    fetchData();
  }

  async function handleDelete(id: string) {
    await fetch("/api/content-creator", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchData();
  }

  async function handleGenerate() {
    if (!topic || selectedPlatforms.size === 0) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/content-creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          topic,
          platforms: Array.from(selectedPlatforms),
          tone,
          contentType,
        }),
      });
      const json = await res.json();
      if (json.generated) {
        const g = json.generated;
        if (g.instagram && !g.instagram.error) {
          setIgCopy(g.instagram.copy || "");
          setIgHashtags((g.instagram.hashtags || []).join(", "));
        }
        if (g.linkedin && !g.linkedin.error) {
          setLiCopy(g.linkedin.copy || "");
          setLiHashtags((g.linkedin.hashtags || []).join(", "));
        }
        if (g.youtube && !g.youtube.error) {
          setYtTitle(g.youtube.title || "");
          setYtDescription(g.youtube.description || "");
          setYtTags((g.youtube.tags || []).join(", "));
        }
        if (g.tiktok && !g.tiktok.error) {
          setTkCopy(g.tiktok.copy || "");
          setTkHashtags((g.tiktok.hashtags || []).join(", "));
        }
      }
    } catch {}
    setGenerating(false);
  }

  // ── Calendar helpers ─────────────────────────────────────────────

  function getItemsForDate(date: Date): ContentRecord[] {
    return items.filter((i) => {
      if (!i.scheduledFor) return false;
      return isSameDay(new Date(i.scheduledFor), date);
    });
  }

  function weekDays(): Date[] {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push(d);
    }
    return days;
  }

  // ── Library filter ───────────────────────────────────────────────

  const filteredItems = items.filter((i) => {
    if (filterPlatform && !(filterPlatform in i.platforms)) return false;
    if (filterStatus && i.status !== filterStatus) return false;
    if (filterSearch && !i.topic.toLowerCase().includes(filterSearch.toLowerCase()))
      return false;
    return true;
  });

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cm-purple/15 rounded-lg">
              <Megaphone size={24} className="text-cm-purple" />
            </div>
            <div>
              <h1 className="text-2xl text-dark-text font-bold tracking-tight">
                Content Creator
              </h1>
              <p className="text-dark-muted text-sm">
                Multi-platform content engine with AI generation
              </p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Posts", value: totalPosts, icon: FileText },
          { label: "Drafts", value: drafts, icon: FileText },
          { label: "Scheduled", value: scheduled, icon: Calendar },
          { label: "Posted This Month", value: postedThisMonth, icon: Send },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-dark-panel border border-dark-border rounded-xl p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-dark-muted">{s.label}</p>
                <p className="text-2xl font-bold text-dark-text mt-1">{s.value}</p>
              </div>
              <div className="p-2 bg-cm-purple/15 rounded-lg">
                <s.icon size={20} className="text-cm-purple" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(
          [
            { key: "calendar", label: "Calendar", icon: Calendar },
            { key: "create", label: editId ? "Edit" : "Create", icon: Plus },
            { key: "library", label: "Library", icon: FileText },
          ] as { key: TabKey; label: string; icon: React.ElementType }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === "create" && tab !== "create") resetEditor();
              setTab(t.key);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-cm-purple text-white"
                : "bg-dark-panel2 text-dark-muted hover:text-dark-text border border-dark-border"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-cm-purple" />
        </div>
      ) : (
        <>
          {/* ── Calendar Tab ──────────────────────────────────────── */}
          {tab === "calendar" && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-dark-text font-bold">
                  {calendarView === "week" ? "Week View" : "Month View"}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCalendarView(calendarView === "week" ? "month" : "week")
                    }
                    className="px-3 py-1.5 text-xs rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                  >
                    {calendarView === "week" ? "Month" : "Week"}
                  </button>
                  <button
                    onClick={() => {
                      if (calendarView === "week") {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() - 7);
                        setWeekStart(d);
                      } else {
                        setMonthDate(
                          new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1)
                        );
                      }
                    }}
                    className="p-1.5 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (calendarView === "week") {
                        const d = new Date(weekStart);
                        d.setDate(d.getDate() + 7);
                        setWeekStart(d);
                      } else {
                        setMonthDate(
                          new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)
                        );
                      }
                    }}
                    className="p-1.5 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {calendarView === "week" ? (
                <div className="grid grid-cols-7 gap-2">
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                    <div
                      key={d}
                      className="text-center text-xs text-dark-muted font-medium pb-1"
                    >
                      {d}
                    </div>
                  ))}
                  {weekDays().map((day) => {
                    const dayItems = getItemsForDate(day);
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div
                        key={day.toISOString()}
                        className={`bg-dark-panel/50 border rounded-lg p-2 min-h-[80px] ${
                          isToday ? "border-cm-purple" : "border-dark-border"
                        }`}
                      >
                        <p
                          className={`text-xs font-medium mb-1 ${
                            isToday ? "text-cm-purple" : "text-dark-muted"
                          }`}
                        >
                          {fmtDate(day)}
                        </p>
                        {dayItems.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => loadRecord(item)}
                            className="w-full text-left mb-1 px-1.5 py-0.5 rounded text-[10px] truncate bg-cm-purple/20 text-cm-purple hover:bg-cm-purple/30"
                          >
                            {item.topic}
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <p className="text-dark-text font-medium text-center mb-3">
                    {monthDate.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs text-dark-muted font-medium pb-1"
                      >
                        {d}
                      </div>
                    ))}
                    {(() => {
                      const days = getDaysInMonth(
                        monthDate.getFullYear(),
                        monthDate.getMonth()
                      );
                      const firstDay = days[0].getDay();
                      const offset = firstDay === 0 ? 6 : firstDay - 1;
                      const cells: (Date | null)[] = Array(offset).fill(null);
                      cells.push(...days);
                      while (cells.length % 7 !== 0) cells.push(null);
                      return cells.map((day, i) => {
                        if (!day) {
                          return (
                            <div
                              key={`empty-${i}`}
                              className="min-h-[60px] bg-dark-panel/30 rounded-lg"
                            />
                          );
                        }
                        const dayItems = getItemsForDate(day);
                        const isToday = isSameDay(day, new Date());
                        return (
                          <div
                            key={day.toISOString()}
                            className={`bg-dark-panel/50 border rounded-lg p-1 min-h-[60px] ${
                              isToday ? "border-cm-purple" : "border-dark-border"
                            }`}
                          >
                            <p
                              className={`text-[10px] font-medium ${
                                isToday ? "text-cm-purple" : "text-dark-muted"
                              }`}
                            >
                              {day.getDate()}
                            </p>
                            {dayItems.slice(0, 2).map((item) => (
                              <button
                                key={item.id}
                                onClick={() => loadRecord(item)}
                                className="w-full text-left mb-0.5 px-1 py-0.5 rounded text-[9px] truncate bg-cm-purple/20 text-cm-purple hover:bg-cm-purple/30"
                              >
                                {item.topic}
                              </button>
                            ))}
                            {dayItems.length > 2 && (
                              <p className="text-[9px] text-dark-muted">
                                +{dayItems.length - 2} more
                              </p>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Create / Edit Tab ─────────────────────────────────── */}
          {tab === "create" && (
            <div className="bg-dark-panel border border-dark-border rounded-xl p-6 space-y-5">
              <h2 className="text-dark-text font-bold">
                {editId ? "Edit Content" : "Create Content"}
              </h2>

              {/* Topic */}
              <div>
                <label className="text-sm text-dark-muted mb-1 block">Topic</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="What's the content about?"
                  className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                />
              </div>

              {/* Platforms */}
              <div>
                <label className="text-sm text-dark-muted mb-2 block">Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        const next = new Set(selectedPlatforms);
                        next.has(p) ? next.delete(p) : next.add(p);
                        setSelectedPlatforms(next);
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${
                        selectedPlatforms.has(p)
                          ? "bg-cm-purple text-white"
                          : "bg-dark-panel2 text-dark-muted border border-dark-border hover:text-dark-text"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone + Content Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text focus:outline-none focus:border-cm-purple"
                  >
                    {TONES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">
                    Content Type
                  </label>
                  <select
                    value={contentType}
                    onChange={(e) => setContentType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text focus:outline-none focus:border-cm-purple"
                  >
                    {CONTENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={generating || !topic || selectedPlatforms.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cm-purple text-white font-medium hover:bg-cm-purple/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate with AI
                  </>
                )}
              </button>

              {/* Platform-Specific Sections */}
              {selectedPlatforms.has("instagram") && (
                <div className="border border-dark-border rounded-lg p-4 space-y-3">
                  <h3 className="text-dark-text font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cm-purple" />
                    Instagram
                  </h3>
                  <textarea
                    value={igCopy}
                    onChange={(e) => setIgCopy(e.target.value)}
                    placeholder="Instagram copy…"
                    rows={4}
                    className="resize-y w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <input
                    type="text"
                    value={igHashtags}
                    onChange={(e) => setIgHashtags(e.target.value)}
                    placeholder="Hashtags (comma-separated)"
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <select
                    value={igMediaType}
                    onChange={(e) => setIgMediaType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text focus:outline-none focus:border-cm-purple"
                  >
                    {MEDIA_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedPlatforms.has("linkedin") && (
                <div className="border border-dark-border rounded-lg p-4 space-y-3">
                  <h3 className="text-dark-text font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-dark-success" />
                    LinkedIn
                  </h3>
                  <textarea
                    value={liCopy}
                    onChange={(e) => setLiCopy(e.target.value)}
                    placeholder="LinkedIn copy…"
                    rows={4}
                    className="resize-y w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <input
                    type="text"
                    value={liHashtags}
                    onChange={(e) => setLiHashtags(e.target.value)}
                    placeholder="Hashtags (comma-separated)"
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                </div>
              )}

              {selectedPlatforms.has("youtube") && (
                <div className="border border-dark-border rounded-lg p-4 space-y-3">
                  <h3 className="text-dark-text font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-dark-danger" />
                    YouTube
                  </h3>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    placeholder="Video title"
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <textarea
                    value={ytDescription}
                    onChange={(e) => setYtDescription(e.target.value)}
                    placeholder="Video description…"
                    rows={4}
                    className="resize-y w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <input
                    type="text"
                    value={ytTags}
                    onChange={(e) => setYtTags(e.target.value)}
                    placeholder="Tags (comma-separated)"
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                </div>
              )}

              {selectedPlatforms.has("tiktok") && (
                <div className="border border-dark-border rounded-lg p-4 space-y-3">
                  <h3 className="text-dark-text font-medium flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-dark-warn" />
                    TikTok
                  </h3>
                  <textarea
                    value={tkCopy}
                    onChange={(e) => setTkCopy(e.target.value)}
                    placeholder="TikTok copy…"
                    rows={4}
                    className="resize-y w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                  <input
                    type="text"
                    value={tkHashtags}
                    onChange={(e) => setTkHashtags(e.target.value)}
                    placeholder="Hashtags (comma-separated)"
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                </div>
              )}

              {/* Schedule + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">
                    Schedule Date/Time
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledFor}
                    onChange={(e) => setScheduledFor(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text focus:outline-none focus:border-cm-purple"
                  />
                </div>
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Status</label>
                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value as ContentRecord["status"])
                    }
                    className="w-full px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text focus:outline-none focus:border-cm-purple"
                  >
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="posted">Posted</option>
                    <option value="analyzed">Analyzed</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSave("draft")}
                  disabled={!topic}
                  className="px-4 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text font-medium hover:bg-dark-panel2/80 disabled:opacity-50"
                >
                  Save Draft
                </button>
                <button
                  onClick={() => handleSave("scheduled")}
                  disabled={!topic || !scheduledFor}
                  className="px-4 py-2 rounded-lg bg-cm-purple text-white font-medium hover:bg-cm-purple/80 disabled:opacity-50"
                >
                  Schedule
                </button>
                {editId && (
                  <button
                    onClick={() => {
                      resetEditor();
                      setTab("library");
                    }}
                    className="px-4 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-muted hover:text-dark-text"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Library Tab ───────────────────────────────────────── */}
          {tab === "library" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="bg-dark-panel border border-dark-border rounded-xl p-4 flex flex-wrap gap-3 items-center">
                <select
                  value={filterPlatform}
                  onChange={(e) => setFilterPlatform(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                >
                  <option value="">All Platforms</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text text-sm focus:outline-none focus:border-cm-purple"
                >
                  <option value="">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="posted">Posted</option>
                  <option value="analyzed">Analyzed</option>
                </select>
                <div className="relative flex-1 min-w-[200px]">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-muted"
                  />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder="Search topics…"
                    className="w-full pl-8 pr-3 py-2 rounded-lg bg-dark-panel2 border border-dark-border text-dark-text text-sm placeholder:text-dark-muted/50 focus:outline-none focus:border-cm-purple"
                  />
                </div>
              </div>

              {/* Content Cards */}
              {filteredItems.length === 0 ? (
                <div className="bg-dark-panel border border-dark-border rounded-xl p-10 text-center text-dark-muted">
                  No content found. Create your first post!
                </div>
              ) : (
                <div className="grid gap-3">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-dark-panel border border-dark-border rounded-xl p-4 flex items-center justify-between group"
                    >
                      <button
                        onClick={() => loadRecord(item)}
                        className="flex-1 text-left"
                      >
                        <p className="text-dark-text font-bold">{item.topic}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {Object.keys(item.platforms).map((p) => (
                            <span
                              key={p}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                                PLATFORM_COLORS[p] || "bg-dark-panel2 text-dark-muted"
                              }`}
                            >
                              {p}
                            </span>
                          ))}
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                              STATUS_COLORS[item.status]
                            }`}
                          >
                            {item.status}
                          </span>
                          {item.scheduledFor && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-dark-panel2 text-dark-muted">
                              <Clock size={10} />
                              {new Date(item.scheduledFor).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg text-dark-muted hover:text-dark-danger opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Best Posting Times */}
      <div className="bg-dark-panel border border-dark-border rounded-xl">
        <button
          onClick={() => setShowBestTimes(!showBestTimes)}
          className="w-full flex items-center justify-between p-4 text-dark-muted hover:text-dark-text"
        >
          <span className="text-sm font-medium flex items-center gap-2">
            <Clock size={14} />
            Best Posting Times (GMT+8)
          </span>
          {showBestTimes ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {showBestTimes && (
          <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(BEST_TIMES).map(([platform, times]) => (
              <div
                key={platform}
                className="bg-dark-panel2 rounded-lg p-3 border border-dark-border"
              >
                <p className="text-dark-text font-medium text-sm mb-1">{platform}</p>
                {times.map((t) => (
                  <p key={t} className="text-dark-muted text-xs">
                    {t}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
