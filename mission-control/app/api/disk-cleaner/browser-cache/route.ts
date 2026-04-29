/**
 * API Route: Browser Cache Sizes
 * GET /api/mac-cleaner/browser-cache
 *
 * Returns current browser cache sizes without deleting anything.
 */

import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";

const HOME = os.homedir();

// ── Safety ────────────────────────────────────────────────────────

const SAFE_PATH_SEGMENTS = ["/Cache", "/cache2", "/GPUCache", "/LocalStorage", "/Code Cache"];

function isSafePath(dirPath: string): boolean {
  return SAFE_PATH_SEGMENTS.some((seg) => dirPath.includes(seg));
}

// ── Helpers ───────────────────────────────────────────────────────

interface CachePath {
  path: string;
  label: string;
}

interface BrowserDetail {
  sizeMb: number;
  paths: Array<{ path: string; sizeMb: number; label: string }>;
}

interface BrowserCacheResponse {
  success: boolean;
  browsers: {
    chrome: BrowserDetail;
    safari: BrowserDetail;
    firefox: BrowserDetail;
    brave: BrowserDetail;
    arc: BrowserDetail;
  };
  totalMb: number;
  scannedAt: string;
}

function dirExists(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function getDirSizeBytes(dirPath: string): number {
  try {
    const result = execSync(`du -sk "${dirPath}" 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 30000,
    });
    const kb = parseInt(result.split("\t")[0], 10);
    return isNaN(kb) ? 0 : kb * 1024;
  } catch {
    return 0;
  }
}

function findFirefoxCacheDirs(baseRelPath: string): CachePath[] {
  const baseDir = path.join(HOME, baseRelPath);
  const results: CachePath[] = [];
  if (!dirExists(baseDir)) return results;

  try {
    const profiles = fs.readdirSync(baseDir, { withFileTypes: true });
    for (const entry of profiles) {
      if (!entry.isDirectory()) continue;
      const cacheDir = path.join(baseDir, entry.name, "cache2");
      if (dirExists(cacheDir)) {
        results.push({ path: cacheDir, label: `Firefox ${entry.name} cache` });
      }
    }
  } catch {
    // skip on permission errors
  }
  return results;
}

// ── Browser path definitions ──────────────────────────────────────

function getChromePaths(): CachePath[] {
  const base = path.join(HOME, "Library/Application Support/Google/Chrome/Default");
  const paths: CachePath[] = [
    { path: path.join(base, "Cache"), label: "Default Cache" },
    { path: path.join(base, "Code Cache"), label: "Code Cache" },
    { path: path.join(base, "GPUCache"), label: "GPUCache" },
  ];
  const libCaches = path.join(HOME, "Library/Caches/Google/Chrome");
  if (dirExists(libCaches)) {
    paths.push({ path: libCaches, label: "Library Caches" });
  }
  return paths;
}

function getSafariPaths(): CachePath[] {
  return [
    { path: path.join(HOME, "Library/Caches/com.apple.Safari"), label: "Safari Caches" },
    { path: path.join(HOME, "Library/Safari/LocalStorage"), label: "LocalStorage" },
  ];
}

function getFirefoxPaths(): CachePath[] {
  return [
    ...findFirefoxCacheDirs("Library/Application Support/Firefox/Profiles"),
    ...findFirefoxCacheDirs("Library/Caches/Firefox/Profiles"),
  ];
}

function getBravePaths(): CachePath[] {
  return [
    { path: path.join(HOME, "Library/Application Support/BraveSoftware/Brave-Browser/Default/Cache"), label: "Default Cache" },
  ];
}

function getArcPaths(): CachePath[] {
  return [
    { path: path.join(HOME, "Library/Application Support/Arc/User Data/Default/Cache"), label: "Default Cache" },
  ];
}

// ── Scan logic ────────────────────────────────────────────────────

function scanBrowser(paths: CachePath[]): BrowserDetail {
  let totalBytes = 0;
  const foundPaths: BrowserDetail["paths"] = [];

  for (const entry of paths) {
    if (!dirExists(entry.path)) continue;
    if (!isSafePath(entry.path)) continue;

    const sizeBytes = getDirSizeBytes(entry.path);
    const sizeMb = Math.round((sizeBytes / (1024 * 1024)) * 100) / 100;
    totalBytes += sizeBytes;
    foundPaths.push({ path: entry.path, sizeMb, label: entry.label });
  }

  return {
    sizeMb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
    paths: foundPaths,
  };
}

// ── Route handler ─────────────────────────────────────────────────

export async function GET() {
  try {
    const chrome = scanBrowser(getChromePaths());
    const safari = scanBrowser(getSafariPaths());
    const firefox = scanBrowser(getFirefoxPaths());
    const brave = scanBrowser(getBravePaths());
    const arc = scanBrowser(getArcPaths());

    const totalMb = Math.round(
      (chrome.sizeMb + safari.sizeMb + firefox.sizeMb + brave.sizeMb + arc.sizeMb) * 100
    ) / 100;

    const response: BrowserCacheResponse = {
      success: true,
      browsers: { chrome, safari, firefox, brave, arc },
      totalMb,
      scannedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
