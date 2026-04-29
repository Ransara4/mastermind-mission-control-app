# Mission Control: Backup & Restore System
## Single-Page Design Architecture

**Version:** 2.0 - Single Page Focus  
**Date:** 2026-02-23  
**Status:** Production-Ready - Single Page Design

---

## Core Principle: ONE POWERFUL PAGE

Everything accessible on `/app/backups` with no subpages, no navigation tabs. Just one clean, efficient interface where you can:
- Create backups instantly
- See all backup history
- Restore with one click
- Edit descriptions inline
- Search and filter easily

---

## Page Layout: /app/backups

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔄 Backups                                      [Stats Cards]    │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 📦 Backup Now                                             │  │
│ │ ┌─────────────────────────────────────────────────────┐  │  │
│ │ │ Description: _________________________________ [Tag] │  │  │
│ │ └─────────────────────────────────────────────────────┘  │  │
│ │ [Create Backup Now]                          Creating... │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ 🔍 [Search...] [Filter ▼] [Sort ▼]              50 total │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Description          │Date    │Size│Status │Actions         ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │✏️ After cold email...│2h ago  │1.2G│✓Valid │[Restore][⬇][🗑]││
│ │✏️ Before DB migrat...│1d ago  │980M│✓Valid │[Restore][⬇][🗑]││
│ │✏️ Fresh install      │Feb 10  │19M │⚠Check│[Restore][⬇][🗑]││
│ │✏️ Daily backup       │Feb 9   │1.1G│✓Valid │[Restore][⬇][🗑]││
│ │✏️ Milestone v1.0     │Feb 8   │1.0G│✓Valid │[Restore][⬇][🗑]││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                   │
│ [Load More...]                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Top Section: Quick Backup Creation

### Layout
```tsx
<div className="bg-white dark:bg-gray-800 p-6 rounded-lg border mb-6">
  <div className="flex items-center gap-3 mb-4">
    <Archive className="w-6 h-6" />
    <h2 className="text-xl font-bold">Backup Now</h2>
  </div>
  
  <div className="flex gap-3">
    <input
      type="text"
      placeholder="Description: e.g., 'After feature X', 'Before database migration'"
      className="flex-1 px-4 py-2 border rounded-lg"
      value={description}
      onChange={(e) => setDescription(e.target.value)}
      onKeyPress={(e) => e.key === 'Enter' && handleBackup()}
    />
    
    <button
      onClick={handleBackup}
      disabled={creating || !description}
      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
    >
      {creating ? 'Creating...' : 'Create Backup'}
    </button>
  </div>
  
  {/* Optional: Add tags */}
  <div className="mt-3 flex gap-2">
    <input
      type="text"
      placeholder="Tags (optional): feature, milestone, pre-deploy"
      className="flex-1 px-3 py-1 text-sm border rounded"
      value={tags}
      onChange={(e) => setTags(e.target.value)}
    />
  </div>
</div>
```

### Features
- **Always visible** at top of page
- **One input field** for description (required)
- **Optional tags** field (comma-separated)
- **Enter key** triggers backup creation
- **Live status** shows "Creating..." when in progress
- **Auto-clear** input after successful backup
- **Focus trap** keeps cursor in input for quick backups

---

## 2. Quick Stats Cards (Optional, Top Right)

```tsx
<div className="grid grid-cols-3 gap-4 mb-6">
  <StatCard label="Total Backups" value={stats.totalBackups} />
  <StatCard label="Total Size" value={formatSize(stats.totalSize)} />
  <StatCard label="Last Backup" value={formatRelativeTime(stats.lastBackup)} />
</div>
```

---

## 3. Search & Filter Bar

### Layout
```tsx
<div className="bg-white dark:bg-gray-800 p-4 rounded-lg border mb-4 flex items-center gap-3">
  {/* Search */}
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
    <input
      type="text"
      placeholder="Search backups by description, tags, or filename..."
      className="w-full pl-10 pr-4 py-2 border rounded-lg"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  </div>
  
  {/* Filter Dropdown */}
  <select
    value={filter}
    onChange={(e) => setFilter(e.target.value)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="all">All Backups</option>
    <option value="manual">Manual Only</option>
    <option value="auto">Auto Only</option>
    <option value="today">Today</option>
    <option value="week">This Week</option>
    <option value="month">This Month</option>
  </select>
  
  {/* Sort Dropdown */}
  <select
    value={sort}
    onChange={(e) => setSort(e.target.value)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="date-desc">Newest First</option>
    <option value="date-asc">Oldest First</option>
    <option value="size-desc">Largest First</option>
    <option value="size-asc">Smallest First</option>
  </select>
  
  {/* Result Count */}
  <div className="text-sm text-gray-500 whitespace-nowrap">
    {filteredBackups.length} backups
  </div>
</div>
```

### Features
- **Live search** with debouncing (300ms)
- **Smart filters** for common date ranges
- **Multiple sort options** for flexibility
- **Result count** always visible

---

## 4. Backup List/Table (Main Section)

### Table Layout
```tsx
<div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
  <table className="w-full">
    <thead className="bg-gray-50 dark:bg-gray-900 border-b">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Description
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Date Created
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Size
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
          Status
        </th>
        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
          Actions
        </th>
      </tr>
    </thead>
    <tbody className="divide-y">
      {backups.map(backup => (
        <BackupRow
          key={backup._id}
          backup={backup}
          onRestore={handleRestore}
          onDelete={handleDelete}
          onDownload={handleDownload}
          onUpdateDescription={handleUpdateDescription}
        />
      ))}
    </tbody>
  </table>
  
  {/* Load More */}
  {hasMore && (
    <div className="p-4 text-center border-t">
      <button
        onClick={loadMore}
        className="px-4 py-2 text-sm text-blue-600 hover:underline"
      >
        Load More...
      </button>
    </div>
  )}
</div>
```

### Backup Row Component
```tsx
function BackupRow({ backup, onRestore, onDelete, onDownload, onUpdateDescription }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(backup.description);
  
  const handleSave = () => {
    onUpdateDescription(backup._id, description);
    setEditing(false);
  };
  
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900">
      {/* Description (Editable) */}
      <td className="px-6 py-4">
        {editing ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="flex-1 px-2 py-1 text-sm border rounded"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleSave()}
              onBlur={handleSave}
            />
          </div>
        ) : (
          <div
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setEditing(true)}
          >
            <span className="font-medium">{backup.description}</span>
            <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
          </div>
        )}
        {/* Tags */}
        {backup.tags.length > 0 && (
          <div className="flex gap-1 mt-1">
            {backup.tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </td>
      
      {/* Date */}
      <td className="px-6 py-4 text-sm text-gray-500">
        <div>{formatRelativeTime(backup.createdAt)}</div>
        <div className="text-xs opacity-70">
          {formatAbsoluteDate(backup.createdAt)}
        </div>
      </td>
      
      {/* Size */}
      <td className="px-6 py-4 text-sm text-gray-500">
        {formatFileSize(backup.size)}
      </td>
      
      {/* Status */}
      <td className="px-6 py-4">
        <StatusBadge backup={backup} />
      </td>
      
      {/* Actions */}
      <td className="px-6 py-4 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onRestore(backup)}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Restore
          </button>
          <button
            onClick={() => onDownload(backup)}
            className="p-2 text-gray-600 hover:text-blue-600"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(backup)}
            className="p-2 text-gray-600 hover:text-red-600"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
```

### Status Badge Component
```tsx
function StatusBadge({ backup }) {
  if (backup.isValid) {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Valid</span>
      </div>
    );
  }
  
  if (backup.validationError) {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <XCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Corrupted</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-yellow-600">
      <AlertCircle className="w-4 h-4" />
      <span className="text-sm font-medium">Needs Check</span>
    </div>
  );
}
```

---

## 5. Restore Confirmation Modal

### Modal Layout
```tsx
<Modal open={restoreModalOpen} onClose={() => setRestoreModalOpen(false)}>
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg">
    {/* Header */}
    <div className="flex items-center gap-3 mb-4">
      <AlertTriangle className="w-6 h-6 text-yellow-600" />
      <h3 className="text-xl font-bold">Restore Backup</h3>
    </div>
    
    {/* Backup Details */}
    <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div className="mb-2">
        <div className="text-sm text-gray-500">Backup Description</div>
        <div className="font-medium">{selectedBackup.description}</div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Created</div>
          <div>{formatAbsoluteDate(selectedBackup.createdAt)}</div>
        </div>
        <div>
          <div className="text-gray-500">Size</div>
          <div>{formatFileSize(selectedBackup.size)}</div>
        </div>
      </div>
    </div>
    
    {/* Warning */}
    <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
      <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
        ⚠️ Warning: This will revert your workspace
      </div>
      <div className="text-sm text-yellow-700 dark:text-yellow-300">
        Restoring will replace your current workspace with the state from{' '}
        <strong>{formatAbsoluteDate(selectedBackup.createdAt)}</strong>.
        All changes made after that time will be lost.
      </div>
    </div>
    
    {/* Safety Backup Option */}
    <label className="flex items-start gap-3 mb-6 cursor-pointer">
      <input
        type="checkbox"
        checked={createSafetyBackup}
        onChange={(e) => setCreateSafetyBackup(e.target.checked)}
        className="mt-1"
      />
      <div>
        <div className="font-medium">Create safety backup first (Recommended)</div>
        <div className="text-sm text-gray-500">
          Automatically backup current state before restoring.
          This allows you to undo if needed.
        </div>
      </div>
    </label>
    
    {/* Confirmation Checkbox */}
    <label className="flex items-center gap-3 mb-6 cursor-pointer">
      <input
        type="checkbox"
        checked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="font-medium">
        I understand this will restore to {formatAbsoluteDate(selectedBackup.createdAt)}
      </span>
    </label>
    
    {/* Actions */}
    <div className="flex gap-3 justify-end">
      <button
        onClick={() => setRestoreModalOpen(false)}
        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirmRestore}
        disabled={!confirmed}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        Restore Backup
      </button>
    </div>
  </div>
</Modal>
```

---

## 6. Restore Progress Modal

### Layout
```tsx
<Modal open={restoring} onClose={() => {}}>
  <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
    {/* Header */}
    <div className="text-center mb-6">
      <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
      <h3 className="text-xl font-bold mb-2">Restoring Backup...</h3>
      <div className="text-sm text-gray-500">{restoreStatus.currentStep}</div>
    </div>
    
    {/* Progress Bar */}
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span>Progress</span>
        <span>{restoreStatus.progressPercent}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${restoreStatus.progressPercent}%` }}
        />
      </div>
    </div>
    
    {/* Steps */}
    <div className="space-y-2 text-sm">
      {[
        'Validating backup',
        'Creating safety backup',
        'Stopping services',
        'Extracting files',
        'Restoring workspace',
        'Validating restore',
        'Restarting services'
      ].map((step, i) => (
        <div
          key={step}
          className={`flex items-center gap-2 ${
            i < Math.floor(restoreStatus.progressPercent / 14)
              ? 'text-green-600'
              : 'text-gray-400'
          }`}
        >
          {i < Math.floor(restoreStatus.progressPercent / 14) ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
          <span>{step}</span>
        </div>
      ))}
    </div>
    
    {/* Warning */}
    <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm text-yellow-800 dark:text-yellow-200">
      ⚠️ Do not close this window or refresh the page
    </div>
  </div>
</Modal>
```

---

## 7. Complete Page Component

### Full Implementation
```tsx
'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Archive, Search, Download, Trash2, Edit2, RefreshCw,
  CheckCircle, XCircle, AlertCircle, AlertTriangle, Circle
} from 'lucide-react';

export default function BackupsPage() {
  // State
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date-desc');
  
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState({ progressPercent: 0, currentStep: '' });
  
  // Queries
  const backups = useQuery(api.backups.listBackups, { search, filter, sort });
  const stats = useQuery(api.backups.getBackupStats, {});
  
  // Mutations
  const updateBackup = useMutation(api.backups.updateBackup);
  const deleteBackup = useMutation(api.backups.deleteBackup);
  
  // Handlers
  const handleBackup = async () => {
    if (!description) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          backupType: 'manual',
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setDescription('');
        setTags('');
        // Success notification handled by real-time update
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setCreating(false);
    }
  };
  
  const handleRestore = (backup) => {
    setSelectedBackup(backup);
    setRestoreModalOpen(true);
    setConfirmed(false);
  };
  
  const handleConfirmRestore = async () => {
    if (!confirmed) return;
    
    setRestoreModalOpen(false);
    setRestoring(true);
    
    try {
      const response = await fetch('/api/restore/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId: selectedBackup._id,
          createSafetyBackup,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        // Poll for progress
        pollRestoreProgress(result.operationId);
      } else {
        alert(`Error: ${result.error}`);
        setRestoring(false);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
      setRestoring(false);
    }
  };
  
  const pollRestoreProgress = async (operationId) => {
    const interval = setInterval(async () => {
      const status = await fetch(`/api/restore/progress/${operationId}`).then(r => r.json());
      
      setRestoreStatus(status);
      
      if (status.status === 'completed') {
        clearInterval(interval);
        setRestoring(false);
        alert('✅ Restore complete! Please refresh the page.');
      } else if (status.status === 'failed') {
        clearInterval(interval);
        setRestoring(false);
        alert(`❌ Restore failed: ${status.error}`);
      }
    }, 1000);
  };
  
  const handleDelete = async (backup) => {
    if (!confirm(`Delete backup: ${backup.description}?`)) return;
    
    try {
      await deleteBackup({ backupId: backup._id, deleteFile: true });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDownload = (backup) => {
    window.open(`/api/backup/download?path=${encodeURIComponent(backup.filepath)}`, '_blank');
  };
  
  const handleUpdateDescription = async (backupId, newDescription) => {
    try {
      await updateBackup({ backupId, description: newDescription });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  if (!backups || !stats) {
    return <div className="p-8">Loading...</div>;
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Backups</h1>
        </div>
        
        {/* Quick Stats */}
        <div className="flex gap-4">
          <StatCard label="Total" value={stats.totalBackups} />
          <StatCard label="Size" value={formatFileSize(stats.totalSize)} />
          <StatCard label="Last" value={formatRelativeTime(stats.lastBackupDate)} />
        </div>
      </div>
      
      {/* Quick Backup Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Archive className="w-6 h-6" />
          <h2 className="text-xl font-bold">Backup Now</h2>
        </div>
        
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Description: e.g., 'After feature X', 'Before database migration'"
            className="flex-1 px-4 py-2 border rounded-lg"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleBackup()}
          />
          
          <button
            onClick={handleBackup}
            disabled={creating || !description}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
          >
            {creating ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Tags (optional): feature, milestone, pre-deploy"
          className="w-full mt-3 px-3 py-2 text-sm border rounded-lg"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>
      
      {/* Search & Filter */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border mb-4 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search backups..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="all">All Backups</option>
          <option value="manual">Manual Only</option>
          <option value="auto">Auto Only</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
        </select>
        
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="size-desc">Largest First</option>
        </select>
        
        <div className="text-sm text-gray-500 whitespace-nowrap">
          {backups.length} backups
        </div>
      </div>
      
      {/* Backup Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {backups.map(backup => (
              <BackupRow
                key={backup._id}
                backup={backup}
                onRestore={handleRestore}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onUpdateDescription={handleUpdateDescription}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Restore Confirmation Modal */}
      {restoreModalOpen && selectedBackup && (
        <RestoreModal
          backup={selectedBackup}
          confirmed={confirmed}
          setConfirmed={setConfirmed}
          createSafetyBackup={createSafetyBackup}
          setCreateSafetyBackup={setCreateSafetyBackup}
          onClose={() => setRestoreModalOpen(false)}
          onConfirm={handleConfirmRestore}
        />
      )}
      
      {/* Restore Progress Modal */}
      {restoring && (
        <RestoreProgressModal status={restoreStatus} />
      )}
    </div>
  );
}

// Helper components would go here...
```

---

## Database Schema (Unchanged)

The database schema from the original design remains the same. See `BACKUP_DATABASE_SCHEMA.sql`.

---

## API Endpoints (Unchanged)

All API endpoints remain the same. See original architecture document.

---

## Key Benefits of Single-Page Design

### 1. Simplicity
- **No navigation** needed
- **Everything visible** at once
- **Faster workflow** - no page loads

### 2. Speed
- **One page load** instead of multiple
- **Real-time updates** via Convex
- **Instant search/filter** without navigation

### 3. Better UX
- **Backup history** always visible
- **Create backup** always accessible
- **Quick comparison** between backups
- **Inline editing** for descriptions

### 4. Reduced Complexity
- **Fewer components** to build
- **Less routing** logic
- **Simpler state management**
- **Easier testing**

---

## Implementation Priority

### Phase 1 (Day 1-2): Basic View
- [ ] Page layout with header
- [ ] Backup list/table display
- [ ] Fetch backups from Convex
- [ ] Display basic info (description, date, size)

### Phase 2 (Day 3-4): Create Backup
- [ ] "Backup Now" section
- [ ] API endpoint for backup creation
- [ ] Success notification
- [ ] Real-time list update

### Phase 3 (Day 5-6): Restore
- [ ] Restore confirmation modal
- [ ] Restore API endpoint
- [ ] Progress modal with live updates
- [ ] Success/error handling

### Phase 4 (Day 7-8): Enhancements
- [ ] Inline description editing
- [ ] Search and filter
- [ ] Download functionality
- [ ] Delete confirmation

### Phase 5 (Day 9-10): Polish
- [ ] Status indicators
- [ ] Tags display
- [ ] Loading states
- [ ] Error boundaries
- [ ] Testing

---

## Summary

This single-page design is:
- ✅ **Simpler** - One page, no subpages
- ✅ **Faster** - No navigation overhead
- ✅ **Better UX** - Everything accessible at once
- ✅ **Easier to build** - Fewer components
- ✅ **More maintainable** - Less complexity

All functionality lives on `/app/backups` with modals for confirmations and progress.
