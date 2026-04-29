# Backups Page - Integration Guide

## Overview
This guide covers integration of the Mission Control Backups page with the existing OpenClaw backup infrastructure at `~/.openclaw/backups/`.

## Existing Backup Infrastructure

### Current Setup
- **Backup Directory**: `~/.openclaw/backups/`
- **Backup Script**: `~/.openclaw/workspace/ops/backup.sh`
- **Naming Convention**: `workspace_YYYYMMDD_HHMMSS.tar.gz`
- **Manual Backups**: Various manual backups already exist

### Existing Files (as of Feb 2026)
```
~/.openclaw/backups/
├── mastermind_COLD_EMAIL_CAMPAIGN_V1_COMPLETE_20260220_002241.tar.gz  (33 KB)
├── openclaw-fresh-install-2026-02-10.tar.gz                           (19 KB)
├── openclaw_backup_20260219_181417.tar.gz                              (17 KB)
├── openclaw_backup_Terminal_Fix_20260219_182812.tar.gz                 (17 KB)
└── workspace_after-folder-organization_20260220_125333.tar.gz          (1.7 MB)
```

---

## Integration Strategy

### 1. Filesystem Sync

**Challenge**: Existing backups in filesystem not in database

**Solution**: Automatic synchronization on page load

**Implementation**:

```typescript
// app/api/backups/list/route.ts
export async function GET() {
  const backupDir = "/Users/openclaw/.openclaw/backups";
  
  // 1. Scan filesystem
  const filesystemBackups = await scanBackupDirectory(backupDir);
  
  // 2. Get DB records
  const dbBackups = await convex.query(api.backups.list);
  
  // 3. Sync: Add missing files to DB
  const missingInDB = filesystemBackups.filter(
    fsBackup => !dbBackups.some(dbBackup => dbBackup.filename === fsBackup.filename)
  );
  
  for (const backup of missingInDB) {
    await convex.mutation(api.backups.create, {
      filename: backup.filename,
      filepath: backup.filepath,
      sizeBytes: backup.sizeBytes,
      createdBy: "cli", // Assume manual/CLI creation
    });
  }
  
  // 4. Mark missing files
  for (const dbBackup of dbBackups) {
    const existsInFS = filesystemBackups.some(
      fsBackup => fsBackup.filename === dbBackup.filename
    );
    
    if (!existsInFS && dbBackup.status !== "missing") {
      await convex.mutation(api.backups.update, {
        id: dbBackup._id,
        status: "missing",
      });
    }
  }
  
  // 5. Return merged list
  const mergedBackups = await convex.query(api.backups.list);
  
  return NextResponse.json({
    backups: mergedBackups,
    totalCount: mergedBackups.length,
    totalSize: mergedBackups.reduce((sum, b) => sum + b.sizeBytes, 0),
  });
}
```

---

### 2. Backup Script Integration

**Challenge**: Preserve existing `ops/backup.sh` behavior

**Solution**: Wrap script execution, add metadata

**Current Script** (`ops/backup.sh`):
```bash
#!/bin/bash
set -e

WORKSPACE="/Users/openclaw/.openclaw/workspace"
BACKUP_DIR="/Users/openclaw/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="${BACKUP_DIR}/workspace_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_NAME"
cd "$WORKSPACE"

tar -czf "$BACKUP_NAME" \
  --exclude='node_modules' \
  --exclude='backups' \
  .

echo "✅ Backup complete: $(ls -lh "$BACKUP_NAME" | awk '{print $5}') - $(basename "$BACKUP_NAME")"
```

**Enhanced Script** (`ops/backup.sh`):
```bash
#!/bin/bash
set -e

WORKSPACE="/Users/openclaw/.openclaw/workspace"
BACKUP_DIR="/Users/openclaw/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Accept optional description as first argument
DESCRIPTION="$1"

if [ -n "$DESCRIPTION" ]; then
  # Sanitize description for filename
  DESC_SLUG=$(echo "$DESCRIPTION" | tr -cs '[:alnum:]' '_' | cut -c1-30)
  BACKUP_NAME="${BACKUP_DIR}/workspace_${DESC_SLUG}_${TIMESTAMP}.tar.gz"
else
  BACKUP_NAME="${BACKUP_DIR}/workspace_${TIMESTAMP}.tar.gz"
fi

mkdir -p "$BACKUP_DIR"

echo "Creating backup: $BACKUP_NAME"
cd "$WORKSPACE"

tar -czf "$BACKUP_NAME" \
  --exclude='node_modules' \
  --exclude='backups' \
  --exclude='.git' \
  --exclude='.next' \
  .

FILE_SIZE=$(ls -lh "$BACKUP_NAME" | awk '{print $5}')
echo "✅ Backup complete: $FILE_SIZE - $(basename "$BACKUP_NAME")"

# Output JSON for programmatic parsing (optional)
if [ "$2" = "--json" ]; then
  cat <<EOF
{
  "filename": "$(basename "$BACKUP_NAME")",
  "filepath": "$BACKUP_NAME",
  "sizeBytes": $(stat -f%z "$BACKUP_NAME"),
  "description": "$DESCRIPTION",
  "timestamp": $(date +%s)
}
EOF
fi
```

**Usage**:
```bash
# Without description (backward compatible)
./ops/backup.sh

# With description
./ops/backup.sh "After feature X implementation"

# With JSON output
./ops/backup.sh "Test backup" --json
```

---

### 3. API Route Integration

**Backup Creation** (`app/api/backups/create/route.ts`):

```typescript
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    
    // Use existing backup script
    const scriptPath = "/Users/openclaw/.openclaw/workspace/ops/backup.sh";
    const command = description
      ? `bash "${scriptPath}" "${description}" --json`
      : `bash "${scriptPath}" --json`;
    
    const { stdout } = await execAsync(command, {
      cwd: "/Users/openclaw/.openclaw/workspace",
    });
    
    // Parse JSON output
    const result = JSON.parse(stdout.trim().split('\n').pop());
    
    // Create DB record
    const backupId = await fetch("http://localhost:3000/api/convex-mutation", {
      method: "POST",
      body: JSON.stringify({
        mutation: "backups:create",
        args: {
          filename: result.filename,
          filepath: result.filepath,
          sizeBytes: result.sizeBytes,
          description: description || null,
          createdBy: "manual",
        },
      }),
    });
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Backup creation error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

### 4. Restore Integration

**Restore Process**:

1. Validate backup file
2. Create pre-restore backup
3. Stop services (if any)
4. Extract backup to temp location
5. Replace workspace
6. Verify integrity
7. Restart services

**Implementation** (`app/api/backups/restore/route.ts`):

```typescript
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { access, rename, mkdir, rm } from "fs/promises";
import { constants } from "fs";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { backupId } = await request.json();
    
    // 1. Get backup record
    const backup = await convex.query(api.backups.get, { id: backupId });
    if (!backup) {
      return NextResponse.json({ error: "Backup not found" }, { status: 404 });
    }
    
    // 2. Validate file exists
    try {
      await access(backup.filepath, constants.R_OK);
    } catch {
      return NextResponse.json({ error: "Backup file not found" }, { status: 404 });
    }
    
    // 3. Create pre-restore backup
    const preRestoreScript = "/Users/openclaw/.openclaw/workspace/ops/backup.sh";
    const preRestoreDesc = `Pre-restore backup for ${backup.filename}`;
    
    const { stdout: preRestoreOutput } = await execAsync(
      `bash "${preRestoreScript}" "${preRestoreDesc}" --json`
    );
    const preRestoreResult = JSON.parse(preRestoreOutput.trim().split('\n').pop());
    
    // Create DB record for pre-restore backup
    const preRestoreBackupId = await convex.mutation(api.backups.create, {
      filename: preRestoreResult.filename,
      filepath: preRestoreResult.filepath,
      sizeBytes: preRestoreResult.sizeBytes,
      description: preRestoreDesc,
      createdBy: "pre-restore",
      isPreRestoreBackup: true,
    });
    
    // 4. Stop services (Mission Control, Convex)
    try {
      await execAsync("lsof -ti:3000 | xargs kill || true"); // Next.js
      await execAsync("lsof -ti:3210 | xargs kill || true"); // Convex dev
    } catch {
      // Services not running, continue
    }
    
    await sleep(2000); // Allow graceful shutdown
    
    // 5. Extract to temp directory
    const tempDir = `/tmp/openclaw-restore-${Date.now()}`;
    await mkdir(tempDir, { recursive: true });
    
    await execAsync(`tar -xzf "${backup.filepath}" -C "${tempDir}"`);
    
    // 6. Verify extraction
    const { stdout: fileCount } = await execAsync(`find "${tempDir}" -type f | wc -l`);
    if (parseInt(fileCount.trim()) === 0) {
      await rm(tempDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: "Extraction failed: empty directory" },
        { status: 500 }
      );
    }
    
    // 7. Replace workspace
    const workspacePath = "/Users/openclaw/.openclaw/workspace";
    const backupPath = `${workspacePath}.bak`;
    
    try {
      // Move current workspace to .bak
      await rename(workspacePath, backupPath);
      
      // Move extracted files to workspace
      await rename(tempDir, workspacePath);
      
      // Update metadata
      await convex.mutation(api.backups.recordRestore, {
        id: backupId,
        preRestoreBackupId,
      });
      
      return NextResponse.json({
        success: true,
        preRestoreBackup: preRestoreResult.filename,
        restoredFrom: backup.filename,
        timestamp: Date.now(),
      });
    } catch (error: any) {
      // Emergency rollback
      console.error("Restore failed, rolling back:", error);
      
      try {
        await rm(workspacePath, { recursive: true, force: true });
        await rename(backupPath, workspacePath);
      } catch (rollbackError) {
        console.error("CRITICAL: Rollback failed:", rollbackError);
        return NextResponse.json(
          { error: "CRITICAL: Rollback failed. Manual intervention required." },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: `Restore failed: ${error.message}. Workspace rolled back.` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Restore error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

### 5. Naming Convention Handling

**Existing Conventions**:
1. `workspace_YYYYMMDD_HHMMSS.tar.gz` (standard)
2. `workspace_{description}_YYYYMMDD_HHMMSS.tar.gz` (with description)
3. `{project}_*.tar.gz` (project-specific)
4. `openclaw-*.tar.gz` (legacy)

**Parsing Strategy**:

```typescript
interface ParsedFilename {
  type: "standard" | "described" | "legacy" | "unknown";
  description?: string;
  timestamp?: Date;
  project?: string;
}

function parseBackupFilename(filename: string): ParsedFilename {
  // Standard: workspace_20260223_183045.tar.gz
  const standardMatch = filename.match(/^workspace_(\d{8})_(\d{6})\.tar\.gz$/);
  if (standardMatch) {
    const [, date, time] = standardMatch;
    return {
      type: "standard",
      timestamp: parseDateTime(date, time),
    };
  }
  
  // Described: workspace_{description}_20260223_183045.tar.gz
  const describedMatch = filename.match(/^workspace_(.+?)_(\d{8})_(\d{6})\.tar\.gz$/);
  if (describedMatch) {
    const [, desc, date, time] = describedMatch;
    return {
      type: "described",
      description: desc.replace(/_/g, " "),
      timestamp: parseDateTime(date, time),
    };
  }
  
  // Legacy: openclaw-*.tar.gz or other patterns
  return {
    type: filename.startsWith("openclaw-") ? "legacy" : "unknown",
  };
}

function parseDateTime(date: string, time: string): Date {
  // date: YYYYMMDD, time: HHMMSS
  const year = parseInt(date.slice(0, 4));
  const month = parseInt(date.slice(4, 6)) - 1;
  const day = parseInt(date.slice(6, 8));
  const hour = parseInt(time.slice(0, 2));
  const minute = parseInt(time.slice(2, 4));
  const second = parseInt(time.slice(4, 6));
  
  return new Date(year, month, day, hour, minute, second);
}
```

---

### 6. Migration: Import Existing Backups

**One-time Migration Script**:

```typescript
// scripts/migrate-backups.ts
import { readdir, stat } from "fs/promises";
import path from "path";

async function migrateExistingBackups() {
  const backupDir = "/Users/openclaw/.openclaw/backups";
  const files = await readdir(backupDir);
  
  const backups = await Promise.all(
    files
      .filter(f => f.endsWith(".tar.gz"))
      .map(async (filename) => {
        const filepath = path.join(backupDir, filename);
        const stats = await stat(filepath);
        const parsed = parseBackupFilename(filename);
        
        return {
          filename,
          filepath,
          sizeBytes: stats.size,
          description: parsed.description || null,
          createdAt: parsed.timestamp?.getTime() || stats.birthtimeMs,
          createdBy: "cli",
          status: "valid",
        };
      })
  );
  
  console.log(`Found ${backups.length} backups to migrate`);
  
  for (const backup of backups) {
    try {
      await convex.mutation(api.backups.create, backup);
      console.log(`✓ Migrated: ${backup.filename}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${backup.filename}:`, error);
    }
  }
  
  console.log("Migration complete!");
}

migrateExistingBackups();
```

**Run Migration**:
```bash
cd ~/.openclaw/workspace/mission-control
npx tsx scripts/migrate-backups.ts
```

---

### 7. Cron Integration (Future)

**Scheduled Backups via Calendar**:

When implementing scheduled backups:

```typescript
// convex/scheduledBackups.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
  "daily-backup",
  { hourUTC: 2, minuteUTC: 0 }, // 2 AM UTC
  internal.backups.createScheduledBackup,
  { description: "Daily automated backup" }
);

export default crons;
```

---

### 8. CLI Integration

**Mission Control CLI Command**:

```bash
# Create backup from CLI
mission-control backup create "Description here"

# List backups
mission-control backup list

# Restore backup
mission-control backup restore <backup-id>

# Delete backup
mission-control backup delete <backup-id>
```

**Implementation** (`bin/mission-control-backup.sh`):

```bash
#!/bin/bash

MISSION_CONTROL_URL="http://localhost:3000"

case "$1" in
  create)
    DESCRIPTION="$2"
    curl -X POST "$MISSION_CONTROL_URL/api/backups/create" \
      -H "Content-Type: application/json" \
      -d "{\"description\": \"$DESCRIPTION\"}"
    ;;
  
  list)
    curl "$MISSION_CONTROL_URL/api/backups/list" | jq
    ;;
  
  restore)
    BACKUP_ID="$2"
    curl -X POST "$MISSION_CONTROL_URL/api/backups/restore" \
      -H "Content-Type: application/json" \
      -d "{\"backupId\": \"$BACKUP_ID\"}"
    ;;
  
  delete)
    BACKUP_ID="$2"
    curl -X DELETE "$MISSION_CONTROL_URL/api/backups/$BACKUP_ID"
    ;;
  
  *)
    echo "Usage: mission-control backup {create|list|restore|delete} [args]"
    exit 1
    ;;
esac
```

---

## Testing Integration

### Test Existing Backups

```bash
# 1. List existing backups
ls -lah ~/.openclaw/backups/

# 2. Load Mission Control Backups page
open http://localhost:3000/app/backups

# 3. Verify all backups appear in table

# 4. Test description editing on old backups

# 5. Test restoring an old backup
```

### Test New Backup Creation

```bash
# 1. Create backup via UI
# Description: "Integration test backup"

# 2. Verify file created
ls -lah ~/.openclaw/backups/workspace_Integration_test_backup_*.tar.gz

# 3. Verify DB record
# Check in Mission Control UI

# 4. Create backup via CLI
./ops/backup.sh "CLI test backup"

# 5. Refresh UI, verify new backup appears
```

### Test Restore

```bash
# 1. Note current workspace state
ls ~/.openclaw/workspace/

# 2. Restore old backup via UI

# 3. Verify workspace reverted

# 4. Check pre-restore backup created
ls -lah ~/.openclaw/backups/pre-restore_*.tar.gz

# 5. Restore pre-restore backup to get back to current state
```

---

## Troubleshooting

### Issue: Backups not appearing in UI

**Cause**: Database not synced with filesystem

**Solution**:
1. Check filesystem: `ls ~/.openclaw/backups/`
2. Check database: View in Mission Control
3. Force sync: Reload page (triggers sync)
4. Manual sync: Run migration script

### Issue: Restore fails with "File not found"

**Cause**: DB record exists but file deleted

**Solution**:
1. Update status: Mark backup as "missing"
2. Clean up: Delete orphaned DB records
3. Prevention: Soft-delete files (move to trash)

### Issue: Backup creation fails

**Cause**: Disk space, permissions, or script error

**Solution**:
1. Check disk space: `df -h`
2. Check permissions: `ls -la ~/.openclaw/backups/`
3. Test script: `./ops/backup.sh "Test"`
4. Check logs: Console output

### Issue: Services don't restart after restore

**Cause**: Process kill failed or wrong PID

**Solution**:
1. Manual restart: `cd mission-control && npm run dev`
2. Check ports: `lsof -ti:3000`
3. Kill manually: `kill $(lsof -ti:3000)`

---

## Best Practices

### 1. Regular Backups
- Daily automated backups
- Before major changes (manual)
- Before deployments
- After successful migrations

### 2. Backup Retention
- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 12 monthly backups
- Pin critical backups

### 3. Testing Backups
- Monthly restore test
- Verify integrity regularly
- Test restore process in staging

### 4. Security
- Restrict backup directory permissions
- Validate all file paths
- Sanitize descriptions
- Audit restore operations

---

## Monitoring & Alerts

### Metrics to Track
- Backup frequency
- Backup size trends
- Failed backups
- Disk space usage
- Restore success rate

### Alerts
- Backup failure (send notification)
- Disk space low (<10GB)
- Corrupted backup detected
- No backup in 24 hours

---

## Future Enhancements

### Phase 2
- Cloud backup sync (S3, GCS)
- Incremental backups
- Compression level options
- Backup verification tests

### Phase 3
- Multi-workspace support
- Selective file restore
- Backup comparison tool
- Encrypted backups

### Phase 4
- Backup analytics dashboard
- Automated cleanup policies
- Backup templates
- Remote backup management

---

## References

- Existing backup script: `~/.openclaw/workspace/ops/backup.sh`
- Backup directory: `~/.openclaw/backups/`
- Mission Control: `~/.openclaw/workspace/mission-control/`
- Convex schema: `~/.openclaw/workspace/mission-control/convex/schema.ts`

---

## Quick Reference

```bash
# Create backup (CLI)
./ops/backup.sh "My backup description"

# List backups
ls -lah ~/.openclaw/backups/

# Check disk space
df -h ~/.openclaw/backups/

# Manual restore (emergency)
cd /Users/openclaw/.openclaw/workspace
tar -xzf ~/.openclaw/backups/backup.tar.gz

# Clean old backups
find ~/.openclaw/backups/ -name "*.tar.gz" -mtime +30 -delete
```
