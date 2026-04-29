import { useState, useEffect, useCallback } from 'react';

export interface PassiveIdea {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'new' | 'researching' | 'validated' | 'building' | 'live' | 'rejected';
  potentialMonthlyIncome: { low: number; high: number };
  difficulty: 'Easy' | 'Medium' | 'Hard';
  automationRating: number;
  manualSteps: string;
  manualTimeEstimate: string;
  realism: number;
  source: string;
  sourceUrl?: string;
  startupCost: string;
  timeToFirstRevenue: string;
  tags: string[];
  notes: string;
  instructionsForClaude: string;
  createdAt: number;
  updatedAt: number;
}

export function usePassiveIdeas() {
  const [ideas, setIdeas] = useState<PassiveIdea[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [lastResearchRun, setLastResearchRun] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/passive-ideas');
      if (!res.ok) throw new Error('Failed to load ideas');
      const data = await res.json();
      setIdeas(data.ideas || []);
      setSources(data.sources || []);
      setLastResearchRun(data.lastResearchRun);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createIdea = async (idea: Partial<PassiveIdea>) => {
    const res = await fetch('/api/passive-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', ...idea }),
    });
    if (!res.ok) throw new Error('Failed to create idea');
    const newIdea = await res.json();
    setIdeas(prev => [newIdea, ...prev]);
    return newIdea;
  };

  const updateIdea = async (id: string, updates: Partial<PassiveIdea>) => {
    const res = await fetch('/api/passive-ideas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, updates }),
    });
    if (!res.ok) throw new Error('Failed to update idea');
    const updated = await res.json();
    setIdeas(prev => prev.map(i => i._id === id ? updated : i));
    return updated;
  };

  const deleteIdea = async (id: string) => {
    const res = await fetch('/api/passive-ideas', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error('Failed to delete idea');
    setIdeas(prev => prev.filter(i => i._id !== id));
  };

  const sendToTasks = async (id: string) => {
    const res = await fetch('/api/passive-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send-to-tasks', id }),
    });
    if (!res.ok) throw new Error('Failed to send to tasks');
    const result = await res.json();
    setIdeas(prev => prev.map(i => i._id === id ? { ...i, status: 'building' as const, updatedAt: Date.now() } : i));
    return result;
  };

  return {
    ideas, sources, lastResearchRun, isLoading, error,
    refresh: loadData, createIdea, updateIdea, deleteIdea, sendToTasks,
  };
}
