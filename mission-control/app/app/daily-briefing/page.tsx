"use client";

import { useState, useEffect } from "react";
import {
  Sun,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  DollarSign,
  Lightbulb,
  Mail,
  Moon,
  AlertTriangle,
  Clock,
  GitCommit,
  Zap,
  RefreshCw,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────

interface DailyBriefing {
  date: string;
  generatedAt: string;
  accomplishments: {
    narrative: string[];
    sessionCount: number;
    gitCommits: number;
    tasksCompleted: number;
  };
  todaysFocus: {
    items: Array<{
      title: string;
      project: string;
      priority: string;
      source: string;
    }>;
  };
  revenue: {
    stripe: { total: number; charges: number; currency: string };
    gumroad: { total: number; sales: number };
    grandTotal: number;
  };
  suggestedTasks: Array<{ title: string; reason: string }>;
  santaReport: {
    ran: boolean;
    summary: string;
    reportPath: string | null;
  };
  importantMessages: Array<{
    source: string;
    summary: string;
    priority: string;
    timestamp: string;
  }>;
  humanTaskFailures: Array<{
    task: string;
    error: string;
    timestamp: string;
  }>;
  topPassiveIdea: {
    title: string;
    description: string;
    potentialIncome: string;
    difficulty: string;
  } | null;
}

// ── Priority helpers ───────────────────────────────────────────────

const PRIORITY_CLASSES: Record<string, string> = {
  High: "bg-dark-danger/20 text-dark-danger",
  Medium: "bg-dark-warn/20 text-dark-warn",
  Low: "bg-dark-panel2 text-dark-muted",
};

const MESSAGE_PRIORITY_CLASSES: Record<string, string> = {
  high: "border-l-dark-danger",
  medium: "border-l-dark-warn",
  low: "border-l-dark-border",
};

// ── Sub-components (module-level) ──────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sun;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-4 flex items-center gap-3">
      <div className="bg-cm-purple/15 rounded-lg p-2">
        <Icon className="w-5 h-5 text-cm-purple" />
      </div>
      <div>
        <p className="text-dark-muted text-xs">{label}</p>
        <p className="text-dark-text font-bold text-lg">{value}</p>
      </div>
    </div>
  );
}

function AccomplishmentsSection({
  accomplishments,
}: {
  accomplishments: DailyBriefing["accomplishments"];
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <CheckCircle2 className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">
          Yesterday&apos;s Accomplishments
        </h2>
      </div>
      <ul className="space-y-2 mb-4">
        {accomplishments.narrative.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-dark-text text-sm">
            <CheckCircle2 className="w-4 h-4 text-dark-success mt-0.5 shrink-0" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={Zap} label="Sessions" value={accomplishments.sessionCount} />
        <StatCard icon={GitCommit} label="Git Commits" value={accomplishments.gitCommits} />
        <StatCard icon={ListChecks} label="Tasks Done" value={accomplishments.tasksCompleted} />
      </div>
    </div>
  );
}

function TodaysFocusSection({
  items,
}: {
  items: DailyBriefing["todaysFocus"]["items"];
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <ListChecks className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">Today&apos;s Focus</h2>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center justify-between bg-dark-panel2 border border-dark-border rounded-lg p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-dark-text text-sm font-medium truncate">
                {item.title}
              </p>
              <p className="text-dark-muted text-xs mt-0.5">
                {item.project} &middot; {item.source}
              </p>
            </div>
            <span
              className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                PRIORITY_CLASSES[item.priority] || PRIORITY_CLASSES.Low
              }`}
            >
              {item.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueSection({
  revenue,
}: {
  revenue: DailyBriefing["revenue"];
}) {
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD" });

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <DollarSign className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">Revenue (Yesterday)</h2>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 text-center">
          <p className="text-dark-muted text-xs mb-1">Stripe</p>
          <p className="text-dark-success font-bold text-xl">{fmt(revenue.stripe.total)}</p>
          <p className="text-dark-muted text-xs mt-1">{revenue.stripe.charges} charges</p>
        </div>
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 text-center">
          <p className="text-dark-muted text-xs mb-1">Gumroad</p>
          <p className="text-dark-success font-bold text-xl">{fmt(revenue.gumroad.total)}</p>
          <p className="text-dark-muted text-xs mt-1">{revenue.gumroad.sales} sales</p>
        </div>
        <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4 text-center">
          <p className="text-dark-muted text-xs mb-1">Total</p>
          <p className="text-dark-success font-bold text-2xl">{fmt(revenue.grandTotal)}</p>
        </div>
      </div>
    </div>
  );
}

function SuggestedTasksSection({
  tasks,
}: {
  tasks: DailyBriefing["suggestedTasks"];
}) {
  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <Lightbulb className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">Suggested Tasks</h2>
      </div>
      <div className="space-y-3">
        {tasks.map((task, i) => (
          <div
            key={i}
            className="bg-dark-panel2 border border-dark-border rounded-lg p-3"
          >
            <p className="text-dark-text text-sm font-medium">{task.title}</p>
            <p className="text-dark-muted text-xs mt-1">{task.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function SantaReportSection({
  santa,
}: {
  santa: DailyBriefing["santaReport"];
}) {
  if (!santa.ran) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-cm-purple/15 rounded-lg p-2">
            <Moon className="w-5 h-5 text-cm-purple" />
          </div>
          <h2 className="text-dark-text font-bold text-lg">
            Overnight Agent (Santa)
          </h2>
        </div>
        <p className="text-dark-muted text-sm">
          Santa did not run last night.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <Moon className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">
          Overnight Agent (Santa)
        </h2>
      </div>
      <p className="text-dark-text text-sm leading-relaxed">{santa.summary}</p>
    </div>
  );
}

function ImportantMessagesSection({
  messages,
}: {
  messages: DailyBriefing["importantMessages"];
}) {
  if (messages.length === 0) return null;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <Mail className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">Important Messages</h2>
      </div>
      <div className="space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`border-l-4 ${
              MESSAGE_PRIORITY_CLASSES[msg.priority] ||
              MESSAGE_PRIORITY_CLASSES.low
            } bg-dark-panel2 rounded-r-lg p-3`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="bg-dark-panel border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
                {msg.source}
              </span>
              <span className="text-dark-muted text-xs">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <p className="text-dark-text text-sm mt-1">{msg.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HumanTaskFailuresSection({
  failures,
}: {
  failures: DailyBriefing["humanTaskFailures"];
}) {
  if (failures.length === 0) {
    return (
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="bg-dark-success/15 rounded-lg p-2">
            <CheckCircle2 className="w-5 h-5 text-dark-success" />
          </div>
          <div>
            <h2 className="text-dark-text font-bold text-lg">
              Human Task Failures
            </h2>
            <p className="text-dark-muted text-sm">
              No failures. All automated handoffs succeeded.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-dark-danger/15 rounded-lg p-2">
          <AlertTriangle className="w-5 h-5 text-dark-danger" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">
          Human Task Failures
        </h2>
      </div>
      <div className="space-y-3">
        {failures.map((f, i) => (
          <div
            key={i}
            className="border-l-4 border-l-dark-danger bg-dark-panel2 rounded-r-lg p-3"
          >
            <p className="text-dark-text text-sm font-medium">{f.task}</p>
            <p className="text-dark-danger text-xs mt-1">{f.error}</p>
            <p className="text-dark-muted text-xs mt-1">
              {new Date(f.timestamp).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PassiveIdeaSection({
  idea,
}: {
  idea: DailyBriefing["topPassiveIdea"];
}) {
  if (!idea) return null;

  return (
    <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-cm-purple/15 rounded-lg p-2">
          <Lightbulb className="w-5 h-5 text-cm-purple" />
        </div>
        <h2 className="text-dark-text font-bold text-lg">
          Top Passive Income Idea
        </h2>
      </div>
      <div className="bg-dark-panel2 border border-dark-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-dark-text font-bold">{idea.title}</h3>
          <span className="bg-dark-panel border border-dark-border text-dark-muted rounded-full px-2 py-0.5 text-xs">
            {idea.difficulty}
          </span>
        </div>
        <p className="text-dark-text text-sm leading-relaxed mb-3">
          {idea.description}
        </p>
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-dark-success" />
          <span className="text-dark-success text-sm font-medium">
            {idea.potentialIncome}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────

export default function DailyBriefingPage() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBriefing = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/daily-briefing");
      if (!res.ok) throw new Error(`Failed to fetch briefing (${res.status})`);
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBriefing();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-cm-purple animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <AlertCircle className="w-8 h-8 text-dark-danger" />
        <p className="text-dark-danger text-sm">{error}</p>
        <button
          onClick={fetchBriefing}
          className="bg-cm-purple text-white rounded-lg px-4 py-2 text-sm hover:bg-cm-purple/90 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-dark-panel border border-dark-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-cm-purple/15 rounded-lg p-2">
              <Sun className="w-6 h-6 text-cm-purple" />
            </div>
            <div>
              <h1 className="text-dark-text font-bold text-2xl tracking-tight">
                Daily Briefing
              </h1>
              <p className="text-dark-muted text-sm">
                {new Date(briefing.date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-dark-muted text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(briefing.generatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={fetchBriefing}
              className="bg-dark-panel2 border border-dark-border text-dark-muted rounded-lg p-2 hover:text-dark-text transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Accomplishments */}
      <AccomplishmentsSection accomplishments={briefing.accomplishments} />

      {/* Today's Focus */}
      <TodaysFocusSection items={briefing.todaysFocus.items} />

      {/* Revenue */}
      <RevenueSection revenue={briefing.revenue} />

      {/* Suggested Tasks */}
      <SuggestedTasksSection tasks={briefing.suggestedTasks} />

      {/* Santa Report */}
      <SantaReportSection santa={briefing.santaReport} />

      {/* Important Messages */}
      <ImportantMessagesSection messages={briefing.importantMessages} />

      {/* Human Task Failures */}
      <HumanTaskFailuresSection failures={briefing.humanTaskFailures} />

      {/* Top Passive Income Idea */}
      <PassiveIdeaSection idea={briefing.topPassiveIdea} />
    </div>
  );
}
