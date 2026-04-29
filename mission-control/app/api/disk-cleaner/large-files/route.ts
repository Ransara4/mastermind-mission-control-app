import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const MAX_DEPTH = 5;
const MAX_RESULTS = 500;
const DEFAULT_THRESHOLD_MB = 100;

const SCAN_DIRS = [
  path.join(HOME, 'Documents'),
  path.join(HOME, 'Desktop'),
  path.join(HOME, 'Downloads'),
  path.join(HOME, 'Movies'),
  path.join(HOME, 'Library', 'Application Support'),
  path.join(HOME, 'Library', 'Developer'),
];

interface LargeFile {
  path: string;
  size_mb: number;
  modified: string;
}

function walkDir(
  dirPath: string,
  thresholdBytes: number,
  depth: number,
  results: LargeFile[]
): void {
  if (depth > MAX_DEPTH || results.length >= MAX_RESULTS) {
    return;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (results.length >= MAX_RESULTS) {
      return;
    }

    if (entry.name.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      walkDir(fullPath, thresholdBytes, depth + 1, results);
    } else if (entry.isFile()) {
      let stat: fs.Stats;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.size >= thresholdBytes) {
        results.push({
          path: fullPath,
          size_mb: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const thresholdParam = searchParams.get('threshold');
    const thresholdMb =
      thresholdParam && !isNaN(Number(thresholdParam)) && Number(thresholdParam) > 0
        ? Number(thresholdParam)
        : DEFAULT_THRESHOLD_MB;

    const thresholdBytes = thresholdMb * 1024 * 1024;
    const results: LargeFile[] = [];

    for (const dir of SCAN_DIRS) {
      if (results.length >= MAX_RESULTS) {
        break;
      }

      try {
        fs.accessSync(dir, fs.constants.R_OK);
      } catch {
        continue;
      }

      walkDir(dir, thresholdBytes, 0, results);
    }

    results.sort((a, b) => b.size_mb - a.size_mb);
    const files = results.slice(0, MAX_RESULTS);
    const totalSize = Math.round(files.reduce((sum, f) => sum + f.size_mb, 0) * 100) / 100;

    return NextResponse.json({
      success: true,
      files,
      totalSize,
      scannedAt: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
