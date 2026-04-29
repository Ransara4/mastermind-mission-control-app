"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  HardDrive,
  Sparkles,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckSquare,
} from "lucide-react";

interface DiskStats {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  percentUsed: number;
}

interface MacCleanerData {
  diskStats: DiskStats | null;
  lastRun: {
    timestamp: string;
    bytes_freed: number;
    items_cleaned: { path: string; size_mb: number; reason: string }[];
    errors: string[];
    duration_ms: number;
  } | null;
}

function formatGb(bytes: number): string {
  return (bytes / (1024 * 1024 * 1024)).toFixed(1);
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function DiskHealthWidget() {
  const [data, setData] = useState<MacCleanerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mac-cleaner")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData({ diskStats: json.diskStats, lastRun: json.lastRun });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-dark-panel rounded-lg border border-dark-border p-4 animate-pulse">
        <div className="h-4 bg-dark-panel2 rounded w-24 mb-3" />
        <div className="h-8 bg-dark-panel2/70 rounded w-32 mb-2" />
        <div className="h-3 bg-dark-panel2/50 rounded w-full" />
      </div>
    );
  }

  const disk = data?.diskStats;
  const lastRun = data?.lastRun;

  if (!disk) {
    return (
      <Link
        href="/app/mac-cleaner"
        className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:border-cm-purple transition-colors block"
      >
        <div className="flex items-center gap-2 text-sm text-dark-muted">
          <HardDrive className="w-4 h-4" />
          <span>Disk Health</span>
        </div>
        <p className="text-sm text-dark-muted mt-2">No data available</p>
      </Link>
    );
  }

  const freeGb = parseFloat(formatGb(disk.freeBytes));
  const freePercent = 100 - disk.percentUsed;
  const gaugeColor =
    freePercent > 25
      ? "bg-green-500"
      : freePercent > 15
      ? "bg-yellow-500"
      : "bg-dark-danger";
  const gaugeBg =
    freePercent > 25
      ? "bg-green-500/20"
      : freePercent > 15
      ? "bg-yellow-500/20"
      : "bg-dark-danger/20";

  return (
    <Link
      href="/app/mac-cleaner"
      className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:border-cm-purple transition-colors block"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm text-dark-muted">
          <HardDrive className="w-4 h-4" />
          <span className="font-medium text-dark-text">Disk Health</span>
        </div>
        {freeGb < 10 ? (
          <AlertCircle className="w-4 h-4 text-dark-danger" />
        ) : freeGb < 20 ? (
          <AlertTriangle className="w-4 h-4 text-dark-warn" />
        ) : null}
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-2xl font-bold text-dark-text">
          {formatGb(disk.freeBytes)} GB
        </span>
        <span className="text-xs text-dark-muted">
          free of {formatGb(disk.totalBytes)} GB
        </span>
      </div>
      <div className={`w-full h-2.5 rounded-full ${gaugeBg} overflow-hidden mb-2`}>
        <div
          className={`h-full rounded-full ${gaugeColor} transition-all duration-500`}
          style={{ width: `${disk.percentUsed}%` }}
        />
      </div>
      {lastRun && (
        <div className="flex items-center gap-1 text-xs text-dark-muted">
          <Clock className="w-3 h-3" />
          Cleaned {formatRelativeTime(lastRun.timestamp)}
        </div>
      )}
    </Link>
  );
}

export default function AppIndex() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-cm-purple/10 via-dark-panel to-dark-panel rounded-xl p-6">
        <h1 className="text-2xl font-bold tracking-tight text-dark-text">Dashboard</h1>
        <p className="text-sm text-dark-muted mt-1">Quick overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Disk Health Widget */}
        <DiskHealthWidget />

        {/* Tasks shortcut */}
        <Link
          href="/app/tasks"
          className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:border-cm-purple transition-colors block"
        >
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-2">
            <CheckSquare className="w-4 h-4" />
            <span className="font-medium text-dark-text">Tasks</span>
          </div>
          <p className="text-sm text-dark-muted">View and manage your task board</p>
        </Link>

        {/* Agents shortcut */}
        <Link
          href="/app/office"
          className="bg-dark-panel rounded-lg border border-dark-border p-4 hover:border-cm-purple transition-colors block"
        >
          <div className="flex items-center gap-2 text-sm text-dark-muted mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="font-medium text-dark-text">Office Space</span>
          </div>
          <p className="text-sm text-dark-muted">Agent status and management</p>
        </Link>
      </div>
    </div>
  );
}
