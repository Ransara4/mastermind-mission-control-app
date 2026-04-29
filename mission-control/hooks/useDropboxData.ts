"use client";

import { useState, useEffect, useCallback } from "react";

export interface DropboxStatus {
  agentId: string;
  status: string;
  lastRun: string | null;
  lastResult: string | null;
  lastMessage: string;
  errorCount: number;
}

export interface DropboxSyncPair {
  id: string;
  localPath: string;
  dropboxPath: string;
  direction: string;
  enabled: boolean;
  description: string;
}

export interface DropboxConfig {
  enabled: boolean;
  syncPairs: DropboxSyncPair[];
  watchDirectories: Array<{
    id: string;
    localPath: string;
    dropboxPath: string;
    extensions: string[];
    enabled: boolean;
    description: string;
  }>;
  shareDefaults: {
    requestedVisibility: string;
  };
  activityLogMax: number;
}

export interface DropboxActivity {
  timestamp: string;
  action: string;
  files: string[];
  result: string;
  details: string;
}

export interface DropboxAuth {
  hasRefreshToken: boolean;
  hasAppKey: boolean;
  connected: boolean;
}

export interface DropboxAccount {
  name: string;
  email: string;
  accountType: string;
  profilePhotoUrl: string | null;
}

export interface DropboxSpaceUsage {
  used: number;
  allocated: number;
  percentUsed: number;
}

export interface DropboxFile {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number | null;
  modified: string | null;
}

export interface DropboxData {
  status: DropboxStatus;
  config: DropboxConfig;
  activity: DropboxActivity[];
  stats: {
    totalSyncs: number;
    totalFilesSynced: number;
    sharedLinks: number;
    totalActivities: number;
  };
  auth: DropboxAuth;
  account: DropboxAccount | null;
  spaceUsage: DropboxSpaceUsage | null;
  recentFiles: DropboxFile[];
}

export function useDropboxData() {
  const [data, setData] = useState<DropboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/dropbox");
      if (!response.ok) throw new Error("Failed to load Dropbox data");
      const result: DropboxData = await response.json();
      setData(result);
    } catch (err) {
      console.error("Dropbox fetch error:", err);
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

export function useDropboxBrowser() {
  const [currentPath, setCurrentPath] = useState("");
  const [entries, setEntries] = useState<DropboxFile[]>([]);
  const [browsing, setBrowsing] = useState(false);
  const [browseError, setBrowseError] = useState<string | null>(null);

  const browseTo = useCallback(async (folderPath: string) => {
    try {
      setBrowsing(true);
      setBrowseError(null);
      const params = new URLSearchParams({ action: "browse", path: folderPath });
      const res = await fetch(`/api/dropbox?${params}`);
      if (!res.ok) throw new Error("Failed to browse folder");
      const result = await res.json();
      setEntries(result.entries || []);
      setCurrentPath(folderPath);
    } catch (err) {
      setBrowseError(err instanceof Error ? err.message : "Browse failed");
    } finally {
      setBrowsing(false);
    }
  }, []);

  const goUp = useCallback(() => {
    if (!currentPath) return;
    const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "";
    browseTo(parent);
  }, [currentPath, browseTo]);

  const getFileLink = useCallback(async (filePath: string): Promise<string | null> => {
    try {
      const params = new URLSearchParams({ action: "link", path: filePath });
      const res = await fetch(`/api/dropbox?${params}`);
      if (!res.ok) return null;
      const result = await res.json();
      return result.link || null;
    } catch {
      return null;
    }
  }, []);

  return { currentPath, entries, browsing, browseError, browseTo, goUp, getFileLink };
}
