"use client";

import { useState, useEffect } from "react";
import { MCSettings, DEFAULT_SETTINGS } from "@/lib/mc-settings-types";

// Module-level cache so all consumers share one fetch
let cache: MCSettings | null = null;
let listeners: Array<(s: MCSettings) => void> = [];
let fetchPromise: Promise<MCSettings> | null = null;

async function fetchSettings(): Promise<MCSettings> {
  if (cache) return cache;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/mc-settings")
    .then(r => r.json())
    .then(data => {
      cache = { ...DEFAULT_SETTINGS, ...data };
      listeners.forEach(fn => fn(cache!));
      return cache!;
    })
    .catch(() => {
      fetchPromise = null;
      return { ...DEFAULT_SETTINGS };
    });
  return fetchPromise;
}

/** Invalidate cache — call after saving settings so consumers re-fetch */
export function invalidateSettingsCache() {
  cache = null;
  fetchPromise = null;
}

/**
 * useSettings() — read-only access to MC settings from any component.
 * Returns DEFAULT_SETTINGS immediately, then updates when loaded.
 *
 * Usage:
 *   const settings = useSettings();
 *   <td style={{ padding: settings.displayDensity === 'compact' ? '4px 8px' : '8px 12px' }}>
 */
export function useSettings(): MCSettings {
  const [settings, setSettings] = useState<MCSettings>(cache ?? DEFAULT_SETTINGS);

  useEffect(() => {
    if (cache) {
      setSettings(cache);
      return;
    }
    let mounted = true;
    listeners.push((s) => { if (mounted) setSettings(s); });
    fetchSettings();
    return () => {
      mounted = false;
      listeners = listeners.filter(fn => fn !== ((s: MCSettings) => { if (mounted) setSettings(s); }));
    };
  }, []);

  return settings;
}
