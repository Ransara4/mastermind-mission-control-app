"use client";

import { useState, useEffect, useCallback } from "react";

export interface ZoomProcessedFile {
  original: string;
  renamed: string;
  meeting: string;
  date: string;
  processedAt: string;
}

export interface ZoomQueueItem {
  path: string;
  meeting: string;
  date: string;
  queuedAt: string;
}

export interface ZoomStatus {
  agentId: string;
  status: string;
  lastRun: string | null;
  lastResult: string | null;
  lastMessage: string;
  errorCount: number;
  enabled: boolean;
}

export interface ZoomConfig {
  recordingsDir: string;
  recordingsDirResolved: string;
  recordingsDirExists: boolean;
  renamingPattern: string;
  watchExtensions: string[];
  processedLogMax: number;
  enabled: boolean;
}

export interface ZoomData {
  status: ZoomStatus;
  config: ZoomConfig;
  processed: ZoomProcessedFile[];
  queue: ZoomQueueItem[];
  watcherRunning: boolean;
  stats: {
    totalProcessed: number;
    pendingInQueue: number;
    storageMB: number;
  };
}

export function useZoomData() {
  const [data, setData] = useState<ZoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/zoom");
      if (!response.ok) throw new Error("Failed to load Zoom data");
      const result: ZoomData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Zoom fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
