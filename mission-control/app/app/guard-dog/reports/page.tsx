"use client";

import { useMemo } from "react";
import {
  BarChart3,
  Shield,
  AlertOctagon,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useGuardDogData } from "@/hooks/useGuardDogData";

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export default function ReportsPage() {
  const { data, loading } = useGuardDogData();

  const weeklyReports = useMemo(() => {
    if (!data?.dailyTrend.length) return [];
    // Group daily data into weekly summaries
    const weeks: Record<string, { start: string; end: string; bark: number; whine: number; silent: number; total: number }> = {};
    for (const day of data.dailyTrend) {
      const d = new Date(day.date + "T00:00:00");
      // Get Monday of that week
      const dayOfWeek = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = monday.toISOString().split("T")[0];
      if (!weeks[weekKey]) {
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        weeks[weekKey] = { start: weekKey, end: sunday.toISOString().split("T")[0], bark: 0, whine: 0, silent: 0, total: 0 };
      }
      weeks[weekKey].bark += day.bark;
      weeks[weekKey].whine += day.whine;
      weeks[weekKey].silent += day.silent;
      weeks[weekKey].total += day.bark + day.whine + day.silent;
    }
    return Object.values(weeks).sort((a, b) => b.start.localeCompare(a.start));
  }, [data]);

  const threatSummary = useMemo(() => {
    if (!data?.threatIntel.length) return null;
    const bySeverity: Record<string, number> = {};
    for (const t of data.threatIntel) {
      bySeverity[t.severity] = (bySeverity[t.severity] || 0) + 1;
    }
    return bySeverity;
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-cm-purple" size={32} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-dark-text">
        Scan Reports
      </h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-cm-purple" />
            <span className="text-xs font-medium text-dark-muted uppercase tracking-wider">Scan Coverage</span>
          </div>
          <p className="text-2xl font-bold text-dark-text">{data.dailyTrend.length}</p>
          <p className="text-xs text-dark-muted mt-1">days with scan data</p>
        </div>
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-cm-purple" />
            <span className="text-xs font-medium text-dark-muted uppercase tracking-wider">Total Scanned</span>
          </div>
          <p className="text-2xl font-bold text-dark-text">{data.stats.totalScans.toLocaleString()}</p>
          <p className="text-xs text-dark-muted mt-1">packages analyzed</p>
        </div>
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <div className="flex items-center gap-2 mb-3">
            <Shield size={16} className="text-cm-purple" />
            <span className="text-xs font-medium text-dark-muted uppercase tracking-wider">Threat Intel</span>
          </div>
          <p className="text-2xl font-bold text-dark-text">{data.threatIntel.length}</p>
          <p className="text-xs text-dark-muted mt-1">advisory matches</p>
        </div>
      </div>

      {/* Threat intel severity breakdown */}
      {threatSummary && Object.keys(threatSummary).length > 0 && (
        <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
          <h3 className="text-sm font-semibold text-dark-text mb-3 flex items-center gap-2">
            <AlertOctagon size={16} className="text-dark-danger" />
            Threat Intel by Severity
          </h3>
          <div className="flex gap-3 flex-wrap">
            {["critical", "high", "medium", "low", "info"].map((sev) => {
              const count = threatSummary[sev] || 0;
              if (count === 0) return null;
              const color =
                sev === "critical" ? "text-dark-danger bg-dark-danger/10" :
                sev === "high" ? "text-dark-danger bg-dark-danger/10" :
                sev === "medium" ? "text-dark-warn bg-dark-warn/10" :
                "text-dark-muted bg-dark-panel2";
              return (
                <div key={sev} className={`px-3 py-2 rounded-lg ${color}`}>
                  <span className="text-lg font-bold">{count}</span>
                  <span className="text-xs ml-1.5 capitalize">{sev}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weekly reports */}
      <div className="bg-dark-panel rounded-xl border border-dark-border p-5">
        <h3 className="text-sm font-semibold text-dark-text mb-4 flex items-center gap-2">
          <BarChart3 size={16} className="text-cm-purple" />
          Weekly Scan Reports
        </h3>
        {weeklyReports.length === 0 ? (
          <p className="text-sm text-dark-muted text-center py-6">No scan data available</p>
        ) : (
          <div className="space-y-2">
            {weeklyReports.slice(0, 12).map((week) => {
              const barMax = Math.max(...weeklyReports.map((w) => w.total), 1);
              return (
                <div key={week.start} className="flex items-center gap-3 p-3 bg-dark-panel2 rounded-lg">
                  <div className="w-32 flex-shrink-0">
                    <p className="text-xs font-medium text-dark-text">
                      {formatDate(week.start)} — {formatDate(week.end)}
                    </p>
                  </div>
                  <div className="flex-1 flex items-center gap-1 h-5">
                    {week.silent > 0 && (
                      <div
                        className="h-full bg-dark-success/40 rounded-sm"
                        style={{ width: `${(week.silent / barMax) * 100}%` }}
                        title={`${week.silent} safe`}
                      />
                    )}
                    {week.whine > 0 && (
                      <div
                        className="h-full bg-dark-warn/60 rounded-sm"
                        style={{ width: `${(week.whine / barMax) * 100}%` }}
                        title={`${week.whine} suspicious`}
                      />
                    )}
                    {week.bark > 0 && (
                      <div
                        className="h-full bg-dark-danger/60 rounded-sm"
                        style={{ width: `${(week.bark / barMax) * 100}%` }}
                        title={`${week.bark} dangerous`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                    <span className="text-dark-success flex items-center gap-1"><CheckCircle size={10} /> {week.silent}</span>
                    <span className="text-dark-warn flex items-center gap-1"><AlertTriangle size={10} /> {week.whine}</span>
                    <span className="text-dark-danger flex items-center gap-1"><AlertOctagon size={10} /> {week.bark}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-dark-muted px-1">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-dark-success/40" /> Safe</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-dark-warn/60" /> Suspicious</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-dark-danger/60" /> Dangerous</span>
      </div>
    </div>
  );
}
