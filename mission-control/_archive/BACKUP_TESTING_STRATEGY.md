# Backup & Restore System: Testing Strategy

## Overview

This document outlines a comprehensive testing strategy for the Backup & Restore management system, covering unit tests, integration tests, E2E tests, and manual testing procedures.

---

## Table of Contents

1. [Testing Pyramid](#testing-pyramid)
2. [Unit Tests](#unit-tests)
3. [Integration Tests](#integration-tests)
4. [End-to-End Tests](#end-to-end-tests)
5. [Manual Testing](#manual-testing)
6. [Performance Testing](#performance-testing)
7. [Security Testing](#security-testing)
8. [Continuous Integration](#continuous-integration)
9. [Test Data Management](#test-data-management)
10. [Bug Reporting Template](#bug-reporting-template)

---

## Testing Pyramid

```
         /\
        /  \     E2E Tests (10%)
       /----\    - Critical user flows
      /      \   - Smoke tests
     /--------\  
    /  Integr- \ Integration Tests (30%)
   /   ation    \- API + DB + Scripts
  /--------------\
 /   Unit Tests   \ Unit Tests (60%)
/------------------\- Services, Utils, Components
```

**Testing Goals:**
- **Code Coverage:** 80%+ for critical paths
- **Test Speed:** Full suite runs in < 5 minutes
- **Reliability:** Zero flaky tests
- **Automation:** All tests run in CI/CD

---

## Unit Tests

### 1. Backup Service (`lib/backup/BackupService.test.ts`)

```typescript
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { BackupService } from '../BackupService';
import { CreateBackupRequest } from '../../types';

describe('BackupService', () => {
  let service: BackupService;
  
  beforeEach(() => {
    service = new BackupService();
  });

  describe('createBackup', () => {
    test('creates backup with valid description', async () => {
      const request: CreateBackupRequest = {
        description: 'Test backup',
        tags: ['test'],
        backupType: 'manual',
      };
      
      const result = await service.createBackup(request);
      
      expect(result.success).toBe(true);
      expect(result.backupId).toBeDefined();
      expect(result.filename).toMatch(/workspace_.*\.tar\.gz/);
    });

    test('rejects empty description', async () => {
      const request: CreateBackupRequest = {
        description: '',
        backupType: 'manual',
      };
      
      await expect(service.createBackup(request))
        .rejects
        .toThrow('Description is required');
    });

    test('rejects description over 500 characters', async () => {
      const request: CreateBackupRequest = {
        description: 'x'.repeat(501),
        backupType: 'manual',
      };
      
      await expect(service.createBackup(request))
        .rejects
        .toThrow('Description too long');
    });

    test('sanitizes tags', async () => {
      const request: CreateBackupRequest = {
        description: 'Test',
        tags: ['tag@1', 'tag#2', 'valid-tag'],
        backupType: 'manual',
      };
      
      const result = await service.createBackup(request);
      const backup = await service.getBackup(result.backupId!);
      
      expect(backup?.tags).toEqual(['tag-1', 'tag-2', 'valid-tag']);
    });

    test('handles insufficient disk space', async () => {
      // Mock disk space check
      jest.spyOn(service, 'checkDiskSpace').mockResolvedValue(false);
      
      const request: CreateBackupRequest = {
        description: 'Test',
        backupType: 'manual',
      };
      
      await expect(service.createBackup(request))
        .rejects
        .toThrow('Insufficient disk space');
    });
  });

  describe('validateBackup', () => {
    test('validates correct backup file', async () => {
      const result = await service.validateBackup('valid-backup.tar.gz');
      
      expect(result.valid).toBe(true);
      expect(result.fileExists).toBe(true);
      expect(result.fileCount).toBeGreaterThan(0);
    });

    test('detects corrupt backup file', async () => {
      const result = await service.validateBackup('corrupt-backup.tar.gz');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Corrupt tar file');
    });

    test('detects missing backup file', async () => {
      const result = await service.validateBackup('missing.tar.gz');
      
      expect(result.valid).toBe(false);
      expect(result.fileExists).toBe(false);
    });
  });

  describe('listBackups', () => {
    test('returns paginated results', async () => {
      const result = await service.listBackups({
        limit: 10,
        offset: 0,
      });
      
      expect(result.backups).toHaveLength(10);
      expect(result.total).toBeGreaterThanOrEqual(10);
      expect(result.hasMore).toBe(result.total > 10);
    });

    test('filters by backup type', async () => {
      const result = await service.listBackups({
        backupType: 'manual',
      });
      
      result.backups.forEach(backup => {
        expect(backup.backupType).toBe('manual');
      });
    });

    test('searches by description', async () => {
      const result = await service.listBackups({
        search: 'cold email',
      });
      
      result.backups.forEach(backup => {
        expect(backup.description.toLowerCase()).toContain('cold email');
      });
    });
  });
});
```

### 2. Restore Service (`lib/restore/RestoreService.test.ts`)

```typescript
describe('RestoreService', () => {
  let service: RestoreService;
  
  beforeEach(() => {
    service = new RestoreService();
  });

  describe('startRestore', () => {
    test('creates safety backup by default', async () => {
      const request: StartRestoreRequest = {
        backupId: 'test-backup-id',
        createSafetyBackup: true,
      };
      
      const result = await service.startRestore(request);
      
      expect(result.success).toBe(true);
      
      const operation = await service.getRestoreStatus(result.operationId!);
      expect(operation?.preRestoreBackupId).toBeDefined();
    });

    test('validates backup before restoring', async () => {
      const request: StartRestoreRequest = {
        backupId: 'invalid-backup-id',
        createSafetyBackup: true,
      };
      
      await expect(service.startRestore(request))
        .rejects
        .toThrow('Invalid backup');
    });

    test('prevents concurrent restores', async () => {
      const request: StartRestoreRequest = {
        backupId: 'test-backup-id',
        createSafetyBackup: false,
      };
      
      // Start first restore
      const result1 = await service.startRestore(request);
      
      // Try to start second restore
      await expect(service.startRestore(request))
        .rejects
        .toThrow('Restore already in progress');
    });
  });

  describe('getRestoreStatus', () => {
    test('returns current progress', async () => {
      const operation = await service.getRestoreStatus('operation-id');
      
      expect(operation?.progressPercent).toBeGreaterThanOrEqual(0);
      expect(operation?.progressPercent).toBeLessThanOrEqual(100);
      expect(operation?.currentStep).toBeDefined();
    });
  });
});
```

### 3. Validation Service (`lib/validation/ValidationService.test.ts`)

```typescript
describe('ValidationService', () => {
  let service: ValidationService;
  
  beforeEach(() => {
    service = new ValidationService();
  });

  describe('validateBackupFile', () => {
    test('validates tar integrity', async () => {
      const result = await service.validateBackupFile('valid.tar.gz');
      expect(result.valid).toBe(true);
    });

    test('checks for key files', async () => {
      const result = await service.validateBackupFile('no-package-json.tar.gz');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing package.json');
    });
  });

  describe('verifyChecksum', () => {
    test('matches valid checksum', async () => {
      const filepath = 'test-backup.tar.gz';
      const checksum = 'abc123...';
      
      const result = await service.verifyChecksum(filepath, checksum);
      expect(result).toBe(true);
    });

    test('detects checksum mismatch', async () => {
      const filepath = 'test-backup.tar.gz';
      const wrongChecksum = 'wrong...';
      
      const result = await service.verifyChecksum(filepath, wrongChecksum);
      expect(result).toBe(false);
    });
  });
});
```

### 4. Utility Functions (`lib/utils/formatters.test.ts`)

```typescript
describe('Formatters', () => {
  describe('formatFileSize', () => {
    test('formats bytes', () => {
      expect(formatFileSize(0).display).toBe('0 B');
      expect(formatFileSize(100).display).toBe('100 B');
    });

    test('formats kilobytes', () => {
      expect(formatFileSize(1024).display).toBe('1 KB');
      expect(formatFileSize(2048).display).toBe('2 KB');
    });

    test('formats megabytes', () => {
      expect(formatFileSize(1048576).display).toBe('1 MB');
      expect(formatFileSize(10485760).display).toBe('10 MB');
    });

    test('formats gigabytes', () => {
      expect(formatFileSize(1073741824).display).toBe('1 GB');
    });
  });

  describe('formatDuration', () => {
    test('formats seconds', () => {
      expect(formatDuration(5000).display).toBe('5s');
    });

    test('formats minutes and seconds', () => {
      expect(formatDuration(65000).display).toBe('1m 5s');
    });

    test('formats hours and minutes', () => {
      expect(formatDuration(3665000).display).toBe('1h 1m');
    });
  });

  describe('formatRelativeTime', () => {
    const now = Date.now();

    test('formats "just now"', () => {
      expect(formatRelativeTime(now - 5000)).toBe('Just now');
    });

    test('formats minutes ago', () => {
      expect(formatRelativeTime(now - 300000)).toBe('5 min ago');
    });

    test('formats hours ago', () => {
      expect(formatRelativeTime(now - 7200000)).toBe('2 hours ago');
    });

    test('formats days ago', () => {
      expect(formatRelativeTime(now - 86400000)).toBe('1 day ago');
    });
  });
});
```

---

## Integration Tests

### 1. Full Backup Cycle (`__tests__/integration/backup-cycle.test.ts`)

```typescript
describe('Backup Cycle Integration', () => {
  test('full backup creation flow', async () => {
    // 1. Create backup via API
    const response = await fetch('/api/backup/create', {
      method: 'POST',
      body: JSON.stringify({
        description: 'Integration test backup',
        tags: ['test', 'integration'],
      }),
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.backupId).toBeDefined();
    
    // 2. Verify backup file exists
    const backupPath = path.join(BACKUP_DIR, result.filename);
    expect(fs.existsSync(backupPath)).toBe(true);
    
    // 3. Verify database entry
    const backup = await convex.query(api.backups.getBackup, {
      backupId: result.backupId,
    });
    expect(backup).toBeDefined();
    expect(backup.description).toBe('Integration test backup');
    expect(backup.tags).toEqual(['test', 'integration']);
    
    // 4. Validate backup
    const validation = await fetch(`/api/backup/validate`, {
      method: 'POST',
      body: JSON.stringify({ backupId: result.backupId }),
    });
    
    const validationResult = await validation.json();
    expect(validationResult.valid).toBe(true);
  });
});
```

### 2. Full Restore Cycle (`__tests__/integration/restore-cycle.test.ts`)

```typescript
describe('Restore Cycle Integration', () => {
  let originalWorkspace: string;
  let testBackupId: string;

  beforeEach(async () => {
    // Create snapshot of current workspace
    originalWorkspace = await captureWorkspaceState();
    
    // Create test backup
    const backup = await createTestBackup('Pre-restore test state');
    testBackupId = backup.backupId;
  });

  test('full restore flow with safety backup', async () => {
    // 1. Modify workspace
    await modifyWorkspaceFile('test.txt', 'modified content');
    
    // 2. Start restore
    const response = await fetch('/api/restore/start', {
      method: 'POST',
      body: JSON.stringify({
        backupId: testBackupId,
        createSafetyBackup: true,
      }),
    });
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.operationId).toBeDefined();
    
    // 3. Wait for completion
    const operation = await waitForRestoreCompletion(result.operationId);
    expect(operation.status).toBe('completed');
    expect(operation.progressPercent).toBe(100);
    
    // 4. Verify workspace restored
    const content = await readWorkspaceFile('test.txt');
    expect(content).toBe('original content');
    
    // 5. Verify safety backup created
    expect(operation.preRestoreBackupId).toBeDefined();
    const safetyBackup = await getBackup(operation.preRestoreBackupId);
    expect(safetyBackup.backupType).toBe('pre-restore');
  });

  test('restore rollback on validation failure', async () => {
    // 1. Create corrupt backup
    const corruptBackupId = await createCorruptBackup();
    
    // 2. Attempt restore
    const response = await fetch('/api/restore/start', {
      method: 'POST',
      body: JSON.stringify({
        backupId: corruptBackupId,
        createSafetyBackup: true,
      }),
    });
    
    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid backup');
    
    // 3. Verify workspace unchanged
    const workspaceState = await captureWorkspaceState();
    expect(workspaceState).toEqual(originalWorkspace);
  });
});
```

### 3. Search & Filter Integration (`__tests__/integration/search.test.ts`)

```typescript
describe('Search & Filter Integration', () => {
  beforeEach(async () => {
    // Seed database with test backups
    await seedTestBackups([
      { description: 'Cold Email V1', tags: ['email', 'v1'] },
      { description: 'Cold Email V2', tags: ['email', 'v2'] },
      { description: 'Folder Organization', tags: ['organization'] },
    ]);
  });

  test('search by description', async () => {
    const backups = await convex.query(api.backups.searchBackups, {
      query: 'cold email',
    });
    
    expect(backups.total).toBe(2);
    expect(backups.backups.every(b => 
      b.description.toLowerCase().includes('cold email')
    )).toBe(true);
  });

  test('filter by tags', async () => {
    const backups = await convex.query(api.backups.listBackups, {
      tags: ['v1'],
    });
    
    expect(backups.backups.every(b => b.tags.includes('v1'))).toBe(true);
  });

  test('filter by date range', async () => {
    const yesterday = Date.now() - 86400000;
    
    const backups = await convex.query(api.backups.listBackups, {
      dateFrom: yesterday,
    });
    
    expect(backups.backups.every(b => b.createdAt >= yesterday)).toBe(true);
  });
});
```

---

## End-to-End Tests

### Playwright E2E Tests (`e2e/backups.spec.ts`)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Backup Management', () => {
  test('user can create and view backup', async ({ page }) => {
    // Navigate to backups page
    await page.goto('/app/backups');
    await expect(page).toHaveTitle(/Backups/);
    
    // Click "Backup Now"
    await page.click('button:has-text("Backup Now")');
    
    // Fill form
    await page.fill('[name="description"]', 'E2E test backup');
    await page.fill('[name="tags"]', 'test, e2e');
    
    // Create backup
    await page.click('button:has-text("Create Backup")');
    
    // Wait for success
    await expect(page.locator('text=Backup created!')).toBeVisible({
      timeout: 60000,
    });
    
    // Verify in list
    const backupRow = page.locator('tr:has-text("E2E test backup")');
    await expect(backupRow).toBeVisible();
    
    // Check details
    await backupRow.click();
    await expect(page).toHaveURL(/\/backups\/.+/);
    await expect(page.locator('h1')).toContainText('E2E test backup');
  });

  test('user can search backups', async ({ page }) => {
    await page.goto('/app/backups');
    
    // Type in search
    await page.fill('[placeholder="Search backups..."]', 'cold email');
    
    // Wait for results
    await page.waitForTimeout(500); // Debounce
    
    // Verify filtered results
    const backups = page.locator('tbody tr');
    const count = await backups.count();
    
    for (let i = 0; i < count; i++) {
      const text = await backups.nth(i).textContent();
      expect(text?.toLowerCase()).toContain('cold email');
    }
  });

  test('user can restore backup', async ({ page }) => {
    await page.goto('/app/backups');
    
    // Click restore on first backup
    await page.click('tbody tr:first-child button:has-text("Restore")');
    
    // Confirm restore dialog
    await expect(page.locator('text=This will replace your current workspace')).toBeVisible();
    
    // Check safety backup option
    await page.check('[name="createSafetyBackup"]');
    
    // Confirm
    await page.click('button:has-text("Confirm Restore")');
    
    // Wait for validation
    await expect(page.locator('text=Validating backup...')).toBeVisible();
    
    // Wait for completion
    await expect(page.locator('text=Restore complete!')).toBeVisible({
      timeout: 120000,
    });
    
    // Verify success message
    await expect(page.locator('text=Workspace restored')).toBeVisible();
  });

  test('user can edit backup description', async ({ page }) => {
    await page.goto('/app/backups');
    
    // Click on backup
    const firstBackup = page.locator('tbody tr:first-child');
    const originalDescription = await firstBackup.locator('td:nth-child(2)').textContent();
    
    // Click edit icon
    await firstBackup.locator('button[aria-label="Edit"]').click();
    
    // Edit description
    await page.fill('[name="description"]', 'Updated description');
    await page.click('button:has-text("Save")');
    
    // Verify updated
    await expect(firstBackup.locator('td:nth-child(2)')).toContainText('Updated description');
  });

  test('user can filter by backup type', async ({ page }) => {
    await page.goto('/app/backups');
    
    // Open filter dropdown
    await page.click('button:has-text("Filters")');
    
    // Select "Manual only"
    await page.click('text=Manual only');
    
    // Verify all results are manual
    const badges = page.locator('[data-badge="backup-type"]');
    const count = await badges.count();
    
    for (let i = 0; i < count; i++) {
      await expect(badges.nth(i)).toContainText('Manual');
    }
  });
});

test.describe('Backup Validation', () => {
  test('user can validate backup', async ({ page }) => {
    await page.goto('/app/backups');
    
    // Find backup with "Needs validation" badge
    const unvalidatedBackup = page.locator('tr:has([data-status="unknown"])').first();
    
    // Click validate
    await unvalidatedBackup.locator('button:has-text("Validate")').click();
    
    // Wait for validation
    await expect(page.locator('text=Validating...')).toBeVisible();
    await expect(page.locator('text=Validation complete')).toBeVisible({
      timeout: 30000,
    });
    
    // Verify status updated
    await expect(unvalidatedBackup.locator('[data-status="valid"]')).toBeVisible();
  });
});
```

---

## Manual Testing

### Pre-Release Checklist

#### Backup Creation
- [ ] Create manual backup with description
- [ ] Create backup with multiple tags
- [ ] Create backup with retention policy
- [ ] Verify backup file exists in `~/.openclaw/backups/`
- [ ] Verify backup appears in dashboard within 2 seconds
- [ ] Verify backup metadata is accurate (size, date, file count)
- [ ] Test backup creation with insufficient disk space
- [ ] Test backup creation with special characters in description
- [ ] Test backup cooldown (try creating 2 backups within 1 minute)

#### Backup Management
- [ ] Edit backup description (inline editing)
- [ ] Add tags to existing backup
- [ ] Remove tags from backup
- [ ] Change retention policy
- [ ] Search backups by description
- [ ] Search backups by tag
- [ ] Filter by date range
- [ ] Filter by backup type (manual/auto)
- [ ] Sort by size (ascending/descending)
- [ ] Sort by date (newest/oldest)
- [ ] Pagination works with 50+ backups
- [ ] Validate backup integrity (pass)
- [ ] Validate backup integrity (fail - corrupt file)
- [ ] Download backup file
- [ ] Soft delete backup
- [ ] Hard delete backup (with file removal)

#### Restore Operations
- [ ] Restore from valid backup
- [ ] Verify safety backup is created
- [ ] Check progress bar updates smoothly
- [ ] Verify progress messages make sense
- [ ] Confirm workspace restored correctly
- [ ] Check key files exist (package.json, etc.)
- [ ] Verify services restart automatically
- [ ] Test restore cancellation (if implemented)
- [ ] Attempt restore from corrupt backup (should fail gracefully)
- [ ] Attempt restore from missing file (should fail gracefully)
- [ ] Verify rollback on restore failure
- [ ] Test restore with "Skip safety backup" option

#### UI/UX
- [ ] Dashboard loads in < 2 seconds
- [ ] Search is instant (< 500ms)
- [ ] Progress indicators are smooth
- [ ] Confirmation dialogs are clear and readable
- [ ] Success messages are helpful
- [ ] Error messages are actionable
- [ ] Tooltips appear on hover
- [ ] Keyboard shortcuts work (N for new, / for search)
- [ ] Tab navigation works
- [ ] Screen reader compatibility
- [ ] Mobile responsive (if applicable)
- [ ] Dark mode compatibility
- [ ] High contrast mode

#### Performance
- [ ] Backup creation completes in < 30 seconds (typical workspace)
- [ ] Dashboard with 100+ backups loads in < 3 seconds
- [ ] Search with 100+ backups returns in < 500ms
- [ ] Restore completes in < 60 seconds (typical workspace)
- [ ] No memory leaks during long-running operations
- [ ] No UI freezing during background operations

#### Error Handling
- [ ] Insufficient disk space shows helpful message
- [ ] Corrupt backup shows validation error
- [ ] Missing backup file shows appropriate error
- [ ] Network error retries automatically
- [ ] Script failure logs detailed error
- [ ] Restore failure triggers rollback
- [ ] Permission denied shows clear instructions

#### Integration
- [ ] Menu item "Backups" appears in Mission Control
- [ ] Cron job creates auto backups daily
- [ ] Auto backups appear in dashboard
- [ ] Retention policy auto-deletes old backups
- [ ] Backup metrics update daily
- [ ] Calendar shows scheduled backups

---

## Performance Testing

### Load Tests

```typescript
// __tests__/performance/backup-load.test.ts
describe('Backup Performance', () => {
  test('handles 1000 backups in database', async () => {
    // Seed 1000 backups
    await seedBackups(1000);
    
    // Measure list query time
    const start = Date.now();
    const backups = await convex.query(api.backups.listBackups, {
      limit: 50,
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(100); // < 100ms
    expect(backups.backups).toHaveLength(50);
  });

  test('search scales with backup count', async () => {
    await seedBackups(1000);
    
    const start = Date.now();
    const results = await convex.query(api.backups.searchBackups, {
      query: 'test',
    });
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(500); // < 500ms
  });
});
```

### Stress Tests

```bash
#!/bin/bash
# Stress test: Create 100 backups rapidly

for i in {1..100}; do
  curl -X POST http://localhost:3000/api/backup/create \
    -H "Content-Type: application/json" \
    -d "{\"description\": \"Stress test backup $i\", \"tags\": [\"stress\"]}" &
done

wait
echo "All backups created"
```

---

## Security Testing

### 1. Path Traversal Prevention

```typescript
test('blocks path traversal attempts', async () => {
  await expect(service.getBackup('../../etc/passwd'))
    .rejects
    .toThrow('Invalid path');
});
```

### 2. Permission Checks

```typescript
test('requires authentication for backup operations', async () => {
  const response = await fetch('/api/backup/create', {
    method: 'POST',
    // No auth header
  });
  
  expect(response.status).toBe(401);
});
```

### 3. Checksum Validation

```typescript
test('detects tampered backup files', async () => {
  const backup = await createBackup('Test');
  
  // Tamper with file
  await modifyBackupFile(backup.filepath);
  
  // Validation should fail
  const result = await service.validateBackup(backup.id);
  expect(result.valid).toBe(false);
});
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
name: Backup System Tests

on:
  push:
    paths:
      - 'convex/backups.ts'
      - 'convex/restore.ts'
      - 'lib/backup/**'
      - 'lib/restore/**'
      - 'app/backups/**'
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm test -- --coverage
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  performance:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run performance tests
        run: npm run test:performance
      
      - name: Check performance regression
        run: npm run check-perf-baseline
```

---

## Test Data Management

### Fixture Creation

```typescript
// __tests__/fixtures/backups.ts
export const createTestBackup = async (
  description: string,
  options?: Partial<CreateBackupRequest>
): Promise<Backup> => {
  const service = new BackupService();
  const result = await service.createBackup({
    description,
    tags: options?.tags || ['test'],
    backupType: options?.backupType || 'manual',
  });
  
  return await service.getBackup(result.backupId!);
};

export const seedTestBackups = async (count: number): Promise<Backup[]> => {
  const backups: Backup[] = [];
  
  for (let i = 0; i < count; i++) {
    const backup = await createTestBackup(`Test backup ${i}`, {
      tags: ['test', `batch-${Math.floor(i / 10)}`],
    });
    backups.push(backup);
  }
  
  return backups;
};
```

### Cleanup

```typescript
afterEach(async () => {
  // Clean up test backups
  const testBackups = await convex.query(api.backups.listBackups, {
    search: 'test',
  });
  
  for (const backup of testBackups.backups) {
    await convex.mutation(api.backups.deleteBackup, {
      backupId: backup._id,
      deleteFile: true,
    });
  }
});
```

---

## Bug Reporting Template

### Bug Report Format

```markdown
## Bug Report: [Short Description]

**Environment:**
- OS: macOS 14.3
- Node Version: 18.x
- Mission Control Version: 1.0.0
- Browser: Chrome 120

**Steps to Reproduce:**
1. Go to /app/backups
2. Click "Backup Now"
3. Enter description: "Test"
4. Click "Create Backup"

**Expected Behavior:**
Backup should be created and appear in list

**Actual Behavior:**
Error message: "Insufficient disk space"

**Error Logs:**
```
[2026-02-23 18:30:00] ERROR: Backup creation failed
[2026-02-23 18:30:00] Error: ENOSPC: no space left on device
```

**Screenshots:**
[Attach screenshot]

**Additional Context:**
- Disk has 50GB free
- Other backups created successfully today

**Severity:** High / Medium / Low
**Priority:** P0 / P1 / P2 / P3
```

---

## Testing Metrics

### Key Metrics to Track

1. **Code Coverage:**
   - Target: 80%+ overall
   - Critical paths: 95%+

2. **Test Execution Time:**
   - Unit tests: < 30 seconds
   - Integration tests: < 2 minutes
   - E2E tests: < 5 minutes
   - Full suite: < 10 minutes

3. **Test Reliability:**
   - Flaky test rate: < 1%
   - Zero false positives

4. **Bug Escape Rate:**
   - Bugs found in production: < 2 per release
   - Critical bugs: 0

5. **Performance Benchmarks:**
   - Backup creation: < 30 seconds
   - Restore operation: < 60 seconds
   - Dashboard load: < 2 seconds
   - Search response: < 500ms

---

## Summary

This comprehensive testing strategy ensures:
- **Reliability:** All critical paths are tested
- **Performance:** Operations complete in reasonable time
- **Security:** No vulnerabilities slip through
- **UX:** Users have a smooth experience
- **Confidence:** Safe to deploy to production

**Next Steps:**
1. Implement unit tests for core services
2. Set up integration test framework
3. Configure Playwright for E2E tests
4. Set up CI/CD pipeline
5. Run manual test checklist before release
