"use client";

import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { useWhoopData } from "@/hooks/useWhoopData";

function formatDuration(ms: number | undefined | null): string {
  if (!ms) return "0h 0m";
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${mins}m`;
}

function recoveryZone(score: number): { label: string; color: string; bg: string; ring: string; glow: string } {
  if (score >= 67) return { label: "Green", color: "var(--color-success)", bg: "rgba(22,163,74,0.08)", ring: "#22c55e", glow: "0 0 40px rgba(34,197,94,0.3)" };
  if (score >= 34) return { label: "Yellow", color: "#eab308", bg: "rgba(234,179,8,0.08)", ring: "#facc15", glow: "0 0 40px rgba(250,204,21,0.3)" };
  return { label: "Red", color: "var(--color-danger)", bg: "rgba(220,38,38,0.08)", ring: "#ef4444", glow: "0 0 40px rgba(239,68,68,0.3)" };
}

function CircularGauge({ value, max, color, size = 160, strokeWidth = 10, label, sublabel }: {
  value: number; max: number; color: string; size?: number; strokeWidth?: number; label: string; sublabel?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-4xl font-bold text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
          {typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(1)) : "—"}
        </span>
        {sublabel && <span className="text-xs text-dark-muted mt-0.5">{sublabel}</span>}
      </div>
      <span className="text-xs font-medium text-dark-muted mt-2 uppercase tracking-widest">{label}</span>
    </div>
  );
}

function MetricCard({ label, value, unit, highlight }: { label: string; value: string | number | null | undefined; unit?: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)" }}>
      <span className="text-[10px] font-semibold text-dark-muted uppercase tracking-widest mb-1">{label}</span>
      <span className={`text-2xl font-bold ${highlight ? "text-white" : "text-dark-text"}`} style={{ fontVariantNumeric: "tabular-nums" }}>
        {value ?? "—"}
      </span>
      {unit && <span className="text-[10px] text-dark-muted mt-0.5">{unit}</span>}
    </div>
  );
}

function SleepStageBar({ stages }: { stages: { light: number; deep: number; rem: number; awake: number } }) {
  const total = stages.light + stages.deep + stages.rem + stages.awake;
  if (total === 0) return null;
  const pct = (v: number) => ((v / total) * 100).toFixed(1) + "%";

  const items = [
    { key: "Awake", ms: stages.awake, color: "#6b7280" },
    { key: "Light", ms: stages.light, color: "#38bdf8" },
    { key: "REM", ms: stages.rem, color: "#a78bfa" },
    { key: "Deep", ms: stages.deep, color: "#6366f1" },
  ];

  return (
    <div className="w-full space-y-3">
      <div className="flex h-3 rounded-full overflow-hidden gap-[2px]">
        {items.map((s) =>
          s.ms > 0 ? (
            <div key={s.key} className="rounded-full" style={{ background: s.color, flex: s.ms }} />
          ) : null
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-1">
        {items.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-dark-muted">
            <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
            <span>{s.key}</span>
            <span className="font-medium text-dark-text">{formatDuration(s.ms)}</span>
            <span className="text-dark-muted">({pct(s.ms)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WhoopPage() {
  const { data, loading, error, refresh } = useWhoopData();

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px] bg-cm-dark">
        <Loader2 className="w-8 h-8 animate-spin text-dark-muted" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-4 bg-cm-dark">
        <AlertCircle className="w-8 h-8 text-dark-danger" />
        <p className="text-dark-danger text-sm">{error}</p>
        <button onClick={refresh} className="px-4 py-2 rounded-full text-sm font-medium text-white" style={{ background: "rgba(255,255,255,0.1)" }}>
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { recovery, sleep, strain, authenticated, timestamp } = data;
  const stages = sleep?.stage_summary;
  const zone = recovery ? recoveryZone(recovery.recovery_score) : null;
  const totalSleepMs = stages
    ? (stages.total_light_sleep_time_milli || 0) + (stages.total_slow_wave_sleep_time_milli || 0) + (stages.total_rem_sleep_time_milli || 0)
    : 0;

  return (
    <div className="min-h-full -m-6 p-6 overflow-auto bg-cm-dark" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white" opacity="0.9"/>
              <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white" opacity="0.9"/>
            </svg>
            <span className="text-xl font-bold tracking-tight text-white tracking-tight">WHOOP</span>
          </div>
          {zone && (
            <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ color: zone.color, background: zone.bg }}>
              {zone.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {timestamp && (
            <span className="text-[10px] text-dark-muted">
              {new Date(timestamp).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              {" · "}
              {new Date(timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
            </span>
          )}
          <button onClick={refresh} className="p-2 rounded-full hover:bg-white/5 transition" title="Refresh">
            <RefreshCw className="w-4 h-4 text-dark-muted" />
          </button>
        </div>
      </div>

      {!authenticated && (
        <div className="mb-6 p-4 rounded-2xl text-sm" style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)", color: "var(--color-warn)" }}>
          Not connected. Run <code className="bg-black/40 px-1.5 py-0.5 rounded text-xs font-mono font-dm-mono">node ~/.openclaw/workspace/agents/whoop/src/index.js auth</code>
        </div>
      )}

      {/* Top gauges row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Recovery */}
        <div className="rounded-3xl p-6 flex flex-col items-center relative" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="relative" style={zone ? { filter: `drop-shadow(${zone.glow})` } : {}}>
            <CircularGauge
              value={recovery?.recovery_score ?? 0}
              max={100}
              color={zone?.ring ?? "#555"}
              size={180}
              strokeWidth={12}
              label="Recovery"
              sublabel="%"
            />
          </div>
          {recovery && (
            <div className="grid grid-cols-3 gap-3 w-full mt-6">
              <div className="text-center">
                <span className="text-lg font-bold text-white">{recovery.hrv_rmssd_milli?.toFixed(0)}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">HRV ms</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{recovery.resting_heart_rate}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">RHR bpm</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{recovery.spo2_percentage?.toFixed(0) ?? "—"}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">SpO2 %</span>
              </div>
            </div>
          )}
          {!recovery && <p className="text-dark-muted text-sm mt-4">No data</p>}
        </div>

        {/* Strain */}
        <div className="rounded-3xl p-6 flex flex-col items-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ filter: "drop-shadow(0 0 30px rgba(59,130,246,0.2))" }}>
            <CircularGauge
              value={strain?.strain ?? 0}
              max={21}
              color="#3b82f6"
              size={180}
              strokeWidth={12}
              label="Strain"
              sublabel="/ 21"
            />
          </div>
          {strain && (
            <div className="grid grid-cols-3 gap-3 w-full mt-6">
              <div className="text-center">
                <span className="text-lg font-bold text-white">{strain.average_heart_rate}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Avg HR</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{strain.max_heart_rate}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Max HR</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{(strain.kilojoule / 4.184).toFixed(0)}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Cal</span>
              </div>
            </div>
          )}
          {!strain && <p className="text-dark-muted text-sm mt-4">No data</p>}
        </div>

        {/* Sleep summary */}
        <div className="rounded-3xl p-6 flex flex-col items-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div style={{ filter: "drop-shadow(0 0 30px rgba(139,92,246,0.2))" }}>
            <CircularGauge
              value={sleep?.sleep_performance_percentage ?? 0}
              max={100}
              color="#8b5cf6"
              size={180}
              strokeWidth={12}
              label="Sleep"
              sublabel="performance %"
            />
          </div>
          {sleep && (
            <div className="grid grid-cols-3 gap-3 w-full mt-6">
              <div className="text-center">
                <span className="text-lg font-bold text-white">{formatDuration(totalSleepMs)}</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Duration</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{sleep.sleep_efficiency_percentage?.toFixed(0)}%</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Efficiency</span>
              </div>
              <div className="text-center">
                <span className="text-lg font-bold text-white">{sleep.sleep_consistency_percentage?.toFixed(0)}%</span>
                <span className="block text-[10px] text-dark-muted uppercase tracking-wider">Consistency</span>
              </div>
            </div>
          )}
          {!sleep && <p className="text-dark-muted text-sm mt-4">No data</p>}
        </div>
      </div>

      {/* Sleep stages detail */}
      {stages && (
        <div className="rounded-3xl p-6 mb-8" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-sm font-semibold tracking-tight text-dark-text uppercase tracking-widest mb-5">Sleep Stages</h3>
          <SleepStageBar stages={{
            light: stages.total_light_sleep_time_milli,
            deep: stages.total_slow_wave_sleep_time_milli,
            rem: stages.total_rem_sleep_time_milli,
            awake: stages.total_awake_time_milli,
          }} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <MetricCard label="Time in Bed" value={formatDuration(stages.total_in_bed_time_milli)} />
            <MetricCard label="Sleep Cycles" value={stages.sleep_cycle_count} />
            <MetricCard label="Disturbances" value={stages.disturbance_count} />
            <MetricCard label="Resp. Rate" value={sleep?.respiratory_rate?.toFixed(1)} unit="breaths/min" />
          </div>
        </div>
      )}

      {/* Sleep Need breakdown */}
      {sleep?.sleep_needed && (
        <div className="rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-sm font-semibold tracking-tight text-dark-text uppercase tracking-widest mb-5">Sleep Need</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Baseline" value={formatDuration(sleep.sleep_needed.baseline_milli)} highlight />
            <MetricCard label="Sleep Debt" value={formatDuration(sleep.sleep_needed.need_from_sleep_debt_milli)} />
            <MetricCard label="From Strain" value={formatDuration(sleep.sleep_needed.need_from_recent_strain_milli)} />
            <MetricCard label="Nap Offset" value={formatDuration(sleep.sleep_needed.need_from_recent_nap_milli)} />
          </div>
        </div>
      )}

      {/* Skin temp if available */}
      {recovery?.skin_temp_celsius && (
        <div className="mt-6 rounded-3xl p-6" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <h3 className="text-sm font-semibold tracking-tight text-dark-text uppercase tracking-widest mb-3">Body Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Skin Temp" value={`${recovery.skin_temp_celsius.toFixed(1)}°`} unit="celsius" highlight />
          </div>
        </div>
      )}
    </div>
  );
}
