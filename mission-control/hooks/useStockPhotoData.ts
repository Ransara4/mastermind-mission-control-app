"use client";

import { useState, useEffect, useCallback } from "react";
import type { StockPhotoStats } from "@/lib/stock-photo-types";

export function useStockPhotoData() {
  const [data, setData] = useState<StockPhotoStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/stock-photo-ai");
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "Failed to load stock photo data");
      }
      const result: StockPhotoStats = await response.json();
      setData(result);
    } catch (err) {
      console.error("Stock Photo AI fetch error:", err);
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
