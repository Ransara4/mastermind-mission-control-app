import { useState, useEffect } from 'react';

const DEFAULT_MS = 30_000;
let cached: number | null = null; // module-level cache so it's only fetched once per session

export function useMCRefreshInterval(): number {
  const [ms, setMs] = useState<number>(cached ?? DEFAULT_MS);

  useEffect(() => {
    if (cached !== null) { setMs(cached); return; }
    fetch('/api/mc-settings')
      .then(r => r.json())
      .then(d => {
        const interval = typeof d.refreshInterval === 'number' && d.refreshInterval > 0
          ? d.refreshInterval * 1000
          : DEFAULT_MS;
        cached = interval;
        setMs(interval);
      })
      .catch(() => {});
  }, []);

  return ms;
}
