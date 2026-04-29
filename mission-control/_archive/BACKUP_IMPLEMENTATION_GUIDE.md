# Backup & Restore System: Implementation Guide

## Quick Start for Developers

This guide helps you implement the Backup & Restore system step-by-step. Follow this order for smooth development.

---

## Prerequisites

- Node.js 18+
- Mission Control project set up
- Convex configured
- Access to `~/.openclaw/backups/` directory

---

## Implementation Order

### Phase 1: Foundation (Day 1-2)
1. Database schema
2. Enhanced backup script
3. Basic Convex queries

### Phase 2: Core Features (Day 3-5)
4. Backup creation UI
5. Backup list UI
6. Restore script

### Phase 3: Advanced Features (Day 6-8)
7. Restore UI with progress
8. Search & filters
9. Validation

### Phase 4: Polish (Day 9-10)
10. Testing
11. Error handling
12. Documentation

---

## Step-by-Step Implementation

### Step 1: Update Convex Schema

**File:** `convex/schema.ts`

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables ...

  // BACKUP MANAGEMENT
  backups: defineTable({
    filename: v.string(),
    filepath: v.string(),
    size: v.number(),
    description: v.string(),
    tags: v.array(v.string()),
    backupType: v.union(
      v.literal("manual"),
      v.literal("auto"),
      v.literal("pre-restore"),
      v.literal("milestone")
    ),
    workspaceSize: v.number(),
    fileCount: v.optional(v.number()),
    checksum: v.optional(v.string()),
    compression: v.string(),
    status: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("partial"),
      v.literal("archived"),
      v.literal("deleted")
    ),
    isValid: v.boolean(),
    validatedAt: v.optional(v.number()),
    validationError: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
    updatedAt: v.number(),
    retentionPolicy: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_status", ["status", "createdAt"])
    .index("by_type", ["backupType", "createdAt"]),

  restoreOperations: defineTable({
    backupId: v.id("backups"),
    backupFilename: v.string(),
    requestedBy: v.optional(v.string()),
    reason: v.optional(v.string()),
    preRestoreBackupId: v.optional(v.id("backups")),
    status: v.union(
      v.literal("validating"),
      v.literal("creating-safety-backup"),
      v.literal("extracting"),
      v.literal("restoring"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("rolled-back")
    ),
    progressPercent: v.number(),
    currentStep: v.string(),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    filesRestored: v.optional(v.number()),
    bytesRestored: v.optional(v.number()),
    error: v.optional(v.string()),
    logs: v.optional(v.array(v.string())),
  }),

  backupMetrics: defineTable({
    date: v.string(),
    totalBackups: v.number(),
    totalSize: v.number(),
    manualBackups: v.number(),
    autoBackups: v.number(),
    restoreOperations: v.number(),
    successfulRestores: v.number(),
    failedRestores: v.number(),
    avgBackupSize: v.optional(v.number()),
    avgBackupDuration: v.optional(v.number()),
  }).index("by_date", ["date"]),
});
```

**Deploy Schema:**
```bash
cd mission-control
npx convex dev  # or npx convex deploy
```

---

### Step 2: Create Convex Backup Functions

**File:** `convex/backups.ts`

```typescript
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// LIST ALL BACKUPS
export const listBackups = query({
  args: {
    status: v.optional(v.string()),
    backupType: v.optional(v.string()),
    search: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("backups");

    // Filter by status
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }

    // Filter by type
    if (args.backupType) {
      query = query.filter((q) => q.eq(q.field("backupType"), args.backupType));
    }

    // Get results
    let backups = await query
      .order("desc")
      .take(args.limit || 50);

    // Search filter (client-side for now)
    if (args.search) {
      const searchLower = args.search.toLowerCase();
      backups = backups.filter(
        (b) =>
          b.description.toLowerCase().includes(searchLower) ||
          b.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    return backups;
  },
});

// GET SINGLE BACKUP
export const getBackup = query({
  args: { backupId: v.id("backups") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.backupId);
  },
});

// GET BACKUP STATS
export const getBackupStats = query({
  handler: async (ctx) => {
    const backups = await ctx.db
      .query("backups")
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
    const lastBackup = backups.sort((a, b) => b.createdAt - a.createdAt)[0];

    return {
      totalBackups: backups.length,
      totalSize,
      lastBackupDate: lastBackup?.createdAt,
    };
  },
});

// CREATE BACKUP RECORD
export const createBackupRecord = mutation({
  args: {
    filename: v.string(),
    filepath: v.string(),
    size: v.number(),
    description: v.string(),
    tags: v.array(v.string()),
    backupType: v.string(),
    workspaceSize: v.number(),
    fileCount: v.optional(v.number()),
    checksum: v.optional(v.string()),
    compression: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const backupId = await ctx.db.insert("backups", {
      filename: args.filename,
      filepath: args.filepath,
      size: args.size,
      description: args.description,
      tags: args.tags,
      backupType: args.backupType as any,
      workspaceSize: args.workspaceSize,
      fileCount: args.fileCount,
      checksum: args.checksum,
      compression: args.compression,
      status: "completed",
      isValid: true,
      createdAt: now,
      updatedAt: now,
    });

    return backupId;
  },
});

// UPDATE BACKUP
export const updateBackup = mutation({
  args: {
    backupId: v.id("backups"),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    retentionPolicy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.description !== undefined) updates.description = args.description;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.retentionPolicy !== undefined)
      updates.retentionPolicy = args.retentionPolicy;

    await ctx.db.patch(args.backupId, updates);
  },
});

// DELETE BACKUP
export const deleteBackup = mutation({
  args: {
    backupId: v.id("backups"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.backupId, {
      status: "deleted",
      updatedAt: Date.now(),
    });
  },
});
```

---

### Step 3: Create Next.js API Route for Backup Creation

**File:** `app/api/backup/create/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const execAsync = promisify(exec);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { description, tags = [], backupType = "manual" } = body;

    // Validate inputs
    if (!description || description.length === 0) {
      return NextResponse.json(
        { success: false, error: "Description is required" },
        { status: 400 }
      );
    }

    // Execute backup script
    const scriptPath = "/Users/openclaw/.openclaw/workspace/ops/backup.sh";
    const tagsStr = tags.join(",");
    const command = `${scriptPath} "${description}" "${tagsStr}" "${backupType}"`;

    const { stdout, stderr } = await execAsync(command);

    // Parse JSON output from script
    const lines = stdout.split("\n");
    const jsonLine = lines.find((line) => line.startsWith("{"));

    if (!jsonLine) {
      throw new Error("No JSON output from backup script");
    }

    const result = JSON.parse(jsonLine);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Backup failed" },
        { status: 500 }
      );
    }

    // Create database record
    const backupId = await convex.mutation(api.backups.createBackupRecord, {
      filename: result.filename,
      filepath: result.filepath,
      size: result.size,
      description: result.description,
      tags: result.tags.split(",").filter((t: string) => t.length > 0),
      backupType: result.backupType,
      workspaceSize: result.workspaceSize,
      fileCount: result.fileCount,
      checksum: result.checksum,
      compression: result.compression,
    });

    return NextResponse.json({
      success: true,
      backupId: backupId.toString(),
      filename: result.filename,
    });
  } catch (error: any) {
    console.error("Backup creation error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

---

### Step 4: Update Backup Script

**File:** `ops/backup.sh`

```bash
#!/bin/bash
# Enhanced backup script with JSON output

set -e

WORKSPACE="/Users/openclaw/.openclaw/workspace"
BACKUP_DIR="/Users/openclaw/.openclaw/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Parse arguments
DESCRIPTION="${1:-Automatic backup}"
TAGS="${2:-}"
BACKUP_TYPE="${3:-auto}"

# Generate filename
if [ "$BACKUP_TYPE" = "manual" ] && [ -n "$DESCRIPTION" ]; then
  DESC_SLUG=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-z0-9-]//g' | cut -c1-50)
  BACKUP_NAME="${BACKUP_DIR}/workspace_${DESC_SLUG}_${TIMESTAMP}.tar.gz"
else
  BACKUP_NAME="${BACKUP_DIR}/workspace_${TIMESTAMP}.tar.gz"
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Pre-backup checks
WORKSPACE_SIZE=$(du -sk "$WORKSPACE" | awk '{print $1}')
BACKUP_DISK_FREE=$(df -k "$BACKUP_DIR" | tail -1 | awk '{print $4}')

if [ $WORKSPACE_SIZE -gt $BACKUP_DISK_FREE ]; then
  echo "{\"success\": false, \"error\": \"Insufficient disk space\"}"
  exit 1
fi

# Count files
FILE_COUNT=$(find "$WORKSPACE" -type f ! -path "*/node_modules/*" ! -path "*/.next/*" ! -path "*/backups/*" | wc -l | tr -d ' ')

# Create backup
cd "$WORKSPACE"
tar -czf "$BACKUP_NAME" \
  --exclude='node_modules' \
  --exclude='backups' \
  --exclude='.next' \
  --exclude='.DS_Store' \
  . 2>/dev/null

# Calculate checksum
CHECKSUM=$(shasum -a 256 "$BACKUP_NAME" | awk '{print $1}')

# Get file size
FILE_SIZE=$(stat -f%z "$BACKUP_NAME")

# Output JSON
cat <<EOF
{
  "success": true,
  "filename": "$(basename $BACKUP_NAME)",
  "filepath": "$BACKUP_NAME",
  "size": $FILE_SIZE,
  "fileCount": $FILE_COUNT,
  "workspaceSize": $(($WORKSPACE_SIZE * 1024)),
  "checksum": "$CHECKSUM",
  "compression": "gzip",
  "description": "$DESCRIPTION",
  "tags": "$TAGS",
  "backupType": "$BACKUP_TYPE",
  "timestamp": $(date +%s)
}
EOF
```

**Make executable:**
```bash
chmod +x ops/backup.sh
```

---

### Step 5: Create Backup List UI

**File:** `app/app/backups/page.tsx`

```typescript
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { HardDrive, Plus } from "lucide-react";

export default function BackupsPage() {
  const backups = useQuery(api.backups.listBackups, {});
  const stats = useQuery(api.backups.getBackupStats, {});
  const [creating, setCreating] = useState(false);

  const createBackup = async () => {
    setCreating(true);
    try {
      const response = await fetch("/api/backup/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: "Manual backup from UI",
          tags: ["manual", "ui"],
          backupType: "manual",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("Backup created successfully!");
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  if (backups === undefined || stats === undefined) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <HardDrive className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Backups</h1>
        </div>
        <button
          onClick={createBackup}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {creating ? "Creating..." : "Backup Now"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total Backups</div>
          <div className="text-2xl font-bold">{stats.totalBackups}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Total Size</div>
          <div className="text-2xl font-bold">
            {(stats.totalSize / 1024 / 1024 / 1024).toFixed(2)} GB
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
          <div className="text-sm text-gray-500">Last Backup</div>
          <div className="text-2xl font-bold">
            {stats.lastBackupDate
              ? new Date(stats.lastBackupDate).toLocaleString()
              : "Never"}
          </div>
        </div>
      </div>

      {/* Backup List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border">
        <table className="w-full">
          <thead className="border-b">
            <tr className="text-left">
              <th className="p-4">Description</th>
              <th className="p-4">Date</th>
              <th className="p-4">Size</th>
              <th className="p-4">Type</th>
              <th className="p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup._id} className="border-b last:border-0">
                <td className="p-4 font-medium">{backup.description}</td>
                <td className="p-4 text-sm text-gray-500">
                  {new Date(backup.createdAt).toLocaleString()}
                </td>
                <td className="p-4 text-sm">
                  {(backup.size / 1024 / 1024).toFixed(2)} MB
                </td>
                <td className="p-4">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      backup.backupType === "manual"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {backup.backupType}
                  </span>
                </td>
                <td className="p-4">
                  <button className="text-blue-600 hover:underline text-sm">
                    Restore
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

### Step 6: Add Menu Item to Mission Control

**File:** `app/app/layout.tsx`

Find the `menuItems` array and add:

```typescript
{
  name: "Backups",
  path: "/app/backups",
  icon: HardDrive, // Import from lucide-react
}
```

---

### Step 7: Test Basic Functionality

```bash
# 1. Start Mission Control
cd mission-control
npm run dev

# 2. Open browser
open http://localhost:3000/app/backups

# 3. Click "Backup Now"
# 4. Verify backup appears in list
# 5. Check file exists
ls -lh ~/.openclaw/backups/
```

---

## Next Steps

After basic functionality works:

1. **Add Restore Functionality**
   - Create `ops/restore.sh`
   - Create `convex/restore.ts`
   - Create `/api/restore/start` endpoint
   - Add restore UI with progress tracking

2. **Add Search & Filters**
   - Search input in header
   - Date range picker
   - Tag filters
   - Sort options

3. **Add Validation**
   - Create `ops/validate-backup.sh`
   - Add validation button to UI
   - Show validation status badges

4. **Polish UI**
   - Better error messages
   - Loading states
   - Success notifications
   - Confirmation dialogs

5. **Write Tests**
   - Unit tests for services
   - Integration tests for API routes
   - E2E tests with Playwright

---

## Common Issues & Solutions

### Issue: Backup script permission denied
```bash
chmod +x ops/backup.sh
```

### Issue: Convex schema errors
```bash
# Clear Convex cache
rm -rf .convex
npx convex dev
```

### Issue: API route not found
- Check Next.js version (must be 13+)
- Verify file path: `app/api/backup/create/route.ts`
- Restart dev server

### Issue: Backup file not created
```bash
# Test script manually
./ops/backup.sh "Test backup" "test" "manual"
```

### Issue: Database record not created
- Check Convex deployment status
- Verify `NEXT_PUBLIC_CONVEX_URL` in `.env`
- Check browser console for errors

---

## Helpful Commands

```bash
# Test backup script
./ops/backup.sh "Test backup" "test" "manual"

# List backups
ls -lh ~/.openclaw/backups/

# Check Convex logs
npx convex logs

# Run tests
npm test

# Build for production
npm run build

# Deploy to production
npm run deploy
```

---

## Resources

- **Main Architecture Doc:** `BACKUP_RESTORE_ARCHITECTURE.md`
- **Database Schema:** `BACKUP_DATABASE_SCHEMA.sql`
- **TypeScript Interfaces:** `BACKUP_TYPESCRIPT_INTERFACES.ts`
- **Workflow Diagrams:** `BACKUP_WORKFLOW_DIAGRAMS.md`
- **Testing Strategy:** `BACKUP_TESTING_STRATEGY.md`

---

## Getting Help

If stuck, check:
1. Convex logs: `npx convex logs`
2. Browser console: F12
3. Server logs: Check terminal running `npm run dev`
4. Backup script output: Run manually to see errors

---

## Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Manual testing complete
- [ ] Error handling tested
- [ ] Performance tested with 100+ backups
- [ ] Security review complete
- [ ] Documentation updated
- [ ] Backup retention configured
- [ ] Cron jobs scheduled
- [ ] Monitoring in place
- [ ] Rollback plan ready

---

Good luck with implementation! 🚀
