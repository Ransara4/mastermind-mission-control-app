"use client";

import { FileSearch, Clock } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { SeoAudit } from "@/hooks/useSeoData";

interface Props {
  audits: SeoAudit[];
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function gradeColor(grade: string): { text: string } {
  switch (grade) {
    case "A": return { text: "text-dark-success" };
    case "B": return { text: "text-dark-success" };
    case "C": return { text: "text-dark-warn" };
    case "D": return { text: "text-dark-muted" };
    case "F": return { text: "text-dark-danger" };
    default:  return { text: "text-dark-muted" };
  }
}

function scoreToGrade(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function gradeBadgeClass(grade: string): string {
  switch (grade) {
    case "A":
    case "B": return "bg-dark-success/20 text-dark-success";
    case "C": return "bg-dark-warn/20 text-dark-warn";
    case "D": return "bg-dark-panel2 text-dark-muted";
    case "F": return "bg-dark-danger/10 text-dark-danger";
    default:  return "bg-dark-panel2 text-dark-muted";
  }
}

function TrendArrow({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  if (current > previous) return <span className="text-dark-success font-semibold text-xs">&uarr;</span>;
  if (current < previous) return <span className="text-dark-danger font-semibold text-xs">&darr;</span>;
  return <span className="text-dark-muted font-semibold text-xs">&rarr;</span>;
}

interface ChartPoint { label: string; score: number; grade: string; }

function GradeTrendChart({ audits }: { audits: SeoAudit[] }) {
  const withScores = audits
    .filter((a) => a.score != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Fill a 30-day window — show actual runs as data points
  const last30 = withScores.filter((a) => {
    const daysAgo = (Date.now() - new Date(a.date).getTime()) / 86400000;
    return daysAgo <= 30;
  });

  if (last30.length < 1) return null;

  const chartData: ChartPoint[] = last30.map((a) => {
    const d = new Date(a.date);
    const grade = a.grade || scoreToGrade(a.score ?? 0);
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      score: a.score ?? 0,
      grade,
    };
  });

  const minScore = 0;
  const maxScore = 100;

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const g = payload.grade;
    const fill =
      g === "A" || g === "B" ? "#4ade80"
      : g === "C" ? "#facc15"
      : g === "F" ? "#f87171"
      : "#6b7280";
    return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="#1e1e2e" strokeWidth={2} />;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload as ChartPoint;
    return (
      <div className="bg-dark-panel2 border border-dark-border rounded-lg px-3 py-2 text-xs shadow-lg">
        <p className="font-medium text-dark-text">{d.label}</p>
        <p className="text-dark-muted">Score: <span className="font-bold text-dark-text">{d.score}/100</span></p>
        <p className="text-dark-muted">Grade: <span className={`font-bold ${gradeColor(d.grade).text}`}>{d.grade}</span></p>
      </div>
    );
  };

  return (
    <div className="mb-5">
      <p className="text-xs text-dark-muted mb-2 font-medium">Score trend — last 30 days</p>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fill: "#6b7280", fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={32}
          />
          <Tooltip content={<CustomTooltip />} />
          {[90, 80, 60].map((ref) => (
            <ReferenceLine
              key={ref}
              y={ref}
              stroke="#374151"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}
          <Line
            type="monotone"
            dataKey="score"
            stroke="#a855f7"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AuditHistory({ audits }: Props) {
  if (audits.length === 0) {
    return null;
  }

  const sorted = [...audits].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="bg-dark-panel rounded-xl border border-dark-border p-6">
      <h3 className="text-sm font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
        <FileSearch size={16} className="text-cm-purple" />
        Audit History
      </h3>

      <GradeTrendChart audits={audits} />

      <div className="space-y-1.5">
        {sorted.map((audit, idx) => {
          const score = audit.score ?? 0;
          const grade = audit.grade || scoreToGrade(score);
          const prevAudit = sorted[idx + 1];
          const prevScore = prevAudit?.score ?? null;

          return (
            <div
              key={audit.name}
              className="flex items-center gap-3 py-2 px-3 rounded-lg bg-dark-panel2 hover:bg-dark-panel2/80 transition-colors"
            >
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 ${gradeBadgeClass(grade)}`}>
                {grade}
              </span>
              <span className="text-sm font-mono font-semibold text-dark-text w-8 shrink-0">{score}</span>
              <TrendArrow current={score} previous={prevScore} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-dark-muted truncate">{audit.title || audit.name}</p>
                {((audit.critical && audit.critical > 0) || (audit.warnings && audit.warnings > 0)) && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {audit.critical != null && audit.critical > 0 && (
                      <span className="text-[10px] text-dark-danger font-medium">{audit.critical} critical</span>
                    )}
                    {audit.warnings != null && audit.warnings > 0 && (
                      <span className="text-[10px] text-dark-warn font-medium">{audit.warnings} warnings</span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-dark-muted shrink-0">
                <Clock size={11} />
                {timeAgo(audit.date)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
