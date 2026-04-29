# Backups Page - React Component Specifications

## Component Hierarchy

```
BackupsPage (page.tsx)
├── CreateBackupSection
│   └── StatusMessage
├── BackupsTable
│   ├── SearchBar
│   ├── SortDropdown
│   ├── BackupRow (multiple)
│   │   ├── InlineDescriptionEditor
│   │   ├── StatusBadge
│   │   └── ActionButtons
│   └── TableFooter
└── RestoreModal
    ├── BackupDetails
    ├── WarningMessage
    └── ConfirmationCheckbox
```

## Component Specifications

---

## 1. BackupsPage

**File**: `app/app/backups/page.tsx`

### Purpose
Root page component that orchestrates all backup operations and state management.

### State Management
```typescript
interface BackupsPageState {
  backups: Backup[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: 'date' | 'size' | 'name';
  sortOrder: 'asc' | 'desc';
  creatingBackup: boolean;
  lastBackupResult: BackupResult | null;
  restoreModalOpen: boolean;
  selectedBackup: Backup | null;
  restoringBackup: boolean;
}
```

### Hooks
```typescript
// Convex
const backups = useQuery(api.backups.list);
const createBackup = useMutation(api.backups.create);
const updateBackup = useMutation(api.backups.update);
const deleteBackup = useMutation(api.backups.deleteBackup);
const recordRestore = useMutation(api.backups.recordRestore);

// Local state
const [searchQuery, setSearchQuery] = useState("");
const [sortBy, setSortBy] = useState<SortField>("date");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
```

### Handlers
```typescript
const handleCreateBackup = async (description: string): Promise<void>;
const handleRestore = (backup: Backup): void;
const handleConfirmRestore = async (): Promise<void>;
const handleDelete = async (backup: Backup): Promise<void>;
const handleDownload = (backup: Backup): void;
const handleUpdateDescription = async (id: string, description: string): Promise<void>;
const handleSearch = (query: string): void;
const handleSort = (field: SortField): void;
```

### JSX Structure
```tsx
<div className="space-y-6">
  {/* Error Banner */}
  {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
  
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
    onSearchChange={handleSearch}
    onSortChange={handleSort}
    loading={loading}
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
```

### Computed Values
```typescript
const filteredAndSortedBackups = useMemo(() => {
  let filtered = backups || [];
  
  // Search filter
  if (searchQuery) {
    filtered = filtered.filter(b =>
      b.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Sort
  return filtered.sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'date':
        comparison = a.createdAt - b.createdAt;
        break;
      case 'size':
        comparison = a.sizeBytes - b.sizeBytes;
        break;
      case 'name':
        comparison = a.filename.localeCompare(b.filename);
        break;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
}, [backups, searchQuery, sortBy, sortOrder]);
```

---

## 2. CreateBackupSection

**File**: `app/app/backups/components/CreateBackupSection.tsx`

### Props
```typescript
interface CreateBackupSectionProps {
  onCreateBackup: (description: string) => Promise<void>;
  creating: boolean;
  lastSuccess?: BackupResult | null;
  lastError?: string | null;
}

interface BackupResult {
  filename: string;
  sizeBytes: number;
  timestamp: number;
}
```

### State
```typescript
const [description, setDescription] = useState("");
const [showSuccess, setShowSuccess] = useState(false);
```

### Handlers
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  await onCreateBackup(description);
  setDescription("");
};

// Auto-dismiss success message after 5 seconds
useEffect(() => {
  if (lastSuccess) {
    setShowSuccess(true);
    const timer = setTimeout(() => setShowSuccess(false), 5000);
    return () => clearTimeout(timer);
  }
}, [lastSuccess]);
```

### JSX Structure
```tsx
<div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
  <h2 className="text-lg font-semibold text-slate-900 mb-4">
    Create New Backup
  </h2>
  
  <form onSubmit={handleSubmit} className="space-y-4">
    <div className="flex gap-3">
      <input
        type="text"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (e.g., 'After feature X', 'Before migration')"
        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        disabled={creating}
      />
      <button
        type="submit"
        disabled={creating}
        className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
      >
        {creating ? (
          <span className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={18} />
            Creating...
          </span>
        ) : (
          "Create Backup"
        )}
      </button>
    </div>
    
    {/* Success Message */}
    {showSuccess && lastSuccess && (
      <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
        <CheckCircle size={20} className="text-green-600" />
        <span className="text-sm text-green-700">
          Backup created successfully: {lastSuccess.filename} (
          {formatBytes(lastSuccess.sizeBytes)})
        </span>
      </div>
    )}
    
    {/* Error Message */}
    {lastError && (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle size={20} className="text-red-600" />
        <span className="text-sm text-red-700">{lastError}</span>
      </div>
    )}
  </form>
</div>
```

### Styling
- **Card**: White background, subtle shadow
- **Input**: Full-width with focus ring
- **Button**: Primary blue, disabled state
- **Success**: Green background, auto-dismiss
- **Error**: Red background, persistent

---

## 3. BackupsTable

**File**: `app/app/backups/components/BackupsTable.tsx`

### Props
```typescript
interface BackupsTableProps {
  backups: Backup[];
  onRestore: (backup: Backup) => void;
  onDelete: (backup: Backup) => Promise<void>;
  onDownload: (backup: Backup) => void;
  onUpdateDescription: (id: string, description: string) => Promise<void>;
  searchQuery: string;
  sortBy: SortField;
  sortOrder: "asc" | "desc";
  onSearchChange: (query: string) => void;
  onSortChange: (field: SortField) => void;
  loading: boolean;
}
```

### Computed Values
```typescript
const totalSize = useMemo(() => 
  backups.reduce((sum, b) => sum + b.sizeBytes, 0),
  [backups]
);
```

### JSX Structure
```tsx
<div className="bg-white border border-slate-200 rounded-lg shadow-sm">
  {/* Header */}
  <div className="p-6 border-b border-slate-200">
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-slate-900">
        Backup History
      </h2>
      <span className="text-sm text-slate-600">
        {backups.length} backups · {formatBytes(totalSize)}
      </span>
    </div>
    
    {/* Search and Sort */}
    <div className="flex gap-3">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search backups..."
          className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      
      <select
        value={`${sortBy}-${sortOrder}`}
        onChange={(e) => {
          const [field, order] = e.target.value.split('-');
          onSortChange(field as SortField);
        }}
        className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="date-desc">Newest First</option>
        <option value="date-asc">Oldest First</option>
        <option value="size-desc">Largest First</option>
        <option value="size-asc">Smallest First</option>
        <option value="name-asc">Name A-Z</option>
        <option value="name-desc">Name Z-A</option>
      </select>
    </div>
  </div>
  
  {/* Table */}
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-slate-50 border-b border-slate-200">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
            Filename
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
            Date Created
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
            Size
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
            Description
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
            Status
          </th>
          <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {loading ? (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center">
              <Loader2 className="animate-spin mx-auto mb-2 text-slate-400" size={32} />
              <p className="text-slate-600">Loading backups...</p>
            </td>
          </tr>
        ) : backups.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-6 py-12 text-center">
              <Database className="mx-auto mb-2 text-slate-400" size={32} />
              <p className="text-slate-600">No backups found</p>
              {searchQuery && (
                <button
                  onClick={() => onSearchChange("")}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  Clear search
                </button>
              )}
            </td>
          </tr>
        ) : (
          backups.map((backup) => (
            <BackupRow
              key={backup._id}
              backup={backup}
              onRestore={() => onRestore(backup)}
              onDelete={() => onDelete(backup)}
              onDownload={() => onDownload(backup)}
              onUpdateDescription={(desc) => onUpdateDescription(backup._id, desc)}
            />
          ))
        )}
      </tbody>
    </table>
  </div>
</div>
```

---

## 4. BackupRow

**File**: `app/app/backups/components/BackupRow.tsx`

### Props
```typescript
interface BackupRowProps {
  backup: Backup;
  onRestore: () => void;
  onDelete: () => Promise<void>;
  onDownload: () => void;
  onUpdateDescription: (description: string) => Promise<void>;
}
```

### State
```typescript
const [editing, setEditing] = useState(false);
const [editValue, setEditValue] = useState(backup.description || "");
const [deleting, setDeleting] = useState(false);
const [saving, setSaving] = useState(false);
```

### Handlers
```typescript
const handleSaveDescription = async () => {
  if (editValue === backup.description) {
    setEditing(false);
    return;
  }
  
  setSaving(true);
  try {
    await onUpdateDescription(editValue);
    setEditing(false);
  } catch (error) {
    console.error("Failed to save description:", error);
  } finally {
    setSaving(false);
  }
};

const handleDelete = async () => {
  if (!confirm(`Delete backup ${backup.filename}?`)) return;
  
  setDeleting(true);
  try {
    await onDelete();
  } catch (error) {
    console.error("Failed to delete backup:", error);
    setDeleting(false);
  }
};
```

### JSX Structure
```tsx
<tr className="hover:bg-slate-50 transition-colors">
  {/* Filename */}
  <td className="px-6 py-4">
    <div className="flex items-center gap-2">
      <FileArchive size={16} className="text-slate-400" />
      <span className="text-sm font-medium text-slate-900 font-mono">
        {backup.filename}
      </span>
    </div>
  </td>
  
  {/* Date */}
  <td className="px-6 py-4 text-sm text-slate-700">
    {formatDate(backup.createdAt)}
  </td>
  
  {/* Size */}
  <td className="px-6 py-4 text-sm text-slate-700">
    {formatBytes(backup.sizeBytes)}
  </td>
  
  {/* Description */}
  <td className="px-6 py-4">
    {editing ? (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSaveDescription}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveDescription();
            if (e.key === 'Escape') {
              setEditValue(backup.description || "");
              setEditing(false);
            }
          }}
          autoFocus
          className="flex-1 px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={saving}
        />
        {saving && <Loader2 className="animate-spin text-blue-600" size={14} />}
      </div>
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="text-sm text-slate-600 hover:text-slate-900 text-left"
      >
        {backup.description || (
          <span className="italic text-slate-400">Add description...</span>
        )}
      </button>
    )}
  </td>
  
  {/* Status */}
  <td className="px-6 py-4">
    <StatusBadge status={backup.status} />
  </td>
  
  {/* Actions */}
  <td className="px-6 py-4">
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={onRestore}
        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        title="Restore"
        disabled={backup.status !== 'valid'}
      >
        <RotateCcw size={16} />
      </button>
      <button
        onClick={handleDelete}
        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Delete"
        disabled={deleting}
      >
        {deleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
      </button>
      <button
        onClick={onDownload}
        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        title="Download"
      >
        <Download size={16} />
      </button>
    </div>
  </td>
</tr>
```

---

## 5. StatusBadge

**File**: `app/app/backups/components/StatusBadge.tsx`

### Props
```typescript
interface StatusBadgeProps {
  status: "valid" | "corrupted" | "missing" | "creating" | "restoring";
}
```

### JSX Structure
```tsx
const statusConfig = {
  valid: {
    label: "Valid",
    icon: CheckCircle,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  corrupted: {
    label: "Corrupted",
    icon: AlertTriangle,
    className: "bg-red-100 text-red-700 border-red-200",
  },
  missing: {
    label: "Missing",
    icon: XCircle,
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  creating: {
    label: "Creating",
    icon: Loader2,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  restoring: {
    label: "Restoring",
    icon: Loader2,
    className: "bg-purple-100 text-purple-700 border-purple-200",
  },
};

const config = statusConfig[status];
const Icon = config.icon;

return (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border rounded-full ${config.className}`}>
    <Icon size={12} className={config.icon === Loader2 ? "animate-spin" : ""} />
    {config.label}
  </span>
);
```

---

## 6. RestoreModal

**File**: `app/app/backups/components/RestoreModal.tsx`

### Props
```typescript
interface RestoreModalProps {
  backup: Backup | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  restoring: boolean;
}
```

### State
```typescript
const [confirmed, setConfirmed] = useState(false);
```

### Effects
```typescript
// Reset confirmation when modal opens/closes
useEffect(() => {
  setConfirmed(false);
}, [open, backup]);
```

### JSX Structure
```tsx
{open && backup && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <AlertTriangle size={24} className="text-orange-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            Restore Workspace Backup
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 rounded"
          disabled={restoring}
        >
          <X size={20} />
        </button>
      </div>
      
      {/* Body */}
      <div className="p-6 space-y-4">
        {/* Backup Details */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Backup:</span>
            <span className="font-medium text-slate-900 font-mono">
              {backup.filename}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Created:</span>
            <span className="font-medium text-slate-900">
              {formatDate(backup.createdAt)}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Size:</span>
            <span className="font-medium text-slate-900">
              {formatBytes(backup.sizeBytes)}
            </span>
          </div>
          {backup.description && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Description:</span>
              <span className="font-medium text-slate-900">
                {backup.description}
              </span>
            </div>
          )}
        </div>
        
        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <p className="text-sm text-orange-800">
            <strong>Warning:</strong> This will revert your workspace to{" "}
            <strong>{formatDate(backup.createdAt)}</strong>.
          </p>
          <p className="text-sm text-orange-700 mt-2">
            A backup of your current workspace will be created automatically
            before restoration.
          </p>
        </div>
        
        {/* Confirmation */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
            disabled={restoring}
          />
          <span className="text-sm text-slate-700">
            I understand this action will restore my workspace to the selected
            backup point, and my current state will be backed up first.
          </span>
        </label>
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          disabled={restoring}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={!confirmed || restoring}
          className="px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {restoring ? (
            <span className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={18} />
              Restoring...
            </span>
          ) : (
            "Restore Workspace"
          )}
        </button>
      </div>
    </div>
  </div>
)}
```

---

## Utility Functions

### formatBytes
```typescript
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
```

### formatDate
```typescript
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
```

### formatRelativeTime
```typescript
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}
```

## Icons (lucide-react)

```typescript
import {
  FileArchive,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Loader2,
  RotateCcw,
  Trash2,
  Download,
  Search,
  Database,
  AlertCircle,
  X,
} from "lucide-react";
```

## Styling Guidelines

### Colors
- **Primary**: Blue 600/700 (#2563eb / #1d4ed8)
- **Success**: Green 600/700
- **Warning**: Orange 600/700
- **Danger**: Red 600/700
- **Neutral**: Slate 600/700

### Spacing
- **Section padding**: 6 (1.5rem)
- **Card padding**: 6
- **Button padding**: px-4 py-2
- **Table cell padding**: px-6 py-4

### Typography
- **Headings**: font-semibold
- **Body**: text-sm / text-base
- **Mono**: font-mono (filenames)

### Transitions
- **Colors**: transition-colors
- **All**: transition-all
- **Duration**: default (150ms)

## Accessibility

### Keyboard Navigation
- **Tab**: Move through interactive elements
- **Enter**: Submit forms, confirm actions
- **Escape**: Close modals, cancel editing
- **Space**: Toggle checkboxes

### ARIA Labels
```tsx
<button aria-label="Restore backup" title="Restore">
  <RotateCcw />
</button>
```

### Focus Management
```tsx
// Auto-focus first input when modal opens
<input ref={inputRef} autoFocus />

// Trap focus in modal
<FocusTrap active={open}>
  <RestoreModal />
</FocusTrap>
```

## Performance Optimizations

### React.memo
```typescript
export const BackupRow = React.memo(BackupRowComponent);
export const StatusBadge = React.memo(StatusBadgeComponent);
```

### useMemo
```typescript
const filteredBackups = useMemo(() => {
  // Filter logic
}, [backups, searchQuery]);
```

### useCallback
```typescript
const handleDelete = useCallback(async (backup: Backup) => {
  // Delete logic
}, [deleteBackup]);
```

### Debounced Search
```typescript
const debouncedSearch = useMemo(
  () => debounce((query: string) => setSearchQuery(query), 300),
  []
);
```

## Error Boundaries

```typescript
class BackupsErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-red-600" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-slate-600 mb-4">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```
