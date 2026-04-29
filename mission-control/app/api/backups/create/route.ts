import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createHash } from 'crypto';
import os from "os";

const HOME = os.homedir();

const execAsync = promisify(exec);

const OPENCLAW_DIR = path.join(HOME, '.openclaw');
const BACKUPS_DIR = path.join(OPENCLAW_DIR, 'backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, tags = [], backupType = 'manual', retentionPolicy } = body;

    if (!description) {
      return NextResponse.json(
        { success: false, error: 'Description is required' },
        { status: 400 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `openclaw_${timestamp}.tar.gz`;
    const filepath = path.join(BACKUPS_DIR, filename);

    if (!fs.existsSync(OPENCLAW_DIR)) {
      return NextResponse.json(
        { success: false, error: '.openclaw directory not found' },
        { status: 500 }
      );
    }

    // Full .openclaw backup — excludes are BEFORE the source on macOS tar
    const tarCmd = [
      'tar -czf',
      `"${filepath}"`,
      '--exclude=backups',
      '--exclude=browser',
      '--exclude=workspace_backup_*',
      '--exclude=logs',
      '--exclude=node_modules',
      '--exclude=.next',
      '--exclude=.git',
      '--exclude=.DS_Store',
      '--exclude=tsconfig.tsbuildinfo',
      '--exclude=.venv',
      '--exclude=__pycache__',
      '--exclude=*.pyc',
      '--exclude=dist',
      '--exclude=.pnpm',
      '--exclude=agent-chrome',
      '--exclude=worktrees',
      '--exclude=lib',
      '-C', `"${HOME}"`,
      '.openclaw',
    ].join(' ');

    try {
      await execAsync(tarCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 });
    } catch (tarError) {
      console.error('Tar error:', tarError);
      return NextResponse.json(
        { success: false, error: 'Failed to create backup archive' },
        { status: 500 }
      );
    }

    if (!fs.existsSync(filepath)) {
      return NextResponse.json(
        { success: false, error: 'Backup file was not created' },
        { status: 500 }
      );
    }

    const stats = fs.statSync(filepath);
    const size = stats.size;

    if (size < 1024) {
      fs.unlinkSync(filepath);
      return NextResponse.json(
        { success: false, error: `Backup suspiciously small (${size} bytes) — removed` },
        { status: 500 }
      );
    }

    const checksum = await new Promise<string>((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = fs.createReadStream(filepath);
      stream.on('data', (chunk: Buffer) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });

    let fileCount = 0;
    try {
      const result = await execAsync(
        `find "${OPENCLAW_DIR}" -type f -not -path "*/node_modules/*" -not -path "*/backups/*" -not -path "*/.next/*" -not -path "*/.git/*" | wc -l`,
        { timeout: 15000 }
      );
      fileCount = parseInt(result.stdout.trim(), 10) || 0;
    } catch { /* non-critical */ }

    // Write metadata sidecar
    const metadata = {
      filename, description, tags, backupType,
      scope: 'full-openclaw', fileCount, size, checksum,
      compression: 'gzip',
      retentionPolicy: retentionPolicy || '30-days',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    fs.writeFileSync(filepath + '.meta.json', JSON.stringify(metadata, null, 2));

    return NextResponse.json({
      success: true,
      message: 'Full .openclaw backup created successfully',
      backup: {
        filename, filepath, size, description, tags, backupType,
        scope: 'full-openclaw', fileCount, checksum,
        compression: 'gzip', status: 'completed', isValid: true,
        retentionPolicy: retentionPolicy || '30-days',
      },
    });
  } catch (error) {
    console.error('Backup creation error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create backup' },
      { status: 500 }
    );
  }
}
