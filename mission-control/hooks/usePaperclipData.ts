import { useState, useEffect, useCallback } from "react";
import { useMCRefreshInterval } from "@/hooks/useMCRefreshInterval";

interface PaperclipData {
  status: "running" | "down";
  url: string;
  uiUrl?: string;
  health?: Record<string, unknown>;
  companies?: Array<Record<string, unknown>>;
  error?: string;
}

export function usePaperclipData() {
  const refreshMs = useMCRefreshInterval();
  const [data, setData] = useState<PaperclipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/paperclip");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, refreshMs);
    return () => clearInterval(interval);
  }, [refresh, refreshMs]);

  return { data, loading, error, refresh };
}
