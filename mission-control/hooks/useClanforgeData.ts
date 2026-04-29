import { useState, useEffect, useCallback } from "react";

interface ClanforgeData {
  status: {
    agent: string;
    status: string;
    lastRun: string | null;
    totalOrders: number;
  };
  stats: {
    totalOrders: number;
    totalRevenue: number;
    byStyle: Record<string, number>;
    byGame: Record<string, number>;
    byType: Record<string, number>;
  };
  recentOrders: Array<{
    id: string;
    teamName: string;
    type: string;
    style: string;
    game: string;
    colors: string[];
    cost: number;
    createdAt: string;
  }>;
  outputFiles: string[];
  config: {
    styles: string[];
    gameCategories: string[];
    pricing: { logo: number; banner: number; bundle: number };
  };
}

export function useClanforgeData() {
  const [data, setData] = useState<ClanforgeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/clanforge");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
