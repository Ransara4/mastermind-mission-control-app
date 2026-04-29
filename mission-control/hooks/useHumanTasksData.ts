"use client";
import { useState, useEffect, useCallback } from "react";

interface AttemptData {
  count: number;
  lastAttempt: string | null;
  lastResult: string | null;
  researchNotes: string;
}

interface HumanCard {
  _id: string;
  title: string;
  description: string;
  labels: string[];
  order: number;
  priority?: string;
  attemptData: AttemptData;
}

interface Playbook {
  name: string;
  content: string;
}

interface LogEntry {
  file: string;
  content: string;
}

interface LastRun {
  timestamp: string;
  cardsProcessed: number;
  completed: number;
  partial: number;
  blocked: number;
}

export interface HumanTasksData {
  cards: HumanCard[];
  totalCards: number;
  lastRun: LastRun | null;
  playbooks: Playbook[];
  recentLogs: LogEntry[];
  stats: {
    totalAttempts: number;
    maxedOut: number;
  };
}

export function useHumanTasksData() {
  const [data, setData] = useState<HumanTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/human-tasks");
      if (!response.ok) throw new Error("Failed to load data");
      setData(await response.json());
    } catch (err) {
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
