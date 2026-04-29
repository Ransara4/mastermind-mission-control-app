# Backups Page - Database Schema

## Overview
Database schema for storing backup metadata in Convex. Physical backup files remain in `~/.openclaw/backups/`, while metadata (descriptions, restoration history, status) is stored in Convex for fast querying and real-time updates.

## Schema Definition

### Convex Schema Extension
Add to `convex/schema.ts`:

```typescript
// BACKUPS
backups: defineTable({
  // File Information
  filename: v.string(),             // e.g., "workspace_20260223_183045.tar.gz"
  filepath: v.string(),             // Full path: "~/.openclaw/backups/workspace_20260223_183045.tar.gz"
  sizeBytes: v.number(),            // File size in bytes
  checksumMD5: v.optional(v.string()), // MD5 hash for integrity verification
  
  // User Metadata
  description: v.optional(v.string()), // User-provided description
  tags: v.optional(v.array(v.string())), // Optional tags (future enhancement)
  
  // Status
  status: v.union(
    v.literal("valid"),             // Backup exists and passes integrity check
    v.literal("corrupted"),         // Backup exists but fails integrity check
    v.literal("missing"),           // File not found on filesystem
    v.literal("creating"),          // Backup in progress
    v.literal("restoring")          // Currently being restored
  ),
  
  // Timestamps
  createdAt: v.number(),            // Unix timestamp (ms) when backup was created
  updatedAt: v.number(),            // Last metadata update
  
  // Restoration History
  lastRestoreAt: v.optional(v.number()), // When this backup was last restored
  restoreCount: v.optional(v.number()),  // Number of times restored
  
  // Backup Metadata
  workspaceSnapshot: v.optional(v.object({
    filesCount: v.number(),          // Number of files in backup
    directoriesCount: v.number(),    // Number of directories
    largestFile: v.optional(v.string()), // Path to largest file
    excludedPatterns: v.array(v.string()), // What was excluded (node_modules, etc.)
  })),
  
  // Pre-restore backup reference (if this was an auto-backup before restore)
  isPreRestoreBackup: v.optional(v.boolean()),
  preRestoreForBackup: v.optional(v.id("backups")), // Reference to backup being restored
  
  // Creation Context
  createdBy: v.optional(v.union(
    v.literal("manual"),            // User-triggered via UI
    v.literal("scheduled"),         // Cron job
    v.literal("pre-restore"),       // Auto-backup before restore
    v.literal("cli")                // CLI command
  )),
  createdByAgent: v.optional(v.string()), // Agent ID if created by agent
  
  // Retention
  expiresAt: v.optional(v.number()), // Auto-delete after this timestamp (future enhancement)
  isPinned: v.optional(v.boolean()), // Prevent auto-deletion
}).index("by_created", ["createdAt"])
  .index("by_status", ["status"])
  .index("by_filename", ["filename"]),
```

## Indexes

### 1. by_created
- **Field**: `createdAt` (descending)
- **Purpose**: Default sort order (newest first)
- **Usage**: Main list view

### 2. by_status
- **Field**: `status`
- **Purpose**: Filter by backup health
- **Usage**: Show only valid/corrupted/missing backups

### 3. by_filename
- **Field**: `filename` (unique)
- **Purpose**: Fast lookup by filename
- **Usage**: File-based operations, duplicate prevention

## Data Types

### Backup
```typescript
export interface Backup {
  _id: Id<"backups">;
  _creationTime: number;
  
  // File Information
  filename: string;
  filepath: string;
  sizeBytes: number;
  checksumMD5?: string;
  
  // User Metadata
  description?: string;
  tags?: string[];
  
  // Status
  status: "valid" | "corrupted" | "missing" | "creating" | "restoring";
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  
  // Restoration History
  lastRestoreAt?: number;
  restoreCount?: number;
  
  // Backup Metadata
  workspaceSnapshot?: {
    filesCount: number;
    directoriesCount: number;
    largestFile?: string;
    excludedPatterns: string[];
  };
  
  // Pre-restore backup reference
  isPreRestoreBackup?: boolean;
  preRestoreForBackup?: Id<"backups">;
  
  // Creation Context
  createdBy?: "manual" | "scheduled" | "pre-restore" | "cli";
  createdByAgent?: string;
  
  // Retention
  expiresAt?: number;
  isPinned?: boolean;
}
```

### CreateBackupArgs
```typescript
export interface CreateBackupArgs {
  filename: string;
  filepath: string;
  sizeBytes: number;
  description?: string;
  checksumMD5?: string;
  createdBy?: "manual" | "scheduled" | "pre-restore" | "cli";
  createdByAgent?: string;
  workspaceSnapshot?: {
    filesCount: number;
    directoriesCount: number;
    largestFile?: string;
    excludedPatterns: string[];
  };
}
```

### UpdateBackupArgs
```typescript
export interface UpdateBackupArgs {
  id: Id<"backups">;
  description?: string;
  tags?: string[];
  isPinned?: boolean;
  status?: "valid" | "corrupted" | "missing";
}
```

## Convex Functions

### Queries

#### backups.list
```typescript
export const list = query(async (ctx: any) => {
  const backups = await ctx.db
    .query("backups")
    .withIndex("by_created")
    .order("desc")
    .collect();
  
  return backups;
});
```

#### backups.get
```typescript
export const get = query(
  {
    args: { id: v.id("backups") },
  },
  async (ctx: any, args: any) => {
    return await ctx.db.get(args.id);
  }
);
```

#### backups.getByFilename
```typescript
export const getByFilename = query(
  {
    args: { filename: v.string() },
  },
  async (ctx: any, args: any) => {
    return await ctx.db
      .query("backups")
      .withIndex("by_filename", (q: any) =>
        q.eq("filename", args.filename)
      )
      .first();
  }
);
```

#### backups.listValid
```typescript
export const listValid = query(async (ctx: any) => {
  return await ctx.db
    .query("backups")
    .withIndex("by_status", (q: any) =>
      q.eq("status", "valid")
    )
    .collect();
});
```

#### backups.stats
```typescript
export const stats = query(async (ctx: any) => {
  const backups = await ctx.db.query("backups").collect();
  
  return {
    total: backups.length,
    totalSizeBytes: backups.reduce((sum, b) => sum + b.sizeBytes, 0),
    byStatus: {
      valid: backups.filter(b => b.status === "valid").length,
      corrupted: backups.filter(b => b.status === "corrupted").length,
      missing: backups.filter(b => b.status === "missing").length,
    },
    oldest: backups[backups.length - 1],
    newest: backups[0],
    mostRestored: backups.reduce((max, b) => 
      (b.restoreCount || 0) > (max.restoreCount || 0) ? b : max, 
      backups[0]
    ),
  };
});
```

### Mutations

#### backups.create
```typescript
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
      createdByAgent: v.optional(v.string()),
      workspaceSnapshot: v.optional(v.object({
        filesCount: v.number(),
        directoriesCount: v.number(),
        largestFile: v.optional(v.string()),
        excludedPatterns: v.array(v.string()),
      })),
    },
  },
  async (ctx: any, args: any) => {
    const now = Date.now();
    
    // Check for duplicate filename
    const existing = await ctx.db
      .query("backups")
      .withIndex("by_filename", (q: any) =>
        q.eq("filename", args.filename)
      )
      .first();
    
    if (existing) {
      throw new Error(`Backup with filename ${args.filename} already exists`);
    }
    
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
      createdByAgent: args.createdByAgent,
      workspaceSnapshot: args.workspaceSnapshot,
      restoreCount: 0,
    });
  }
);
```

#### backups.update
```typescript
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
```

#### backups.recordRestore
```typescript
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
    
    // Mark pre-restore backup if provided
    if (args.preRestoreBackupId) {
      await ctx.db.patch(args.preRestoreBackupId, {
        isPreRestoreBackup: true,
        preRestoreForBackup: args.id,
      });
    }
    
    return await ctx.db.get(args.id);
  }
);
```

#### backups.delete
```typescript
export const deleteBackup = mutation(
  {
    args: { id: v.id("backups") },
  },
  async (ctx: any, args: any) => {
    const backup = await ctx.db.get(args.id);
    
    if (!backup) {
      throw new Error("Backup not found");
    }
    
    // Don't allow deleting pinned backups
    if (backup.isPinned) {
      throw new Error("Cannot delete pinned backup");
    }
    
    await ctx.db.delete(args.id);
    
    return { success: true, deletedFilename: backup.filename };
  }
);
```

#### backups.updateStatus
```typescript
export const updateStatus = mutation(
  {
    args: {
      id: v.id("backups"),
      status: v.union(
        v.literal("valid"),
        v.literal("corrupted"),
        v.literal("missing"),
        v.literal("creating"),
        v.literal("restoring")
      ),
    },
  },
  async (ctx: any, args: any) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      updatedAt: Date.now(),
    });
    
    return await ctx.db.get(args.id);
  }
);
```

#### backups.verifyIntegrity
```typescript
export const verifyIntegrity = mutation(
  {
    args: { id: v.id("backups") },
  },
  async (ctx: any, args: any) => {
    const backup = await ctx.db.get(args.id);
    
    if (!backup) {
      throw new Error("Backup not found");
    }
    
    // This would be called by an API route that actually checks the file
    // and computes its MD5. For now, just return the backup.
    return backup;
  }
);
```

## Migration Strategy

### Step 1: Add Schema
Add `backups` table definition to `convex/schema.ts`.

### Step 2: Create Convex Functions
Create `convex/backups.ts` with all queries and mutations.

### Step 3: Seed Existing Backups
```typescript
export const seedExistingBackups = mutation(async (ctx: any) => {
  // This would be called once to populate DB with existing backup files
  // Implementation in API route that scans ~/.openclaw/backups/
});
```

### Step 4: Sync Function (Optional)
```typescript
export const syncWithFilesystem = mutation(async (ctx: any) => {
  // Periodic sync to detect manually added/removed backups
  // Mark missing files, add new files
});
```

## Data Consistency

### Filesystem → Database
- **Backup creation**: Always create DB record after successful file creation
- **Manual backups**: API endpoint scans directory and adds missing records
- **Cron sync**: Periodic job to reconcile filesystem with database

### Database → Filesystem
- **Delete operations**: Delete file first, then DB record (safer)
- **Status updates**: Verify file existence before marking as valid
- **Integrity checks**: Recompute checksums periodically

### Orphan Handling
- **Orphaned DB records**: Status = "missing" if file not found
- **Orphaned files**: Auto-add to DB if not present
- **Cleanup**: Soft-delete orphaned records after 30 days

## Performance Optimizations

### Caching
- Cache backup list in React state
- Only refetch on mutations (create, update, delete)
- Use Convex reactivity for real-time updates

### Lazy Loading
- Don't load `workspaceSnapshot` by default
- Fetch on-demand when user expands backup details
- Paginate if >100 backups

### Background Jobs
- Integrity verification (nightly)
- Status sync (every 5 minutes)
- Cleanup expired backups (daily)

## Security

### Access Control
- Only authenticated users can access backups
- Consider user-specific backups for multi-user setups
- Validate all filenames to prevent path traversal

### Data Protection
- Store checksums for integrity verification
- Encrypt sensitive metadata (future enhancement)
- Audit log for all restore operations

## Backup Metadata Example

```json
{
  "_id": "k37s9d0f8g",
  "_creationTime": 1708704833000,
  "filename": "workspace_AfterFeatureX_20260223_183045.tar.gz",
  "filepath": "/Users/openclaw/.openclaw/backups/workspace_AfterFeatureX_20260223_183045.tar.gz",
  "sizeBytes": 2348712,
  "checksumMD5": "5d41402abc4b2a76b9719d911017c592",
  "description": "After feature X implementation",
  "status": "valid",
  "createdAt": 1708704833000,
  "updatedAt": 1708704833000,
  "restoreCount": 0,
  "workspaceSnapshot": {
    "filesCount": 1247,
    "directoriesCount": 89,
    "largestFile": "projects/scrooge/frontend/node_modules/some-big-package.js",
    "excludedPatterns": ["node_modules", "backups", ".git"]
  },
  "createdBy": "manual",
  "isPinned": false
}
```

## Testing Data

### Seed Function
```typescript
export const seedTestBackups = mutation(async (ctx: any) => {
  const now = Date.now();
  const testBackups = [
    {
      filename: "workspace_20260223_120000.tar.gz",
      filepath: "/Users/openclaw/.openclaw/backups/workspace_20260223_120000.tar.gz",
      sizeBytes: 2400000,
      description: "Morning backup",
      status: "valid" as const,
      createdAt: now - 21600000,
      updatedAt: now - 21600000,
      createdBy: "manual" as const,
      restoreCount: 0,
    },
    {
      filename: "workspace_TestingPhase_20260222_150000.tar.gz",
      filepath: "/Users/openclaw/.openclaw/backups/workspace_TestingPhase_20260222_150000.tar.gz",
      sizeBytes: 1800000,
      description: "Before testing phase",
      status: "valid" as const,
      createdAt: now - 86400000,
      updatedAt: now - 86400000,
      createdBy: "manual" as const,
      restoreCount: 2,
      lastRestoreAt: now - 43200000,
    },
    {
      filename: "workspace_20260220_125333.tar.gz",
      filepath: "/Users/openclaw/.openclaw/backups/workspace_20260220_125333.tar.gz",
      sizeBytes: 1735446,
      status: "corrupted" as const,
      createdAt: now - 259200000,
      updatedAt: now - 259200000,
      createdBy: "scheduled" as const,
      restoreCount: 0,
    },
  ];
  
  for (const backup of testBackups) {
    await ctx.db.insert("backups", backup);
  }
});
```
