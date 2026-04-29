"use client";

import { useEffect, useState, useRef } from "react";

// ── Helpers ───────────────────────────────────────────────────────

function barColor(pct: number): string {
  if (pct >= 90) return "var(--color-danger, #ef4444)";
  if (pct >= 70) {
    // interpolate from cm-purple toward orange, then red over 70–90%
    const t = (pct - 70) / 20;
    const hue = Math.round(28 - t * 28);     // 28 = orange, 0 = red
    return `hsl(${hue}, 92%, 52%)`;
  }
  return "var(--color-purple)";              // theme purple
}

function labelColor(pct: number): string {
  if (pct >= 90) return "text-red-400";
  if (pct >= 70) return "text-orange-400";
  return "text-cm-purple";
}

// ── Component ─────────────────────────────────────────────────────

export default function ClaudeUsageBar() {
  const [utilization, setUtilization] = useState<number | null>(null);
  const [warn, setWarn]               = useState(false);  // pulse flag
  const prevPct                       = useRef<number | null>(null);
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchUsage = async () => {
    try {
      const res  = await fetch("/api/claude-usage");
      const json = await res.json();
      const pct: number | undefined = json?.five_hour?.utilization;
      if (typeof pct === "number") {
        // Trigger pulse when crossing a threshold for the first time
        const prev = prevPct.current;
        if (prev !== null && prev < 70 && pct >= 70) setWarn(true);
        if (prev !== null && prev < 90 && pct >= 90) setWarn(true);
        prevPct.current = pct;
        setUtilization(pct);
        // Clear pulse after 3s
        setTimeout(() => setWarn(false), 3000);
      }
    } catch {
      // Silently ignore — bar just stays at last known value
    }
  };

  useEffect(() => {
    fetchUsage();
    // Poll every 30 minutes
    timerRef.current = setInterval(fetchUsage, 30 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render until we have data
  if (utilization === null) return null;

  const pct   = Math.min(100, Math.max(0, utilization));
  const color = barColor(pct);
  const isHigh = pct >= 70;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center"
      style={{ height: "3px" }}
    >
      {/* Track */}
      <div className="absolute inset-0 bg-dark-sidebar opacity-60" />

      {/* Fill */}
      <div
        className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
        style={{
          width: `${pct}%`,
          background: pct >= 70
            ? `linear-gradient(to right, var(--color-purple), ${color})`
            : color,
        }}
      />

      {/* Percentage label — pinned to right of fill, or right edge if > 95% */}
      <div
        className={`absolute top-0 flex items-center transition-all duration-1000 ease-out ${warn ? "animate-pulse" : ""}`}
        style={{ left: `${Math.min(pct, 96)}%`, transform: "translateX(-100%)" }}
      >
        <span
          className={`text-[9px] font-mono font-dm-mono font-bold leading-none px-1 py-0.5 rounded-sm select-none ${labelColor(pct)} ${isHigh ? "bg-dark-bg/80" : "bg-transparent"}`}
          style={{ marginTop: "4px" }}  // nudge below the bar itself
        >
          {pct.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
