# Mission Control - Backups Page Architecture

## Overview
Single-page backup management interface for OpenClaw workspace backups. Provides comprehensive backup creation, browsing, restoration, and metadata management without subpages or tabs.

## Design Philosophy
- **Single Screen**: All functionality visible on one page
- **Zero Navigation**: No tabs, no subpages, no drilling down
- **One-Click Actions**: Direct restore, delete, download buttons
- **Inline Editing**: Edit descriptions without modals
- **Real-time Status**: Live backup state monitoring

## Page Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Mission Control Header                                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ CREATE BACKUP SECTION                                   │ │
│ │                                                           │ │
│ │ Description: [________________________]  [Create Backup] │ │
│ │                                                           │ │
│ │ Status: ✓ Backup created successfully (2.3 MB)          │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BACKUPS LIST                                            │ │
│ │                                                           │ │
│ │ Search: [____]  Sort: [Date ▼]                          │ │
│ │                                                           │ │
│ │ ┌───┬──────────────────┬────────┬────────┬─────┬──────┐ │ │
│ │ │Filename│Date Created│Size│Desc│Status│Actions       │ │ │
│ │ ├───┼──────────────────┼────────┼────────┼─────┼──────┤ │ │
│ │ │ws...│2026-02-23 18:30│2.3MB│[edit]│Valid│[⟲][×][↓] │ │ │
│ │ │ws...│2026-02-20 12:53│1.7MB│After│Valid│[⟲][×][↓]  │ │ │
│ │ │ws...│2026-02-19 18:28│17KB│Fix│Valid│[⟲][×][↓]     │ │ │
│ │ └───┴──────────────────┴────────┴────────┴─────┴──────┘ │ │
│ │                                                           │ │
│ │ Total: 8 backups | 15.2 MB total                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘

RESTORE MODAL (when triggered):
┌─────────────────────────────────────────────┐
│ ⚠️  Restore Workspace Backup                │
│                                              │
│ Backup: workspace_20260220_125333.tar.gz   │
│ Date: 2026-02-20 12:53:33                  │
│ Size: 1.7 MB                                │
│                                              │
│ Current system state will be saved before   │
│ restoration.                                 │
│                                              │
│ ⚠️  This will revert your workspace to:     │
│     2026-02-20 12:53:33                     │
│                                              │
│ ☐ I understand this action                 │
│                                              │
│         [Cancel]  [Restore Workspace]       │
└─────────────────────────────────────────────┘
```

## Component Architecture

### 1. BackupsPage Component
**Location**: `app/app/backups/page.tsx`

**Responsibilities**:
- Root page component
- State orchestration
- API integration
- Modal management

**State**:
```typescript
- backups: Backup[]           // All backups with metadata
- loading: boolean             // Initial load state
- error: string | null         // Error messages
- searchQuery: string          // Search filter
- sortBy: SortField            // Sort configuration
- creatingBackup: boolean      // Backup creation in progress
- restoreModalOpen: boolean    // Restore modal visibility
- selectedBackup: Backup | null // Backup selected for restore
```

### 2. CreateBackupSection Component
**Location**: `app/app/backups/components/CreateBackupSection.tsx`

**Props**:
```typescript
interface CreateBackupSectionProps {
  onCreateBackup: (description: string) => Promise<void>;
  creating: boolean;
  lastSuccess?: BackupResult;
  lastError?: string;
}
```

**Features**:
- Description input field
- Create button with loading state
- Success/error messaging
- Auto-clear success message after 5s

### 3. BackupsTable Component
**Location**: `app/app/backups/components/BackupsTable.tsx`

**Props**:
```typescript
interface BackupsTableProps {
  backups: Backup[];
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => Promise<void>;
  onDownload: (backup: Backup) => void;
  onUpdateDescription: (id: string, description: string) => Promise<void>;
  searchQuery: string;
  sortBy: SortConfig;
  onSearchChange: (query: string) => void;
  onSortChange: (field: SortField) => void;
}
```

**Features**:
- Search bar (filters filename + description)
- Sort dropdown (Date, Size, Name)
- Inline description editing
- Action buttons per row
- Status indicators
- Summary footer (count, total size)

### 4. RestoreModal Component
**Location**: `app/app/backups/components/RestoreModal.tsx`

**Props**:
```typescript
interface RestoreModalProps {
  backup: Backup | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (backup: Backup) => Promise<void>;
  restoring: boolean;
}
```

**Features**:
- Backup details display
- Warning message
- Current timestamp
- Confirmation checkbox
- Disabled confirm button until checked
- Loading state during restore

### 5. BackupRow Component
**Location**: `app/app/backups/components/BackupRow.tsx`

**Props**:
```typescript
interface BackupRowProps {
  backup: Backup;
  onRestore: () => void;
  onDelete: () => Promise<void>;
  onDownload: () => void;
  onUpdateDescription: (description: string) => Promise<void>;
}
```

**Features**:
- Inline description editor
- Status badge
- Action buttons
- File size formatting
- Date formatting
- Loading states per action

## Data Flow

### 1. Initial Load
```
Page Mount
  ↓
Query Convex DB (backups.list)
  ↓
Scan ~/.openclaw/backups/ (API endpoint)
  ↓
Merge file metadata with DB records
  ↓
Display in table
```

### 2. Create Backup
```
User enters description → Click "Create Backup"
  ↓
POST /api/backups/create { description }
  ↓
API executes backup.sh with description
  ↓
API creates DB record (backups.create mutation)
  ↓
Return { filename, size, path }
  ↓
Refresh backup list
  ↓
Show success message
```

### 3. Restore Backup
```
User clicks [RESTORE] → Open modal
  ↓
User checks confirmation → Click "Restore"
  ↓
POST /api/backups/restore { backupId, filename }
  ↓
API creates auto-backup (pre-restore snapshot)
  ↓
API extracts backup to workspace
  ↓
API updates DB record (lastRestoreAt)
  ↓
Show success → Prompt to refresh page
```

### 4. Edit Description
```
User clicks description → Enter edit mode
  ↓
User types → Press Enter or blur
  ↓
PATCH /api/backups/update { id, description }
  ↓
Convex mutation (backups.updateDescription)
  ↓
Update local state
```

## API Endpoints

### GET /api/backups/list
**Response**:
```typescript
{
  backups: Array<{
    _id: string;
    filename: string;
    filepath: string;
    description: string | null;
    sizeBytes: number;
    createdAt: number;
    status: 'valid' | 'corrupted' | 'missing';
    lastRestoreAt?: number;
  }>;
  totalSize: number;
  totalCount: number;
}
```

### POST /api/backups/create
**Request**:
```typescript
{
  description?: string;
}
```
**Response**:
```typescript
{
  _id: string;
  filename: string;
  filepath: string;
  description: string | null;
  sizeBytes: number;
  createdAt: number;
}
```

### POST /api/backups/restore
**Request**:
```typescript
{
  backupId: string;
  filename: string;
}
```
**Response**:
```typescript
{
  success: true;
  preRestoreBackup: string; // Auto-backup filename
  restoredFrom: string;
  timestamp: number;
}
```

### DELETE /api/backups/:id
**Response**:
```typescript
{
  success: true;
  deletedFilename: string;
}
```

### PATCH /api/backups/:id
**Request**:
```typescript
{
  description: string;
}
```
**Response**:
```typescript
{
  success: true;
  backup: Backup;
}
```

### GET /api/backups/download/:filename
**Response**: File stream (tar.gz)

## Integration Points

### 1. Filesystem Integration
- **Backup Directory**: `~/.openclaw/backups/`
- **Backup Script**: `~/.openclaw/workspace/ops/backup.sh`
- **Naming Convention**: `workspace_YYYYMMDD_HHMMSS.tar.gz`
- **Description Backups**: `workspace_{description}_YYYYMMDD_HHMMSS.tar.gz`

### 2. Convex Database
- **Schema**: `backups` table (see DATABASE_SCHEMA.md)
- **Queries**: `backups.list`, `backups.get`
- **Mutations**: `backups.create`, `backups.update`, `backups.delete`

### 3. CLI Integration
- Mission Control should trigger CLI commands via Node child_process
- Backup creation uses existing `ops/backup.sh`
- Restore uses `tar -xzf` with proper error handling

## Error Handling

### Backup Creation Errors
- **Disk space**: Check available space before backup
- **Permission issues**: Catch EACCES errors
- **Corrupted backups**: Verify tar.gz integrity post-creation

### Restore Errors
- **Missing file**: Check existence before restore
- **Corrupted archive**: Validate tar.gz before extraction
- **Workspace lock**: Detect if workspace is in use
- **Rollback**: Keep pre-restore backup for recovery

### UI Error States
- **Toast notifications**: Non-blocking errors (delete failures)
- **Inline errors**: Backup creation errors
- **Modal errors**: Restore failures with recovery options
- **Status badges**: Visual indication of backup health

## Performance Considerations

### 1. Large Backup Lists
- **Pagination**: If >100 backups, add pagination
- **Virtual scrolling**: For >50 backups
- **Lazy loading**: Load file metadata on-demand

### 2. File Operations
- **Async processing**: All filesystem operations async
- **Progress indicators**: For long operations (>2s)
- **Debounced search**: 300ms debounce on search input

### 3. Backup Creation
- **Background execution**: Run backup.sh in background
- **Progress updates**: Stream output or show spinner
- **Size estimation**: Show estimated size before backup

## Security Considerations

### 1. File Access
- **Path validation**: Prevent directory traversal
- **Whitelist directory**: Only access `~/.openclaw/backups/`
- **Filename sanitization**: Validate backup filenames

### 2. Restore Safety
- **Pre-restore backup**: Always create safety backup
- **Confirmation required**: Checkbox + button confirmation
- **Audit log**: Log all restore operations

### 3. Download Safety
- **Authentication**: Verify user session
- **Rate limiting**: Prevent abuse
- **File size limits**: Warn for large downloads

## Accessibility

### 1. Keyboard Navigation
- **Tab order**: Logical flow through actions
- **Enter key**: Submit forms, confirm modals
- **Escape key**: Close modals
- **Arrow keys**: Navigate table rows

### 2. Screen Readers
- **ARIA labels**: All interactive elements
- **Status announcements**: Success/error messages
- **Table semantics**: Proper table markup
- **Modal focus trap**: Keep focus in modal

### 3. Visual Accessibility
- **High contrast**: WCAG AA compliance
- **Color blindness**: Don't rely on color alone
- **Font sizes**: Readable 14px minimum
- **Focus indicators**: Visible focus rings

## Future Enhancements (Not MVP)

### Phase 2
- Scheduled backups (integration with Calendar/Cron)
- Backup compression levels
- Differential/incremental backups
- Cloud backup sync (S3, GCS)

### Phase 3
- Backup comparison (diff view)
- Selective restore (file-level)
- Encrypted backups
- Backup verification tests

### Phase 4
- Multi-workspace support
- Backup templates
- Automated cleanup policies
- Backup analytics dashboard

## Testing Requirements
See `BACKUPS_PAGE_TESTING.md` for comprehensive testing strategy.

## Implementation Timeline
- **Day 1**: Database schema, API routes
- **Day 2**: React components, basic UI
- **Day 3**: Backup/restore logic, error handling
- **Day 4**: Polish, accessibility, testing
- **Day 5**: Integration testing, documentation

## Success Metrics
- Time to create backup: <10s for typical workspace
- Time to restore: <30s for typical workspace
- Error rate: <1% for backup operations
- User satisfaction: 4.5+ stars (usability testing)
