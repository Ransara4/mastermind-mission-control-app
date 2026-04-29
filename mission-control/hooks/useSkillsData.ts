"use client";

import { useState, useEffect, useCallback } from "react";
import type { SkillsDashboard } from "@/lib/skills-types";

export function useSkillsData() {
  const [data, setData] = useState<SkillsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/skills/registry");
      if (!response.ok) throw new Error("Failed to load skills data");

      const result: SkillsDashboard = await response.json();
      setData(result);
    } catch (err) {
      console.error("Skills fetch error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSkill = useCallback(
    async (action: "add" | "remove" | "update", skill: Record<string, unknown>) => {
      try {
        const response = await fetch("/api/skills/registry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, skill }),
        });
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || "Failed to update skill");
        }
        await fetchData();
      } catch (err) {
        throw err;
      }
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData,
    updateSkill,
  };
}
