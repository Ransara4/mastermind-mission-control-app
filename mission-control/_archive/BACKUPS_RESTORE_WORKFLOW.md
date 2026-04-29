# Backups Page - Restore Workflow

## Overview
Comprehensive workflow for safe workspace restoration with automatic pre-restore backups, validation, and rollback capability.

## Restore Workflow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. USER INITIATES RESTORE                                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DISPLAY RESTORE MODAL                                    │
│   - Show backup details (date, size, description)           │
│   - Display warning message                                  │
│   - Require confirmation checkbox                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. USER CONFIRMS (checkbox + button)                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PRE-RESTORE VALIDATION                                   │
│   ✓ Check backup file exists                                │
│   ✓ Verify file integrity (MD5 checksum)                    │
│   ✓ Validate tar.gz structure                               │
│   ✓ Check available disk space                              │
│   ✓ Ensure workspace is not locked                          │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │  Valid?   │
                    └─────┬─────┘
                          │
              ┌───────────┴───────────┐
              │                       │
             NO                      YES
              │                       │
              ▼                       ▼
┌───────────────────────┐  ┌────────────────────────────────┐
│ SHOW ERROR & ABORT    │  │ 5. CREATE PRE-RESTORE BACKUP   │
│ - Invalid backup      │  │   (Auto-backup current state)  │
│ - Corrupted file      │  │                                │
│ - Insufficient space  │  │   Filename:                    │
│ - Workspace locked    │  │   pre-restore_[original-name]  │
└───────────────────────┘  │   _YYYYMMDD_HHMMSS.tar.gz      │
                           └────────────────────────────────┘
                                        │
                                        ▼
                           ┌────────────────────────────────┐
                           │ Pre-restore backup success?    │
                           └────────┬───────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        │                       │
                       NO                      YES
                        │                       │
                        ▼                       ▼
          ┌────────────────────────┐  ┌──────────────────────────┐
          │ ABORT RESTORE          │  │ 6. STOP SERVICES         │
          │ Show error to user     │  │   (if Mission Control    │
          └────────────────────────┘  │    or other services     │
                                      │    are running)           │
                                      └──────────────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────────────┐
                                      │ 7. EXTRACT BACKUP        │
                                      │   - Create temp directory│
                                      │   - Extract to temp      │
                                      │   - Verify extraction    │
                                      └──────────────────────────┘
                                                │
                                      ┌─────────┴─────────┐
                                      │  Extract success? │
                                      └─────────┬─────────┘
                                                │
                                    ┌───────────┴───────────┐
                                    │                       │
                                   NO                      YES
                                    │                       │
                                    ▼                       ▼
                      ┌─────────────────────────┐  ┌───────────────────────┐
                      │ 8A. ROLLBACK            │  │ 8B. REPLACE WORKSPACE │
                      │   - Keep current state  │  │   - Move current to   │
                      │   - Delete temp files   │  │     .bak directory    │
                      │   - Show error          │  │   - Move extracted    │
                      │   - Restore available   │  │     files to workspace│
                      └─────────────────────────┘  └───────────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────┐
                                                    │ 9. UPDATE METADATA   │
                                                    │   - Mark as restored │
                                                    │   - Update DB record │
                                                    │   - Increment count  │
                                                    └──────────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────┐
                                                    │ 10. RESTART SERVICES │
                                                    │    (if needed)       │
                                                    └──────────────────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────┐
                                                    │ 11. VERIFY RESTORE   │
                                                    │   - Check file count │
                                                    │   - Verify structure │
                                                    │   - Test critical    │
                                                    │     files exist      │
                                                    └──────────────────────┘
                                                              │
                                                    ┌─────────┴──────────┐
                                                    │  Verify success?   │
                                                    └─────────┬──────────┘
                                                              │
                                                  ┌───────────┴───────────┐
                                                  │                       │
                                                 NO                      YES
                                                  │                       │
                                                  ▼                       ▼
                                    ┌──────────────────────────┐  ┌──────────────────────┐
                                    │ 12A. EMERGENCY ROLLBACK  │  │ 12B. SUCCESS         │
                                    │   - Restore .bak files   │  │   - Show success msg │
                                    │   - Alert user           │  │   - Prompt refresh   │
                                    │   - Log incident         │  │   - Log success      │
                                    └──────────────────────────┘  └──────────────────────┘
                                                  │                       │
                                                  └───────────┬───────────┘
                                                              │
                                                              ▼
                                                    ┌──────────────────────┐
                                                    │ 13. CLEANUP          │
                                                    │   - Remove temp dirs │
                                                    │   - Clear locks      │
                                                    │   - Update UI        │
                                                    └──────────────────────┘
```

## Detailed Steps

### Step 1: User Initiates Restore

**User Action**: Clicks [RESTORE] button on backup row

**System Action**:
```typescript
const handleRestore = (backup: Backup) => {
  setSelectedBackup(backup);
  setRestoreModalOpen(true);
};
```

---

### Step 2: Display Restore Modal

**UI Components**:
- Backup details card
- Warning message with date
- Confirmation checkbox
- Cancel/Restore buttons

**Modal State**:
```typescript
{
  open: true,
  backup: selectedBackup,
  confirmed: false,
  restoring: false,
}
```

---

### Step 3: User Confirms

**User Action**: 
1. Checks "I understand" checkbox
2. Clicks "Restore Workspace" button

**Button State**: Disabled until checkbox is checked

---

### Step 4: Pre-Restore Validation

**API Endpoint**: `POST /api/backups/validate`

**Request**:
```json
{
  "backupId": "k37s9d0f8g",
  "filename": "workspace_20260220_125333.tar.gz"
}
```

**Validation Checks**:
```typescript
async function validateBackup(filepath: string): Promise<ValidationResult> {
  // 1. Check file exists
  if (!fs.existsSync(filepath)) {
    return { valid: false, error: "Backup file not found" };
  }
  
  // 2. Check file size > 0
  const stats = fs.statSync(filepath);
  if (stats.size === 0) {
    return { valid: false, error: "Backup file is empty" };
  }
  
  // 3. Verify tar.gz structure
  try {
    await exec(`tar -tzf "${filepath}" | head -1`);
  } catch (error) {
    return { valid: false, error: "Corrupted backup file" };
  }
  
  // 4. Check disk space (need 2x backup size)
  const diskSpace = await checkDiskSpace("/Users/openclaw");
  if (diskSpace.free < stats.size * 2) {
    return { valid: false, error: "Insufficient disk space" };
  }
  
  // 5. Check workspace lock
  if (await isWorkspaceLocked()) {
    return { valid: false, error: "Workspace is currently locked" };
  }
  
  // 6. Verify MD5 checksum (if available)
  if (backup.checksumMD5) {
    const computedMD5 = await computeMD5(filepath);
    if (computedMD5 !== backup.checksumMD5) {
      return { valid: false, error: "Checksum mismatch - file may be corrupted" };
    }
  }
  
  return { valid: true };
}
```

**Error Handling**: If validation fails, show error modal and abort

---

### Step 5: Create Pre-Restore Backup

**Purpose**: Safety net to roll back if restore fails

**Filename Convention**: 
```
pre-restore_[original-backup-name]_YYYYMMDD_HHMMSS.tar.gz
```

**Example**:
```
pre-restore_workspace_20260220_125333_20260223_184500.tar.gz
```

**Implementation**:
```typescript
async function createPreRestoreBackup(
  originalBackupName: string
): Promise<string> {
  const timestamp = formatTimestamp(new Date());
  const description = `Pre-restore safety backup`;
  const filename = `pre-restore_${originalBackupName}_${timestamp}.tar.gz`;
  
  // Execute backup script
  const result = await exec(`
    cd ~/.openclaw/workspace
    tar -czf ~/.openclaw/backups/${filename} \
      --exclude='node_modules' \
      --exclude='backups' \
      .
  `);
  
  // Create DB record
  const backupId = await convex.mutation(api.backups.create, {
    filename,
    filepath: `~/.openclaw/backups/${filename}`,
    sizeBytes: result.size,
    description,
    createdBy: "pre-restore",
    isPreRestoreBackup: true,
  });
  
  return filename;
}
```

---

### Step 6: Stop Services

**Services to Stop**:
- Mission Control dev server (if running)
- Any file watchers
- Convex dev (if running)

**Implementation**:
```typescript
async function stopServices(): Promise<void> {
  const services = [
    { name: "mission-control", port: 3000 },
    { name: "convex-dev", port: 3210 },
  ];
  
  for (const service of services) {
    try {
      // Check if service is running
      const pid = await exec(`lsof -ti:${service.port}`);
      if (pid) {
        await exec(`kill ${pid}`);
        console.log(`Stopped ${service.name} (PID: ${pid})`);
      }
    } catch (error) {
      // Service not running, continue
    }
  }
  
  // Wait for graceful shutdown
  await sleep(2000);
}
```

---

### Step 7: Extract Backup

**Extraction Location**: Temporary directory first

**Implementation**:
```typescript
async function extractBackup(
  backupPath: string
): Promise<{ success: boolean; tempDir: string; error?: string }> {
  const tempDir = `/tmp/openclaw-restore-${Date.now()}`;
  
  try {
    // Create temp directory
    await fs.promises.mkdir(tempDir, { recursive: true });
    
    // Extract to temp
    await exec(`tar -xzf "${backupPath}" -C "${tempDir}"`);
    
    // Verify extraction
    const files = await fs.promises.readdir(tempDir);
    if (files.length === 0) {
      throw new Error("Extraction resulted in empty directory");
    }
    
    // Check for critical files
    const criticalFiles = [
      "package.json",
      "AGENTS.md",
      "TOOLS.md",
    ];
    
    for (const file of criticalFiles) {
      const exists = await fs.promises.access(
        path.join(tempDir, file)
      ).then(() => true).catch(() => false);
      
      if (!exists) {
        console.warn(`Warning: Critical file ${file} not found`);
      }
    }
    
    return { success: true, tempDir };
  } catch (error) {
    return {
      success: false,
      tempDir,
      error: error.message,
    };
  }
}
```

---

### Step 8A: Rollback (Extract Failed)

**Actions**:
1. Delete temporary directory
2. Show error message to user
3. Keep current workspace intact
4. Log failure

**Implementation**:
```typescript
async function rollbackExtraction(tempDir: string, error: string): Promise<void> {
  // Clean up temp directory
  await fs.promises.rm(tempDir, { recursive: true, force: true });
  
  // Log failure
  console.error(`Restore failed during extraction: ${error}`);
  
  // Update UI
  throw new Error(`Restore failed: ${error}. Your workspace has not been modified.`);
}
```

---

### Step 8B: Replace Workspace (Extract Success)

**Safety**: Move current workspace to `.bak` before replacing

**Implementation**:
```typescript
async function replaceWorkspace(
  tempDir: string,
  workspacePath: string
): Promise<void> {
  const backupPath = `${workspacePath}.bak`;
  
  // 1. Move current workspace to .bak
  await fs.promises.rename(workspacePath, backupPath);
  
  // 2. Move extracted files to workspace
  await fs.promises.rename(tempDir, workspacePath);
  
  // 3. Remove .bak after successful restore (or keep for 24h)
  // await fs.promises.rm(backupPath, { recursive: true });
}
```

---

### Step 9: Update Metadata

**Database Updates**:
```typescript
async function updateRestoreMetadata(
  backupId: string,
  preRestoreBackupId: string
): Promise<void> {
  await convex.mutation(api.backups.recordRestore, {
    id: backupId,
    preRestoreBackupId,
  });
}
```

---

### Step 10: Restart Services

**Implementation**:
```typescript
async function restartServices(): Promise<void> {
  // Restart in background - user will manually refresh
  // This is just to get services back online
  
  exec("cd ~/.openclaw/workspace/mission-control && npm run dev", {
    detached: true,
    stdio: "ignore",
  });
}
```

---

### Step 11: Verify Restore

**Verification Checks**:
```typescript
async function verifyRestore(
  workspacePath: string,
  expectedFileCount?: number
): Promise<{ verified: boolean; error?: string }> {
  try {
    // 1. Check workspace exists
    const exists = await fs.promises.access(workspacePath)
      .then(() => true)
      .catch(() => false);
    
    if (!exists) {
      return { verified: false, error: "Workspace directory not found" };
    }
    
    // 2. Count files
    const files = await exec(`find "${workspacePath}" -type f | wc -l`);
    const fileCount = parseInt(files.stdout.trim());
    
    if (fileCount === 0) {
      return { verified: false, error: "Workspace is empty" };
    }
    
    // 3. Check critical files
    const criticalFiles = [
      "package.json",
      "AGENTS.md",
      "TOOLS.md",
    ];
    
    for (const file of criticalFiles) {
      const filePath = path.join(workspacePath, file);
      const exists = await fs.promises.access(filePath)
        .then(() => true)
        .catch(() => false);
      
      if (!exists) {
        return { verified: false, error: `Critical file missing: ${file}` };
      }
    }
    
    return { verified: true };
  } catch (error) {
    return { verified: false, error: error.message };
  }
}
```

---

### Step 12A: Emergency Rollback (Verify Failed)

**Critical Failure Recovery**:
```typescript
async function emergencyRollback(
  workspacePath: string
): Promise<void> {
  const backupPath = `${workspacePath}.bak`;
  
  console.error("EMERGENCY ROLLBACK INITIATED");
  
  // 1. Remove corrupted workspace
  await fs.promises.rm(workspacePath, { recursive: true, force: true });
  
  // 2. Restore from .bak
  await fs.promises.rename(backupPath, workspacePath);
  
  // 3. Alert user
  throw new Error(
    "Restore verification failed. Your workspace has been rolled back to its previous state."
  );
}
```

---

### Step 12B: Success

**User Notification**:
```typescript
{
  title: "Workspace Restored Successfully",
  message: `
    Your workspace has been restored to ${formatDate(backup.createdAt)}.
    
    A pre-restore backup was created: ${preRestoreFilename}
    
    Please refresh the page to see the restored workspace.
  `,
  actions: [
    { label: "Refresh Now", onClick: () => window.location.reload() },
    { label: "Close", onClick: () => closeModal() },
  ],
}
```

---

### Step 13: Cleanup

**Final Cleanup Tasks**:
```typescript
async function cleanup(tempDir: string): Promise<void> {
  // 1. Remove temp directory
  await fs.promises.rm(tempDir, { recursive: true, force: true });
  
  // 2. Clear workspace lock
  await clearWorkspaceLock();
  
  // 3. Update UI state
  setRestoreModalOpen(false);
  setRestoringBackup(false);
  setSelectedBackup(null);
  
  // 4. Refresh backup list
  await refetchBackups();
}
```

---

## Complete Restore Function

```typescript
async function handleConfirmRestore(): Promise<void> {
  if (!selectedBackup) return;
  
  setRestoringBackup(true);
  
  try {
    // Step 4: Validate backup
    const validation = await fetch("/api/backups/validate", {
      method: "POST",
      body: JSON.stringify({ backupId: selectedBackup._id }),
    }).then(r => r.json());
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    // Step 5: Create pre-restore backup
    const preRestoreResult = await fetch("/api/backups/create", {
      method: "POST",
      body: JSON.stringify({
        description: `Pre-restore backup for ${selectedBackup.filename}`,
        isPreRestore: true,
      }),
    }).then(r => r.json());
    
    // Step 6-11: Restore (API handles complexity)
    const restoreResult = await fetch("/api/backups/restore", {
      method: "POST",
      body: JSON.stringify({
        backupId: selectedBackup._id,
        preRestoreBackupId: preRestoreResult._id,
      }),
    }).then(r => r.json());
    
    if (!restoreResult.success) {
      throw new Error(restoreResult.error);
    }
    
    // Step 12B: Success
    setLastBackupResult({
      filename: selectedBackup.filename,
      sizeBytes: selectedBackup.sizeBytes,
      timestamp: Date.now(),
    });
    
    // Prompt user to refresh
    if (confirm("Restore complete! Refresh page now?")) {
      window.location.reload();
    }
  } catch (error) {
    console.error("Restore failed:", error);
    setError(error.message);
  } finally {
    setRestoringBackup(false);
    setRestoreModalOpen(false);
  }
}
```

---

## API Endpoint

**File**: `app/api/backups/restore/route.ts`

```typescript
export async function POST(request: Request) {
  try {
    const { backupId, preRestoreBackupId } = await request.json();
    
    // Load backup record
    const backup = await convex.query(api.backups.get, { id: backupId });
    if (!backup) {
      return Response.json({ error: "Backup not found" }, { status: 404 });
    }
    
    // Validate
    const validation = await validateBackup(backup.filepath);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    
    // Stop services
    await stopServices();
    
    // Extract
    const extraction = await extractBackup(backup.filepath);
    if (!extraction.success) {
      await rollbackExtraction(extraction.tempDir, extraction.error);
      return Response.json({ error: extraction.error }, { status: 500 });
    }
    
    // Replace workspace
    const workspacePath = "/Users/openclaw/.openclaw/workspace";
    await replaceWorkspace(extraction.tempDir, workspacePath);
    
    // Verify
    const verification = await verifyRestore(workspacePath);
    if (!verification.verified) {
      await emergencyRollback(workspacePath);
      return Response.json({ error: verification.error }, { status: 500 });
    }
    
    // Update metadata
    await updateRestoreMetadata(backupId, preRestoreBackupId);
    
    // Cleanup
    await cleanup(extraction.tempDir);
    
    // Restart services (background)
    restartServices().catch(console.error);
    
    return Response.json({
      success: true,
      restoredFrom: backup.filename,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Restore error:", error);
    return Response.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Error Recovery Matrix

| Error Point | User Impact | Recovery Action | Data Loss? |
|-------------|-------------|-----------------|------------|
| Validation failure | None | Show error, abort | No |
| Pre-restore backup fails | None | Show error, abort | No |
| Extract fails | None | Delete temp, abort | No |
| Replace fails | Low | Restore from .bak | No |
| Verify fails | Medium | Emergency rollback | No |
| Rollback fails | **HIGH** | Manual intervention | Possible |

---

## Safety Guarantees

1. **Never delete current workspace without backup**
2. **Always validate before starting**
3. **Keep .bak for 24 hours minimum**
4. **Log all operations**
5. **User confirmation required**
6. **Abort on first error**
7. **Automatic rollback on failure**

---

## Testing Restore Workflow

See `BACKUPS_PAGE_TESTING.md` for comprehensive restore testing scenarios.
