import { useState, useEffect, useCallback } from 'react';

export interface PromptPack {
  id: string;
  name: string;
  profession: string;
  promptCount: number;
  sections: string[];
  price: number;
  status: string;
  gumroadUrl: string | null;
  sales: number;
  revenue: number;
  rating: number | null;
  reviews: number;
  filePath: string;
  createdAt: number;
}

export interface Bundle {
  id: string;
  name: string;
  price: number;
  sales: number;
  revenue: number;
  gumroadUrl: string | null;
}

export interface Feedback {
  id: string;
  packId: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface PackStats {
  totalSales: number;
  totalRevenue: number;
  avgRating: number | null;
  feedbackCount: number;
}

export function usePromptPacks() {
  const [packs, setPacks] = useState<PromptPack[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [newPackIdeas, setNewPackIdeas] = useState<string[]>([]);
  const [stats, setStats] = useState<PackStats>({ totalSales: 0, totalRevenue: 0, avgRating: null, feedbackCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/prompt-packs');
      if (!res.ok) throw new Error('Failed to load prompt packs data');
      const data = await res.json();
      setPacks(data.packs || []);
      setBundles(data.bundles || []);
      setFeedback(data.feedback || []);
      setNewPackIdeas(data.newPackIdeas || []);
      setStats(data.stats || { totalSales: 0, totalRevenue: 0, avgRating: null, feedbackCount: 0 });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updatePack = async (id: string, updates: Partial<PromptPack>) => {
    const res = await fetch('/api/prompt-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update-pack', id, updates }),
    });
    if (!res.ok) throw new Error('Failed to update pack');
    await loadData();
  };

  const addFeedback = async (packId: string, rating: number, comment: string) => {
    const res = await fetch('/api/prompt-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-feedback', packId, rating, comment }),
    });
    if (!res.ok) throw new Error('Failed to add feedback');
    await loadData();
  };

  const addIdea = async (idea: string) => {
    const res = await fetch('/api/prompt-packs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add-idea', idea }),
    });
    if (!res.ok) throw new Error('Failed to add idea');
    await loadData();
  };

  return { packs, bundles, feedback, newPackIdeas, stats, isLoading, error, refresh: loadData, updatePack, addFeedback, addIdea };
}
