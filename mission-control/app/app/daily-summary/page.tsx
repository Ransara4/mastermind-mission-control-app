"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Terminal,
  Sparkles,
  Clock,
  Wrench,
  Download,
  Send,
  Smartphone,
  GitCommit,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import SkillButton from "@/components/SkillButton";

interface SessionSummary {
  sessionId: string;
  source: "claude-code" | "openclaw";
  startTime: string;
  endTime: string;
  userMessages: string[];
  assistantSnippets: string[];
  toolsUsed: string[];
}

interface TaskExecutorLog {
  filename: string;
  timestamp: string;
  content: string;
}

interface QuickStats {
  claudeCodeSessions: number;
  openclawSessions: number;
  totalMessages: number;
  skillsInstalled: string[];
  telegramSentByBot: number;
  telegramFromPhone: number;
  taskExecutorRuns: number;
  gitCommits: number;
  tasksCompleted: number;
}

interface ReviewCard {
  id: string;
  title: string;
  labels: string[];
  column: string;
  executorStatus?: string;
  updatedAt?: number;
}

interface DailySummary {
  date: string;
  generatedAt: string;
  source?: string;
  littlebirdReportId?: number;
  narrative: string[];
  quickStats: QuickStats;
  sessions: SessionSummary[];
  taskExecutorRuns: TaskExecutorLog[];
  reviewCards?: ReviewCard[];
}

interface LittlebirdSettings {
  littlebirdEnabled: boolean;
  littlebirdAffiliateUrl: string;
  bannerDismissed: boolean;
}

function LittlebirdBanner({ affiliateUrl, onDismiss }: { affiliateUrl: string; onDismiss: () => void }) {
  return (
    <div className="bg-gradient-to-r from-cm-purple-light via-cm-pink-light to-white border border-cm-purple-light rounded-lg p-4 mb-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-2xl">&#x1F426;</span>
        <div>
          <p className="font-medium text-cm-purple text-sm">Get better daily summaries with Little Bird</p>
          <p className="text-xs text-dark-muted">Free AI activity tracking -- automatically generates rich daily journals from your screen activity</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <a href={affiliateUrl} target="_blank" rel="noopener noreferrer"
           className="px-3 py-1.5 bg-cm-purple text-white text-xs rounded-md hover:bg-cm-purple/80 transition-colors whitespace-nowrap">
          Try Free
        </a>
        <button onClick={onDismiss} className="text-dark-muted hover:text-dark-text p-1">&times;</button>
      </div>
    </div>
  );
}

interface AllTimeStats {
  totalDays: number;
  totalSessions: number;
  totalMessages: number;
  totalSkillsInstalled: number;
  totalTelegramSent: number;
  totalTelegramFromPhone: number;
  totalTaskExecutorRuns: number;
  totalGitCommits: number;
  claudeCodeSessions: number;
  openclawSessions: number;
  firstDay: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return iso;
  }
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function renderMarkdownLine(text: string) {
  // Simple inline markdown: **bold**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-dark-text">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderInline(text: string) {
  // Render inline markdown: **bold**, *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-dark-text">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic text-dark-muted">{part.slice(1, -1)}</em>;
    return <span key={i}>{part}</span>;
  });
}

function LittleBirdNarrative({ lines }: { lines: string[] }) {
  const elements: React.ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Horizontal rule
    if (trimmed === "---") {
      elements.push(<hr key={i} className="border-dark-border my-3" />);
      i++; continue;
    }

    // H3 heading: ### ...
    if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4).replace(/\*\*/g, "");
      elements.push(
        <h4 key={i} className="text-sm font-bold text-cm-purple uppercase tracking-wide mt-5 mb-2 first:mt-0">
          {text}
        </h4>
      );
      i++; continue;
    }

    // H4 heading: #### ...
    if (trimmed.startsWith("#### ")) {
      const text = trimmed.slice(5).replace(/\*\*/g, "");
      elements.push(
        <h5 key={i} className="text-sm font-semibold text-dark-text mt-3 mb-1">
          {text}
        </h5>
      );
      i++; continue;
    }

    // Sub-bullet: 4+ spaces + * or -
    if (/^( {4}|\t)\s*[\*\-]\s/.test(line)) {
      const text = trimmed.replace(/^[\*\-]\s*/, "");
      elements.push(
        <div key={i} className="flex gap-2 items-start pl-6 text-sm text-dark-muted leading-relaxed">
          <span className="text-dark-muted mt-0.5 text-xs flex-shrink-0">›</span>
          <span>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // Top-level bullet: * or -
    if (/^[\*\-]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[\*\-]\s*/, "");
      elements.push(
        <div key={i} className="flex gap-2 items-start text-sm text-dark-text leading-relaxed">
          <span className="text-cm-purple mt-0.5 text-xs flex-shrink-0">•</span>
          <span>{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // Empty line — small gap
    if (trimmed === "") {
      elements.push(<div key={i} className="h-1" />);
      i++; continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-dark-text leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
    i++;
  }
  return <div className="space-y-1">{elements}</div>;
}

export default function DailySummaryPage() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datesWithData, setDatesWithData] = useState<Set<string>>(new Set());
  const [loadingDates, setLoadingDates] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [statsView, setStatsView] = useState<"daily" | "alltime">("daily");
  const [allTimeStats, setAllTimeStats] = useState<AllTimeStats | null>(null);
  const [loadingAllTime, setLoadingAllTime] = useState(false);
  const [lbSettings, setLbSettings] = useState<LittlebirdSettings | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  const monthKey = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`;

  const fetchMonthDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const res = await fetch(`/api/daily-summary?month=${monthKey}`);
      const data = await res.json();
      setDatesWithData(new Set(data.dates || []));
    } catch {
      setDatesWithData(new Set());
    }
    setLoadingDates(false);
  }, [monthKey]);

  const fetchAllTimeStats = useCallback(async () => {
    setLoadingAllTime(true);
    try {
      const res = await fetch("/api/daily-summary?alltime=true");
      const data: AllTimeStats = await res.json();
      setAllTimeStats(data);
    } catch {
      setAllTimeStats(null);
    }
    setLoadingAllTime(false);
  }, []);

  useEffect(() => {
    fetchMonthDates();
  }, [fetchMonthDates]);

  useEffect(() => {
    if (statsView === "alltime" && !allTimeStats) {
      fetchAllTimeStats();
    }
  }, [statsView, allTimeStats, fetchAllTimeStats]);

  useEffect(() => {
    fetch("/api/daily-summary?settings=true")
      .then((res) => res.json())
      .then((data: LittlebirdSettings) => {
        setLbSettings(data);
        setShowBanner(!data.littlebirdEnabled && !data.bannerDismissed);
      })
      .catch(() => setShowBanner(false));
  }, []);

  const fetchSummary = useCallback(async (date: string, regenerate = false) => {
    setLoading(true);
    setError(null);
    setShowDetail(false);
    try {
      const url = `/api/daily-summary?date=${date}${regenerate ? "&regenerate=true" : ""}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch summary");
      const data: DailySummary = await res.json();
      setSummary(data);
      if ((data.sessions?.length || 0) > 0 || (data.taskExecutorRuns?.length || 0) > 0) {
        setDatesWithData((prev) => new Set([...prev, date]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setSummary(null);
    }
    setLoading(false);
  }, []);

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
    fetchSummary(date);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);

  const todayStr = formatDate(today);
  const isEmpty = summary && (summary.sessions?.length || 0) === 0 && (summary.taskExecutorRuns?.length || 0) === 0 && (summary.source !== "littlebird") && (summary.narrative?.length || 0) === 0;
  const stats = summary?.quickStats;

  const dismissBanner = async () => {
    setShowBanner(false);
    try {
      await fetch("/api/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-settings", updates: { bannerDismissed: true } }),
      });
    } catch { /* ignore */ }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {showBanner && (
        <LittlebirdBanner
          affiliateUrl={lbSettings?.littlebirdAffiliateUrl || "https://littlebird.ai"}
          onDismiss={dismissBanner}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar + Quick Stats Panel */}
        <div className="lg:w-80 flex-shrink-0 space-y-4">
          {/* Calendar */}
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-dark-panel2 transition-colors">
                <ChevronLeft size={20} className="text-dark-muted" />
              </button>
              <div className="text-center">
                <span className="font-semibold tracking-tight text-dark-text">
                  {MONTHS[viewMonth]} {viewYear}
                </span>
                {(viewYear !== today.getFullYear() || viewMonth !== today.getMonth()) && (
                  <button onClick={goToToday} className="ml-2 text-xs text-cm-purple hover:text-cm-purple-mid">
                    Today
                  </button>
                )}
              </div>
              <button onClick={nextMonth} className="p-1 rounded hover:bg-dark-panel2 transition-colors">
                <ChevronRight size={20} className="text-dark-muted" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-dark-muted py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="h-9" />;

                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isToday = dateStr === todayStr;
                const isSelected = dateStr === selectedDate;
                const hasData = datesWithData.has(dateStr);
                const isFuture = new Date(dateStr) > today;

                return (
                  <button
                    key={dateStr}
                    onClick={() => !isFuture && handleDateClick(dateStr)}
                    disabled={isFuture}
                    className={`h-9 rounded-lg text-sm relative transition-all ${
                      isSelected
                        ? "bg-cm-purple text-white font-semibold"
                        : isToday
                        ? "bg-cm-purple/10 text-cm-purple font-semibold ring-1 ring-cm-purple/30"
                        : isFuture
                        ? "text-dark-muted/40 cursor-not-allowed"
                        : "text-dark-text hover:bg-dark-panel2"
                    }`}
                  >
                    {day}
                    {hasData && !isSelected && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-cm-purple" />
                    )}
                  </button>
                );
              })}
            </div>

            {loadingDates && (
              <div className="flex items-center justify-center mt-3 text-xs text-dark-muted">
                <Loader2 className="animate-spin mr-1" size={12} /> Loading...
              </div>
            )}
          </div>

          {/* Quick Stats */}
          {(stats && !isEmpty) || statsView === "alltime" || !selectedDate ? (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold tracking-tight text-dark-text">Quick Stats</h3>
                <div className="flex bg-dark-panel2 rounded-lg p-0.5">
                  <button
                    onClick={() => setStatsView("daily")}
                    className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                      statsView === "daily"
                        ? "bg-dark-panel text-dark-text shadow-sm font-medium"
                        : "text-dark-muted hover:text-dark-text"
                    }`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() => setStatsView("alltime")}
                    className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                      statsView === "alltime"
                        ? "bg-dark-panel text-dark-text shadow-sm font-medium"
                        : "text-dark-muted hover:text-dark-text"
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              {statsView === "daily" && !stats && (
                <p className="text-xs text-dark-muted py-2">Select a date to see daily stats.</p>
              )}
              {statsView === "daily" && stats && (
                <div className="space-y-2.5">
                  {stats.claudeCodeSessions > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Terminal size={14} className="text-cm-purple" />
                        <span>Claude Code sessions</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.claudeCodeSessions}</span>
                    </div>
                  )}
                  {stats.openclawSessions > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <MessageSquare size={14} className="text-cm-purple-mid" />
                        <span>OpenClaw sessions</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.openclawSessions}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-dark-muted">
                      <MessageSquare size={14} className="text-dark-success" />
                      <span>Messages sent</span>
                    </div>
                    <span className="font-medium text-dark-text">{stats.totalMessages}</span>
                  </div>
                  {(stats.gitCommits || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <GitCommit size={14} className="text-dark-warn" />
                        <span>Git commits</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.gitCommits}</span>
                    </div>
                  )}
                  {(stats.skillsInstalled?.length || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Download size={14} className="text-cm-purple" />
                        <span>Skills installed</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.skillsInstalled.length}</span>
                    </div>
                  )}
                  {stats.telegramSentByBot > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Send size={14} className="text-cm-purple" />
                        <span>Telegram sent</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.telegramSentByBot}</span>
                    </div>
                  )}
                  {stats.telegramFromPhone > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Smartphone size={14} className="text-dark-success" />
                        <span>Commands from phone</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.telegramFromPhone}</span>
                    </div>
                  )}
                  {stats.taskExecutorRuns > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Wrench size={14} className="text-dark-warn" />
                        <span>Task executor runs</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.taskExecutorRuns}</span>
                    </div>
                  )}
                  {(stats.tasksCompleted || 0) > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <CheckCircle2 size={14} className="text-dark-success" />
                        <span>Tasks completed</span>
                      </div>
                      <span className="font-medium text-dark-text">{stats.tasksCompleted}</span>
                    </div>
                  )}
                  {summary?.reviewCards && summary.reviewCards.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-dark-muted">
                        <Eye size={14} className="text-dark-warn" />
                        <span>Awaiting review</span>
                      </div>
                      <span className="font-medium text-dark-warn">{summary.reviewCards.length}</span>
                    </div>
                  )}
                </div>
              )}

              {statsView === "alltime" && (
                <>
                  {loadingAllTime ? (
                    <div className="flex items-center justify-center py-4 text-xs text-dark-muted">
                      <Loader2 className="animate-spin mr-1" size={12} /> Loading...
                    </div>
                  ) : allTimeStats ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-dark-muted">
                          <Sparkles size={14} className="text-dark-warn" />
                          <span>Active days</span>
                        </div>
                        <span className="font-medium text-dark-text">{allTimeStats.totalDays}</span>
                      </div>
                      {allTimeStats.claudeCodeSessions > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <Terminal size={14} className="text-cm-purple" />
                            <span>CC sessions</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.claudeCodeSessions.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.openclawSessions > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <MessageSquare size={14} className="text-cm-purple-mid" />
                            <span>OC sessions</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.openclawSessions.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-dark-muted">
                          <MessageSquare size={14} className="text-dark-success" />
                          <span>Total messages</span>
                        </div>
                        <span className="font-medium text-dark-text">{allTimeStats.totalMessages.toLocaleString()}</span>
                      </div>
                      {(allTimeStats.totalGitCommits || 0) > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <GitCommit size={14} className="text-dark-warn" />
                            <span>Git commits</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.totalGitCommits.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.totalSkillsInstalled > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <Download size={14} className="text-cm-purple" />
                            <span>Skills installed</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.totalSkillsInstalled.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.totalTelegramSent > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <Send size={14} className="text-cm-purple" />
                            <span>Telegram sent</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.totalTelegramSent.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.totalTelegramFromPhone > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <Smartphone size={14} className="text-dark-success" />
                            <span>Commands from phone</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.totalTelegramFromPhone.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.totalTaskExecutorRuns > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2 text-dark-muted">
                            <Wrench size={14} className="text-dark-warn" />
                            <span>Task executor runs</span>
                          </div>
                          <span className="font-medium text-dark-text">{allTimeStats.totalTaskExecutorRuns.toLocaleString()}</span>
                        </div>
                      )}
                      {allTimeStats.firstDay && (
                        <div className="pt-2 mt-2 border-t border-dark-border text-xs text-dark-muted">
                          Since {new Date(allTimeStats.firstDay + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-dark-muted py-2">No data available yet.</p>
                  )}
                </>
              )}
            </div>
          ) : null}

          {/* Quick Actions */}
          <div className="bg-dark-panel rounded-xl border border-dark-border p-4">
            <h3 className="text-xs font-semibold text-dark-muted uppercase tracking-wider mb-3">
              Quick Actions
            </h3>
            <div className="flex flex-col gap-2">
              <SkillButton
                skillName="summarize"
                label="Summarize Session"
                size="sm"
                showOutput={true}
              />
              <SkillButton
                skillName="code-stats"
                label="Code Stats"
                size="sm"
                showOutput={true}
              />
            </div>
          </div>
        </div>

        {/* Main Summary Panel */}
        <div className="flex-1 min-w-0">
          {/* Empty state */}
          {!selectedDate && (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
              <Sparkles className="mx-auto text-dark-muted mb-4" size={48} />
              <h3 className="text-lg font-semibold tracking-tight text-dark-text mb-2">Daily Summary</h3>
              <p className="text-dark-muted text-sm">
                Click a date on the calendar to see what got done.
                <br />
                Dates with a purple dot have cached summaries.
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-cm-purple mb-4" size={32} />
              <p className="text-dark-muted">Analyzing history for {selectedDate}...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-dark-panel rounded-xl border border-dark-border p-12 text-center">
              <AlertCircle className="mx-auto text-dark-danger mb-4" size={32} />
              <p className="text-dark-muted mb-4">{error}</p>
              <button
                onClick={() => selectedDate && fetchSummary(selectedDate)}
                className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Summary Content */}
          {!loading && !error && summary && (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight text-dark-text">
                      {new Date(summary.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </h3>
                    {summary.source === "littlebird" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-cm-purple-light text-cm-purple text-xs rounded-full font-medium">
                        &#x1F426; Little Bird
                      </span>
                    ) : summary.sessions?.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-dark-panel2 text-dark-muted text-xs rounded-full font-medium">
                        &#x2699;&#xFE0F; Generated
                      </span>
                    ) : null}
                  </div>
                  <button
                    onClick={() => selectedDate && fetchSummary(selectedDate, true)}
                    className="p-2 rounded-lg hover:bg-dark-panel2 transition-colors"
                    title="Regenerate summary"
                  >
                    <RefreshCw size={16} className="text-dark-muted" />
                  </button>
                </div>
                {summary.generatedAt && (
                  <p className="text-xs text-dark-muted">
                    Generated {new Date(summary.generatedAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Empty day */}
              {isEmpty && (
                <div className="bg-dark-panel rounded-xl border border-dark-border p-8 text-center">
                  <p className="text-dark-muted">No activity found for this date.</p>
                </div>
              )}

              {/* Narrative Summary */}
              {(summary.narrative?.length || 0) > 0 && (
                <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
                  <h4 className="text-sm font-semibold tracking-tight text-dark-muted uppercase tracking-wide mb-4">
                    What got done
                  </h4>
                  {summary.source === "littlebird" ? (
                    <LittleBirdNarrative lines={summary.narrative} />
                  ) : (
                  <div className="space-y-1.5">
                    {summary.narrative.map((line, i) => {
                      const isSubItem = line.startsWith("  - ");
                      const content = isSubItem ? line.slice(4) : line;
                      return (
                        <div
                          key={i}
                          className={`text-sm leading-relaxed ${
                            isSubItem
                              ? "pl-6 text-dark-muted"
                              : "text-dark-text pt-1.5 first:pt-0"
                          }`}
                        >
                          {isSubItem ? (
                            <span className="flex gap-2 items-start">
                              <span className="text-dark-muted mt-0.5 text-xs">&#8250;</span>
                              <span>{renderMarkdownLine(content)}</span>
                            </span>
                          ) : (
                            renderMarkdownLine(content)
                          )}
                        </div>
                      );
                    })}
                  </div>
                  )}

                  {/* Skills installed detail (collapsible if many) */}
                  {stats && (stats.skillsInstalled?.length || 0) > 0 && stats.skillsInstalled.length <= 10 && (
                    <div className="mt-4 p-3 bg-cm-purple/10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm font-medium text-cm-purple mb-1">
                        <Download size={14} />
                        Skills Installed
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {stats.skillsInstalled.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-cm-purple/20 text-cm-purple text-xs rounded-full font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {stats && (stats.skillsInstalled?.length || 0) > 10 && (
                    <details className="mt-4">
                      <summary className="p-3 bg-cm-purple/10 rounded-lg cursor-pointer">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-cm-purple">
                          <Download size={14} />
                          {stats.skillsInstalled.length} Skills Installed (click to expand)
                        </span>
                      </summary>
                      <div className="p-3 pt-2 flex flex-wrap gap-1.5">
                        {stats.skillsInstalled.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-cm-purple/20 text-cm-purple text-xs rounded-full font-medium"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Still Requires Human Review */}
              {summary?.reviewCards && summary.reviewCards.length > 0 && (
                <div className="bg-dark-panel rounded-xl border border-dark-warn/30 p-5">
                  <h4 className="text-sm font-semibold tracking-tight text-dark-warn uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Eye size={14} />
                    Still Requires Human Review ({summary.reviewCards.length})
                  </h4>
                  <div className="space-y-2">
                    {summary.reviewCards.map((card) => (
                      <div
                        key={card.id}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          card.executorStatus === "needs-attention"
                            ? "bg-dark-danger/10 border border-dark-danger/20"
                            : "bg-dark-warn/10 border border-dark-warn/20"
                        }`}
                      >
                        {card.executorStatus === "needs-attention" ? (
                          <AlertTriangle size={14} className="text-dark-danger mt-0.5 flex-shrink-0" />
                        ) : (
                          <Eye size={14} className="text-dark-warn mt-0.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-dark-text truncate">
                            {card.title}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                              card.column === "review"
                                ? "bg-cm-purple/20 text-cm-purple"
                                : card.column === "claude-code-todo"
                                ? "bg-dark-warn/20 text-dark-warn"
                                : "bg-dark-panel2 text-dark-muted"
                            }`}>
                              {card.column === "review" ? "Review" : card.column === "claude-code-todo" ? "To Do" : card.column}
                            </span>
                            {card.executorStatus === "needs-attention" && (
                              <span className="text-xs text-dark-danger font-medium">Needs attention</span>
                            )}
                            {(card.labels?.length || 0) > 0 && (
                              <span className="text-xs text-dark-muted">{card.labels[0]}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Collapsible Detail Section */}
              {!isEmpty && (summary.sessions?.length || 0) > 0 && (
                <div className="bg-dark-panel rounded-xl border border-dark-border">
                  <button
                    onClick={() => setShowDetail(!showDetail)}
                    className="w-full flex items-center justify-between p-4 text-sm font-medium text-dark-muted hover:text-dark-text transition-colors"
                  >
                    <span>
                      Session Details ({summary.sessions?.length || 0} session{(summary.sessions?.length || 0) !== 1 ? "s" : ""})
                    </span>
                    {showDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {showDetail && (
                    <div className="border-t border-dark-border divide-y divide-dark-border">
                      {summary.sessions.map((session) => (
                        <div key={session.sessionId} className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              session.source === "openclaw"
                                ? "bg-cm-purple/20 text-cm-purple"
                                : "bg-cm-purple/10 text-cm-purple"
                            }`}>
                              {session.source === "openclaw" ? "OpenClaw" : "Claude Code"}
                            </span>
                            <Clock size={12} className="text-dark-muted" />
                            <span className="text-xs text-dark-muted">
                              {formatTime(session.startTime)} - {formatTime(session.endTime)}
                            </span>
                            <span className="text-xs text-dark-muted font-mono font-dm-mono">
                              {session.sessionId.slice(0, 8)}
                            </span>
                          </div>

                          {(session.toolsUsed?.length || 0) > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {session.toolsUsed.slice(0, 8).map((tool) => (
                                <span key={tool} className="px-1.5 py-0.5 bg-dark-panel2 text-dark-muted text-xs rounded">
                                  {tool}
                                </span>
                              ))}
                              {(session.toolsUsed?.length || 0) > 8 && (
                                <span className="px-1.5 py-0.5 text-dark-muted text-xs">
                                  +{session.toolsUsed.length - 8} more
                                </span>
                              )}
                            </div>
                          )}

                          <div className="space-y-1.5">
                            {(session.userMessages || []).map((msg, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="w-1 bg-cm-purple rounded-full flex-shrink-0" />
                                <p className="text-xs text-dark-muted leading-relaxed">{msg}</p>
                              </div>
                            ))}
                          </div>

                          {(session.assistantSnippets?.length || 0) > 0 && (
                            <div className="mt-2 pt-2 border-t border-dark-border space-y-1.5">
                              {session.assistantSnippets.slice(0, 3).map((snippet, i) => (
                                <div key={i} className="flex gap-2">
                                  <div className="w-1 bg-dark-success rounded-full flex-shrink-0" />
                                  <p className="text-xs text-dark-muted leading-relaxed">{snippet}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* System Tasks */}
              {(summary.taskExecutorRuns?.length || 0) > 0 && (
                <details className="bg-dark-panel rounded-xl border border-dark-border">
                  <summary className="p-4 cursor-pointer hover:bg-dark-panel2 rounded-xl transition-colors">
                    <div className="flex items-center gap-2">
                      <Wrench size={14} className="text-cm-purple" />
                      <span className="text-sm font-semibold text-dark-text">System Tasks</span>
                      <span className="px-1.5 py-0.5 bg-cm-purple-light text-cm-purple text-xs rounded-full font-medium ml-1">
                        {summary.taskExecutorRuns.length}
                      </span>
                    </div>
                  </summary>
                  <div className="border-t border-dark-border p-4 space-y-3">
                    {summary.taskExecutorRuns.map((log) => (
                      <div key={log.filename} className="bg-dark-panel2 rounded-lg p-3">
                        <p className="text-xs text-dark-muted mb-2">{log.timestamp}</p>
                        <pre className="text-xs text-dark-text whitespace-pre-wrap font-mono font-dm-mono leading-relaxed overflow-x-auto">
                          {log.content}
                        </pre>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
