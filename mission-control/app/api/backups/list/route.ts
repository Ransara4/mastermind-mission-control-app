/**
 * API Route: List all backups
 * GET /api/backups/list
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs/promises';
import * as path from 'path';
import os from 'os';

export const dynamic = 'force-dynamic';

const WS = process.env.GET_SORTED_WORKSPACE || path.join(os.homedir(), "golden-claw");
const BACKUPS_DIR = path.join(WS, "backups");

interface Backup {
  _id: string;
  _creationTime: number;
  filename: string;
  filepath: string;
  size: number;
  description: string;
  tags: string[];
  backupType: string;
  compression: string;
  status: string;
  isValid: boolean;
  createdAt: number;
  updatedAt: number;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';

    // Ensure backups directory exists
    try {
      await fs.access(BACKUPS_DIR);
    } catch {
      // Directory doesn't exist, return empty list
      return NextResponse.json({
        success: true,
        backups: [],
        stats: {
          totalBackups: 0,
          totalSize: 0,
          lastBackupTime: null,
        },
      });
    }

    // Read all files in backups directory
    const files = await fs.readdir(BACKUPS_DIR);
    const backupFiles = files.filter(f => f.endsWith('.tar.gz'));

    // Load backup metadata
    const backups: Backup[] = [];
    let totalSize = 0;
    let lastBackupTime: number | null = null;

    for (const file of backupFiles) {
      const filepath = path.join(BACKUPS_DIR, file);
      const stats = await fs.stat(filepath);
      
      // Try to read metadata file
      const metaPath = filepath + '.meta.json';
      let metadata: any = {};
      try {
        const metaContent = await fs.readFile(metaPath, 'utf-8');
        metadata = JSON.parse(metaContent);
      } catch {
        // No metadata file, use defaults
        metadata = {
          description: file.replace('.tar.gz', ''),
          tags: [],
          backupType: 'manual',
        };
      }

      const createdAt = stats.mtimeMs;
      const backup: Backup = {
        _id: file.replace('.tar.gz', ''),
        _creationTime: createdAt,
        filename: file,
        filepath: filepath,
        size: stats.size,
        description: metadata.description || file.replace('.tar.gz', ''),
        tags: metadata.tags || [],
        backupType: metadata.backupType || 'manual',
        compression: 'gzip',
        status: 'completed',
        isValid: true,
        createdAt: createdAt,
        updatedAt: createdAt,
      };

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !backup.description.toLowerCase().includes(searchLower) &&
          !backup.tags.some(t => t.toLowerCase().includes(searchLower)) &&
          !backup.filename.toLowerCase().includes(searchLower)
        ) {
          continue;
        }
      }

      // Apply type filter
      if (filter !== 'all') {
        if (filter === 'today') {
          const today = new Date().setHours(0, 0, 0, 0);
          if (backup.createdAt < today) continue;
        } else if (filter === 'week') {
          const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
          if (backup.createdAt < weekAgo) continue;
        } else if (filter === 'manual' || filter === 'auto') {
          if (backup.backupType !== filter) continue;
        }
      }

      backups.push(backup);
      totalSize += backup.size;
      if (!lastBackupTime || backup.createdAt > lastBackupTime) {
        lastBackupTime = backup.createdAt;
      }
    }

    return NextResponse.json({
      success: true,
      backups,
      stats: {
        totalBackups: backups.length,
        totalSize,
        lastBackupTime,
      },
    });
  } catch (error) {
    console.error('[/api/backups/list] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to list backups',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
