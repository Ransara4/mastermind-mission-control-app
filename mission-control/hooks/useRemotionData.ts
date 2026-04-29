import { useState, useEffect, useCallback } from "react";

export interface RemotionJob {
  id: string;
  template: string;
  props: Record<string, any>;
  outputFile: string;
  status: string;
  createdAt: string;
  completedAt: string | null;
  error: string | null;
  width: number;
  height: number;
  fps: number;
  durationInFrames: number;
  durationSeconds: number;
}

export interface RemotionData {
  status: {
    name: string;
    version: string;
    status: string;
    lastUpdated: string;
    totalRenders: number;
    lastRender: string | null;
    lastError: string | null;
  };
  jobs: RemotionJob[];
  stats: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    outputFiles: number;
    totalSizeMB: number;
  };
  templates: string[];
  remotionInstalled: boolean;
}

export function useRemotionData() {
  const [data, setData] = useState<RemotionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/remotion");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
