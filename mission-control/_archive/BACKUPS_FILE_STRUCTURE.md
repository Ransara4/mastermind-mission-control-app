# Backups Page - File Structure & Implementation Guide

## Complete File Structure

```
mission-control/
├── app/
│   └── app/
│       └── backups/
│           ├── page.tsx                    # Main backups page (root component)
│           ├── components/
│           │   ├── CreateBackupSection.tsx # Backup creation UI
│           │   ├── BackupsTable.tsx        # Backup list with search/sort
│           │   ├── BackupRow.tsx           # Individual backup row
│           │   ├── StatusBadge.tsx         # Status indicator component
│           │   ├── RestoreModal.tsx        # Restore confirmation modal
│           │   └── index.ts                # Component exports
│           ├── utils/
│           │   ├── formatBytes.ts          # File size formatter
│           │   ├── formatDate.ts           # Date/time formatter
│           │   ├── validation.ts           # Input validation helpers
│           │   └── index.ts                # Util exports
│           └── types.ts                    # TypeScript type definitions
│
├── convex/
│   └── backups.ts                          # Convex queries & mutations
│
└── app/
    └── api/
        └── backups/
            ├── list/
            │   └── route.ts                # GET /api/backups/list
            ├── create/
            │   └── route.ts                # POST /api/backups/create
            ├── restore/
            │   └── route.ts                # POST /api/backups/restore
            ├── validate/
            │   └── route.ts                # POST /api/backups/validate
            ├── download/
            │   └── [filename]/
            │       └── route.ts            # GET /api/backups/download/:filename
            └── [id]/
                └── route.ts                # PATCH/DELETE /api/backups/:id

__tests__/
├── backups/
│   ├── components/
│   │   ├── BackupsPage.test.tsx
│   │   ├── CreateBackupSection.test.tsx
│   │   ├── BackupsTable.test.tsx
│   │   ├── BackupRow.test.tsx
│   │   ├── StatusBadge.test.tsx
│   │   └── RestoreModal.test.tsx
│   ├── utils/
│   │   ├── formatBytes.test.ts
│   │   ├── formatDate.test.ts
│   │   └── validation.test.ts
│   └── api/
│       ├── list.test.ts
│       ├── create.test.ts
│       ├── restore.test.ts
│       ├── validate.test.ts
│       └── delete.test.ts

playwright/
└── backups.spec.ts                         # E2E tests
```

---

## Implementation Files

### 1. Main Page Component

**File**: `app/app/backups/page.tsx`

```typescript
"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { AlertCircle } from "lucide-react";

import {
  CreateBackupSection,
  BackupsTable,
  RestoreModal,
} from "./components";

import type { Backup, SortField, BackupResult } from "./types";

export default function BackupsPage() {
  // Convex hooks
  const backups = useQuery(api.backups.list);
  const createBackupMutation = useMutation(api.backups.create);
  const updateBackupMutation = useMutation(api.backups.update);
  const deleteBackupMutation = useMutation(api.backups.deleteBackup);
  const recordRestoreMutation = useMutation(api.backups.recordRestore);

  // Local state
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [lastBackupResult, setLastBackupResult] = useState<BackupResult | null>(null);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [restoringBackup, setRestoringBackup] = useState(false);

  // Filtered and sorted backups
  const filteredAndSortedBackups = useMemo(() => {
    if (!backups) return [];

    let filtered = backups;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.filename.toLowerCase().includes(query) ||
          (b.description || "").toLowerCase().includes(query)
      );
    }

    // Sort
    return filtered.slice().sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "date":
          comparison = a.createdAt - b.createdAt;
          break;
        case "size":
          comparison = a.sizeBytes - b.sizeBytes;
          break;
        case "name":
          comparison = a.filename.localeCompare(b.filename);
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [backups, searchQuery, sortBy, sortOrder]);

  // Handlers
  const handleCreateBackup = async (description: string): Promise<void> => {
    setCreatingBackup(true);
    setError(null);

    try {
      const response = await fetch("/api/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || undefined }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      setLastBackupResult({
        filename: result.filename,
        sizeBytes: result.sizeBytes,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setError(err.message || "Failed to create backup");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = (backup: Backup): void => {
    setSelectedBackup(backup);
    setRestoreModalOpen(true);
  };

  const handleConfirmRestore = async (): Promise<void> => {
    if (!selectedBackup) return;

    setRestoringBackup(true);
    setError(null);

    try {
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupId: selectedBackup._id }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();

      // Update metadata
      if (result.preRestoreBackupId) {
        await recordRestoreMutation({
          id: selectedBackup._id,
          preRestoreBackupId: result.preRestoreBackupId,
        });
      }

      // Show success and prompt reload
      if (confirm("Restore complete! Refresh the page now?")) {
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Failed to restore backup");
    } finally {
      setRestoringBackup(false);
      setRestoreModalOpen(false);
    }
  };

  const handleDelete = async (backup: Backup): Promise<void> => {
    try {
      const response = await fetch(`/api/backups/${backup._id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      await deleteBackupMutation({ id: backup._id });
    } catch (err: any) {
      setError(err.message || "Failed to delete backup");
    }
  };

  const handleDownload = (backup: Backup): void => {
    window.open(`/api/backups/download/${backup.filename}`, "_blank");
  };

  const handleUpdateDescription = async (
    id: Id<"backups">,
    description: string
  ): Promise<void> => {
    try {
      await updateBackupMutation({ id, description });
    } catch (err: any) {
      setError(err.message || "Failed to update description");
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Backup Section */}
      <CreateBackupSection
        onCreateBackup={handleCreateBackup}
        creating={creatingBackup}
        lastSuccess={lastBackupResult}
        lastError={error}
      />

      {/* Backups Table */}
      <BackupsTable
        backups={filteredAndSortedBackups}
        onRestore={handleRestore}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onUpdateDescription={handleUpdateDescription}
        searchQuery={searchQuery}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSearchChange={setSearchQuery}
        onSortChange={(field) => {
          if (field === sortBy) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
          } else {
            setSortBy(field);
            setSortOrder("desc");
          }
        }}
        loading={backups === undefined}
      />

      {/* Restore Modal */}
      <RestoreModal
        backup={selectedBackup}
        open={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        onConfirm={handleConfirmRestore}
        restoring={restoringBackup}
      />
    </div>
  );
}
```

---

### 2. Type Definitions

**File**: `app/app/backups/types.ts`

```typescript
import { Id } from "@/convex/_generated/dataModel";

export interface Backup {
  _id: Id<"backups">;
  _creationTime: number;
  filename: string;
  filepath: string;
  sizeBytes: number;
  checksumMD5?: string;
  description?: string;
  tags?: string[];
  status: "valid" | "corrupted" | "missing" | "creating" | "restoring";
  createdAt: number;
  updatedAt: number;
  lastRestoreAt?: number;
  restoreCount?: number;
  workspaceSnapshot?: {
    filesCount: number;
    directoriesCount: number;
    largestFile?: string;
    excludedPatterns: string[];
  };
  isPreRestoreBackup?: boolean;
  preRestoreForBackup?: Id<"backups">;
  createdBy?: "manual" | "scheduled" | "pre-restore" | "cli";
  createdByAgent?: string;
  expiresAt?: number;
  isPinned?: boolean;
}

export type SortField = "date" | "size" | "name";

export interface BackupResult {
  filename: string;
  sizeBytes: number;
  timestamp: number;
}
```

---

### 3. Convex Schema Updates

**File**: `convex/schema.ts`

Add to existing schema:

```typescript
// BACKUPS
backups: defineTable({
  filename: v.string(),
  filepath: v.string(),
  sizeBytes: v.number(),
  checksumMD5: v.optional(v.string()),
  description: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  status: v.union(
    v.literal("valid"),
    v.literal("corrupted"),
    v.literal("missing"),
    v.literal("creating"),
    v.literal("restoring")
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  lastRestoreAt: v.optional(v.number()),
  restoreCount: v.optional(v.number()),
  workspaceSnapshot: v.optional(v.object({
    filesCount: v.number(),
    directoriesCount: v.number(),
    largestFile: v.optional(v.string()),
    excludedPatterns: v.array(v.string()),
  })),
  isPreRestoreBackup: v.optional(v.boolean()),
  preRestoreForBackup: v.optional(v.id("backups")),
  createdBy: v.optional(v.union(
    v.literal("manual"),
    v.literal("scheduled"),
    v.literal("pre-restore"),
    v.literal("cli")
  )),
  createdByAgent: v.optional(v.string()),
  expiresAt: v.optional(v.number()),
  isPinned: v.optional(v.boolean()),
})
  .index("by_created", ["createdAt"])
  .index("by_status", ["status"])
  .index("by_filename", ["filename"]),
```

---

### 4. Convex Functions

**File**: `convex/backups.ts`

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// List all backups
export const list = query(async (ctx: any) => {
  return await ctx.db
    .query("backups")
    .withIndex("by_created")
    .order("desc")
    .collect();
});

// Get single backup
export const get = query(
  {
    args: { id: v.id("backups") },
  },
  async (ctx: any, args: any) => {
    return await ctx.db.get(args.id);
  }
);

// Create backup record
export const create = mutation(
  {
    args: {
      filename: v.string(),
      filepath: v.string(),
      sizeBytes: v.number(),
      description: v.optional(v.string()),
      checksumMD5: v.optional(v.string()),
      createdBy: v.optional(v.union(
        v.literal("manual"),
        v.literal("scheduled"),
        v.literal("pre-restore"),
        v.literal("cli")
      )),
    },
  },
  async (ctx: any, args: any) => {
    const now = Date.now();
    
    return await ctx.db.insert("backups", {
      filename: args.filename,
      filepath: args.filepath,
      sizeBytes: args.sizeBytes,
      checksumMD5: args.checksumMD5,
      description: args.description,
      status: "valid",
      createdAt: now,
      updatedAt: now,
      createdBy: args.createdBy || "manual",
      restoreCount: 0,
    });
  }
);

// Update backup metadata
export const update = mutation(
  {
    args: {
      id: v.id("backups"),
      description: v.optional(v.string()),
      tags: v.optional(v.array(v.string())),
      isPinned: v.optional(v.boolean()),
      status: v.optional(v.union(
        v.literal("valid"),
        v.literal("corrupted"),
        v.literal("missing")
      )),
    },
  },
  async (ctx: any, args: any) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(id);
  }
);

// Record restore operation
export const recordRestore = mutation(
  {
    args: {
      id: v.id("backups"),
      preRestoreBackupId: v.optional(v.id("backups")),
    },
  },
  async (ctx: any, args: any) => {
    const backup = await ctx.db.get(args.id);
    
    if (!backup) {
      throw new Error("Backup not found");
    }
    
    await ctx.db.patch(args.id, {
      lastRestoreAt: Date.now(),
      restoreCount: (backup.restoreCount || 0) + 1,
      updatedAt: Date.now(),
    });
    
    if (args.preRestoreBackupId) {
      await ctx.db.patch(args.preRestoreBackupId, {
        isPreRestoreBackup: true,
        preRestoreForBackup: args.id,
      });
    }
    
    return await ctx.db.get(args.id);
  }
);

// Delete backup
export const deleteBackup = mutation(
  {
    args: { id: v.id("backups") },
  },
  async (ctx: any, args: any) => {
    const backup = await ctx.db.get(args.id);
    
    if (!backup) {
      throw new Error("Backup not found");
    }
    
    if (backup.isPinned) {
      throw new Error("Cannot delete pinned backup");
    }
    
    await ctx.db.delete(args.id);
    
    return { success: true, deletedFilename: backup.filename };
  }
);
```

---

### 5. API Routes

**File**: `app/api/backups/create/route.ts`

```typescript
import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { stat } from "fs/promises";
import path from "path";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { description } = await request.json();
    
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .split(".")[0];
    
    const descSlug = description
      ? description.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)
      : "";
    
    const filename = descSlug
      ? `workspace_${descSlug}_${timestamp}.tar.gz`
      : `workspace_${timestamp}.tar.gz`;
    
    const backupPath = `/Users/openclaw/.openclaw/backups/${filename}`;
    
    // Execute backup script
    await execAsync(`
      cd /Users/openclaw/.openclaw/workspace
      tar -czf "${backupPath}" \
        --exclude='node_modules' \
        --exclude='backups' \
        --exclude='.git' \
        .
    `);
    
    // Get file size
    const stats = await stat(backupPath);
    
    return NextResponse.json({
      filename,
      filepath: backupPath,
      sizeBytes: stats.size,
      description: description || null,
      createdAt: Date.now(),
    });
  } catch (error: any) {
    console.error("Backup creation error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

**File**: `app/api/backups/list/route.ts`

```typescript
import { NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const backupDir = "/Users/openclaw/.openclaw/backups";
    const files = await readdir(backupDir);
    
    const backups = await Promise.all(
      files
        .filter((f) => f.endsWith(".tar.gz"))
        .map(async (filename) => {
          const filepath = path.join(backupDir, filename);
          const stats = await stat(filepath);
          
          return {
            filename,
            filepath,
            sizeBytes: stats.size,
            createdAt: stats.birthtimeMs,
            status: "valid",
          };
        })
    );
    
    return NextResponse.json({
      backups,
      totalCount: backups.length,
      totalSize: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
    });
  } catch (error: any) {
    console.error("List backups error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

---

## Implementation Steps

### Phase 1: Setup (Day 1)
1. ✅ Create file structure
2. ✅ Add schema to `convex/schema.ts`
3. ✅ Deploy schema: `npx convex deploy`
4. ✅ Create `convex/backups.ts` with queries/mutations
5. ✅ Create type definitions in `types.ts`

### Phase 2: Components (Day 2)
1. ✅ Implement `StatusBadge` (simplest)
2. ✅ Implement utility functions (`formatBytes`, `formatDate`)
3. ✅ Implement `CreateBackupSection`
4. ✅ Implement `RestoreModal`
5. ✅ Implement `BackupRow`
6. ✅ Implement `BackupsTable`
7. ✅ Implement main `page.tsx`

### Phase 3: API Routes (Day 3)
1. ✅ Implement `POST /api/backups/create`
2. ✅ Implement `GET /api/backups/list`
3. ✅ Implement `POST /api/backups/validate`
4. ✅ Implement `POST /api/backups/restore`
5. ✅ Implement `DELETE /api/backups/:id`
6. ✅ Implement `PATCH /api/backups/:id`
7. ✅ Implement `GET /api/backups/download/:filename`

### Phase 4: Testing & Polish (Day 4)
1. ✅ Write unit tests
2. ✅ Write integration tests
3. ✅ Manual testing checklist
4. ✅ Fix bugs
5. ✅ Polish UI

### Phase 5: Documentation & Deployment (Day 5)
1. ✅ Complete all documentation
2. ✅ E2E tests
3. ✅ Performance testing
4. ✅ Deploy to production

---

## Navigation Integration

Update `app/app/layout.tsx` to add Backups link to sidebar:

```typescript
const navigation = [
  { name: "Tasks", href: "/app/tasks", icon: CheckSquare },
  { name: "Calendar", href: "/app/calendar", icon: Calendar },
  { name: "Memory", href: "/app/memory", icon: Brain },
  { name: "Office", href: "/app/office", icon: Users },
  { name: "Projects", href: "/app/projects", icon: FolderOpen },
  { name: "Team", href: "/app/team", icon: Users2 },
  { name: "Email Cleanup", href: "/app/email-cleanup", icon: Mail },
  { name: "Backups", href: "/app/backups", icon: Database }, // NEW
];
```

---

## Dependencies

All required dependencies are already in `package.json`:
- `next` - Framework
- `react` - UI library
- `convex` - Database
- `lucide-react` - Icons
- `tailwindcss` - Styling

No new dependencies needed! ✅

---

## Quick Start Commands

```bash
# Start development
cd ~/.openclaw/workspace/mission-control
npm run dev

# In another terminal, start Convex
npx convex dev

# Deploy schema changes
npx convex deploy

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

---

## Checklist for Implementation

- [ ] Create all files from this structure
- [ ] Update `convex/schema.ts`
- [ ] Deploy Convex schema
- [ ] Implement all components
- [ ] Implement all API routes
- [ ] Test backup creation
- [ ] Test backup restore
- [ ] Test inline editing
- [ ] Test delete functionality
- [ ] Add navigation link
- [ ] Write tests
- [ ] Document code
- [ ] Deploy to production
