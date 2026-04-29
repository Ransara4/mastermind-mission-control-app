import { useState, useEffect, useCallback } from "react";

interface WrapUpStage {
  id: string;
  name: string;
  description: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  completedAt: string | null;
  notes: string;
}

interface WrapUpSession {
  _id: string;
  sessionDate: string;
  title: string;
  status: "open" | "completed";
  stages: WrapUpStage[];
  timecodes: { time: string; topic: string }[];
  chatHighlights: string[];
  chatRequests: { from: string; request: string; status: string }[];
  sharedLinks: { from: string; url: string; description: string }[];
  nextWeekTopic: string;
  nextWeekRequirements: string;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
}

export function useWrapUpData() {
  const [sessions, setSessions] = useState<WrapUpSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/cohorts/wrap-up");
      if (!res.ok) throw new Error("Failed to load sessions");
      const data = await res.json();
      setSessions(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const createSession = useCallback(
    async (sessionDate: string, title: string) => {
      const res = await fetch("/api/cohorts/wrap-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionDate, title }),
      });
      if (!res.ok) throw new Error("Failed to create session");
      await fetchSessions();
    },
    [fetchSessions]
  );

  const updateSession = useCallback(
    async (updates: Partial<WrapUpSession> & { _id: string }) => {
      const res = await fetch("/api/cohorts/wrap-up", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update session");
      await fetchSessions();
    },
    [fetchSessions]
  );

  const deleteSession = useCallback(
    async (_id: string) => {
      const res = await fetch("/api/cohorts/wrap-up", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id }),
      });
      if (!res.ok) throw new Error("Failed to delete session");
      await fetchSessions();
    },
    [fetchSessions]
  );

  return {
    sessions,
    loading,
    error,
    createSession,
    updateSession,
    deleteSession,
    refresh: fetchSessions,
  };
}
