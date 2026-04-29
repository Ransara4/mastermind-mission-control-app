/**
 * API Route: Restore a backup
 * POST /api/backups/restore
 *
 * Strategy: MC can't restore itself (it deletes its own files).
 * Instead, we write a standalone shell script to /tmp and run it
 * in the background. The script:
 *   1. Creates a safety backup
 *   2. Extracts the backup archive (overwriting existing files)
 *   3. Removes stray files not in the backup
 *   4. Reinstalls node_modules if needed
 *   5. Restarts Mission Control via launchd
 */

import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from "os";

const HOME = os.homedir();

const execAsync = promisify(exec);

const OPENCLAW_DIR = path.join(HOME, '.openclaw');
const BACKUPS_DIR = path.join(OPENCLAW_DIR, 'backups');
const RESTORE_LOG = path.join(OPENCLAW_DIR, 'logs', 'restore.log');
const RESTORE_STATUS = '/tmp/openclaw-restore-status.json';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { backupId, backupFilepath, createSafetyBackup = true } = body;

    // Resolve backup file path
    let resolvedPath: string;
    if (backupFilepath) {
      resolvedPath = path.isAbsolute(backupFilepath)
        ? backupFilepath
        : path.join(BACKUPS_DIR, backupFilepath);
    } else if (backupId) {
      resolvedPath = path.join(BACKUPS_DIR, backupId + '.tar.gz');
    } else {
      return NextResponse.json(
        { success: false, error: 'backupId or backupFilepath is required' },
        { status: 400 }
      );
    }

    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { success: false, error: `Backup file not found: ${resolvedPath}` },
        { status: 404 }
      );
    }

    // Detect backup format
    let backupType = 'workspace';
    try {
      const { stdout } = await execAsync(
        `tar -tzf "${resolvedPath}" | head -3`,
        { timeout: 10000 }
      );
      if (stdout.includes('.openclaw/')) {
        backupType = 'full';
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Failed to read backup archive' },
        { status: 500 }
      );
    }

    const operationId = `restore-${Date.now()}`;
    const targetDir = backupType === 'full' ? HOME : path.join(OPENCLAW_DIR, 'workspace');

    // Write the restore script to /tmp (survives MC restart)
    const scriptPath = `/tmp/openclaw-restore-${operationId}.sh`;
    const safetyFilename = `pre-restore_${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}.tar.gz`;
    const safetyPath = path.join(BACKUPS_DIR, safetyFilename);

    const script = `#!/bin/bash
set -e
exec > "${RESTORE_LOG}" 2>&1

echo '{"status":"running","step":"Starting restore...","percent":0}' > "${RESTORE_STATUS}"
echo "[$(date)] Restore started: ${path.basename(resolvedPath)} (${backupType})"

# Step 1: Safety backup
${createSafetyBackup ? `
echo '{"status":"running","step":"Creating safety backup...","percent":10}' > "${RESTORE_STATUS}"
echo "[$(date)] Creating safety backup..."
tar -czf "${safetyPath}" \\
  --exclude=backups --exclude=browser --exclude=node_modules \\
  --exclude=.next --exclude=.git --exclude=logs --exclude=.DS_Store \\
  -C "${HOME}" .openclaw 2>/dev/null || true
echo "[$(date)] Safety backup created: ${safetyFilename}"
` : '# Safety backup skipped'}

# Step 2: Get list of files in backup (for stray file detection)
echo '{"status":"running","step":"Analyzing backup...","percent":20}' > "${RESTORE_STATUS}"
tar -tzf "${resolvedPath}" | sort > /tmp/openclaw-backup-filelist.txt
ENTRY_COUNT=$(wc -l < /tmp/openclaw-backup-filelist.txt | tr -d ' ')
echo "[$(date)] Archive has $ENTRY_COUNT entries"

# SAFETY CHECK: abort if archive appears empty
if [ "$ENTRY_COUNT" -lt 10 ]; then
  echo "[$(date)] ABORT: Archive has too few entries ($ENTRY_COUNT) — refusing to restore"
  echo '{"status":"failed","step":"Backup archive is empty or corrupt. Aborting.","percent":0}' > "${RESTORE_STATUS}"
  exit 1
fi

# Step 3: Extract backup (overwrites existing files)
echo '{"status":"running","step":"Extracting backup...","percent":40}' > "${RESTORE_STATUS}"
echo "[$(date)] Extracting to ${targetDir}..."
tar -xzf "${resolvedPath}" -C "${targetDir}"
echo "[$(date)] Extraction complete"

# Step 4: Remove stray files in workspace that aren't in the backup
echo '{"status":"running","step":"Cleaning stray files...","percent":60}' > "${RESTORE_STATUS}"
WORKSPACE="${OPENCLAW_DIR}/workspace"
REMOVED=0

# Get current workspace files, excluding preserved directories
find "$WORKSPACE" -mindepth 1 -type f \\
  -not -path "*/node_modules/*" \\
  -not -path "*/.next/*" \\
  -not -path "*/.git/*" \\
  -not -path "*/backups/*" \\
  -not -path "*/browser/*" \\
  -not -path "*/logs/*" \\
  2>/dev/null | sort > /tmp/openclaw-current-filelist.txt

# Build expected file paths from archive
if [ "${backupType}" = "full" ]; then
  # Full backup: paths are like .openclaw/workspace/foo -> $HOME/.openclaw/workspace/foo
  sed "s|^|${HOME}/|" /tmp/openclaw-backup-filelist.txt | sort > /tmp/openclaw-expected-filelist.txt
else
  sed "s|^|${targetDir}/|" /tmp/openclaw-backup-filelist.txt | sort > /tmp/openclaw-expected-filelist.txt
fi

# Find files in current that aren't in expected
comm -23 /tmp/openclaw-current-filelist.txt /tmp/openclaw-expected-filelist.txt > /tmp/openclaw-stray-files.txt

while IFS= read -r stray; do
  [ -z "$stray" ] && continue
  rm -f "$stray" 2>/dev/null && REMOVED=$((REMOVED + 1))
done < /tmp/openclaw-stray-files.txt

# Clean empty dirs
find "$WORKSPACE" -mindepth 1 -type d -empty \\
  -not -path "*/node_modules/*" \\
  -not -path "*/.next/*" \\
  -not -path "*/.git/*" \\
  -delete 2>/dev/null || true

echo "[$(date)] Removed $REMOVED stray files"

# Step 5: Recreate excluded directories that MC/gateway need
echo '{"status":"running","step":"Fixing directory structure...","percent":75}' > "${RESTORE_STATUS}"
mkdir -p "${OPENCLAW_DIR}/logs" "${OPENCLAW_DIR}/workspace/logs" 2>/dev/null || true

# Step 6: Reinstall node_modules if needed
echo '{"status":"running","step":"Checking dependencies...","percent":80}' > "${RESTORE_STATUS}"
MC_DIR="${OPENCLAW_DIR}/workspace/mission-control"
if [ -f "$MC_DIR/package.json" ] && [ ! -f "$MC_DIR/node_modules/.bin/next" ]; then
  echo "[$(date)] Reinstalling Mission Control dependencies..."
  cd "$MC_DIR" && /opt/homebrew/bin/npm install --ignore-scripts 2>&1 || true
fi

# Step 7: Restart Mission Control
echo '{"status":"running","step":"Restarting Mission Control...","percent":90}' > "${RESTORE_STATUS}"
echo "[$(date)] Restarting Mission Control..."
# Kill MC process directly — launchd KeepAlive will restart it automatically
pkill -f "next dev.*mission-control" 2>/dev/null || true
sleep 5
# Verify it came back
if ! pgrep -f "next dev.*mission-control" > /dev/null 2>&1; then
  # If launchd didn't restart it, try manually
  UID_NUM=$(id -u)
  launchctl bootout "gui/$UID_NUM" "${HOME}/Library/LaunchAgents/ai.openclaw.mission-control.plist" 2>/dev/null || true
  sleep 1
  launchctl bootstrap "gui/$UID_NUM" "${HOME}/Library/LaunchAgents/ai.openclaw.mission-control.plist" 2>/dev/null || true
fi

echo '{"status":"completed","step":"Restore complete!","percent":100}' > "${RESTORE_STATUS}"
echo "[$(date)] Restore completed successfully"

# Cleanup temp files
rm -f /tmp/openclaw-backup-filelist.txt /tmp/openclaw-current-filelist.txt
rm -f /tmp/openclaw-expected-filelist.txt /tmp/openclaw-stray-files.txt
rm -f "${scriptPath}"
`;

    fs.writeFileSync(scriptPath, script, { mode: 0o755 });

    // Write initial status
    fs.writeFileSync(RESTORE_STATUS, JSON.stringify({
      status: 'starting',
      step: 'Preparing restore...',
      percent: 0,
      operationId,
    }));

    // Launch the script in the background (detached, won't die with MC)
    exec(`nohup bash "${scriptPath}" &`);

    return NextResponse.json({
      success: true,
      operationId,
      message: 'Restore initiated — MC will restart when done. Check back in ~30 seconds.',
    });
  } catch (error) {
    console.error('[/api/backups/restore] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate restore',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
