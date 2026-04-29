# Backup & Restore: Single-Page Implementation Guide

## Quick Start - Single Page Design

This guide shows you how to implement the **single-page** Backup & Restore system where everything lives on `/app/backups`.

---

## What You're Building

**One powerful page** with:
1. **Top section:** Quick "Backup Now" with description input
2. **Search/Filter bar:** Find backups instantly
3. **Backup table:** All backups with inline editing, restore, delete, download
4. **Restore modal:** Confirmation with safety options
5. **Progress modal:** Live restore progress

**No subpages. No navigation tabs. Just one clean interface.**

---

## Step 1: Create the Page Route

**File:** `app/app/backups/page.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import {
  Archive, Search, Download, Trash2, Edit2, CheckCircle,
  XCircle, AlertCircle, AlertTriangle, RefreshCw
} from 'lucide-react';

export default function BackupsPage() {
  // State for backup creation
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  
  // State for search/filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date-desc');
  
  // State for restore
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState({
    progressPercent: 0,
    currentStep: ''
  });
  
  // Queries
  const backups = useQuery(api.backups.listBackups, {
    search,
    filter: filter !== 'all' ? filter : undefined,
  });
  const stats = useQuery(api.backups.getBackupStats, {});
  
  // Mutations
  const updateBackup = useMutation(api.backups.updateBackup);
  const deleteBackup = useMutation(api.backups.deleteBackup);
  
  // Handlers
  const handleBackup = async () => {
    if (!description.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          backupType: 'manual',
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setDescription('');
        setTags('');
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
      try {
        const status = await fetch(`/api/restore/progress/${operationId}`)
          .then(r => r.json());
        
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
      } catch (error) {
        console.error('Progress poll error:', error);
      }
    }, 1000);
  };
  
  const handleDelete = async (backup) => {
    if (!confirm(`Delete backup: ${backup.description}?`)) return;
    
    try {
      await deleteBackup({ backupId: backup._id });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  const handleDownload = (backup) => {
    const url = `/api/backup/download?path=${encodeURIComponent(backup.filepath)}`;
    window.open(url, '_blank');
  };
  
  const handleUpdateDescription = async (backupId, newDescription) => {
    try {
      await updateBackup({ backupId, description: newDescription });
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Loading state
  if (!backups || !stats) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading backups...</div>
      </div>
    );
  }
  
  // Filter and sort backups
  let filteredBackups = backups;
  
  // Apply search
  if (search) {
    const searchLower = search.toLowerCase();
    filteredBackups = filteredBackups.filter(b =>
      b.description.toLowerCase().includes(searchLower) ||
      b.tags.some(t => t.toLowerCase().includes(searchLower)) ||
      b.filename.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply filter
  if (filter === 'manual') {
    filteredBackups = filteredBackups.filter(b => b.backupType === 'manual');
  } else if (filter === 'auto') {
    filteredBackups = filteredBackups.filter(b => b.backupType === 'auto');
  } else if (filter === 'today') {
    const today = Date.now() - 86400000;
    filteredBackups = filteredBackups.filter(b => b.createdAt >= today);
  } else if (filter === 'week') {
    const week = Date.now() - 7 * 86400000;
    filteredBackups = filteredBackups.filter(b => b.createdAt >= week);
  }
  
  // Apply sort
  if (sort === 'date-desc') {
    filteredBackups = [...filteredBackups].sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === 'date-asc') {
    filteredBackups = [...filteredBackups].sort((a, b) => a.createdAt - b.createdAt);
  } else if (sort === 'size-desc') {
    filteredBackups = [...filteredBackups].sort((a, b) => b.size - a.size);
  } else if (sort === 'size-asc') {
    filteredBackups = [...filteredBackups].sort((a, b) => a.size - b.size);
  }
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header with Stats */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Archive className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Backups</h1>
        </div>
        
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalBackups}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {(stats.totalSize / 1024 / 1024 / 1024).toFixed(1)} GB
            </div>
            <div className="text-xs text-gray-500">Size</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.lastBackupDate
                ? formatRelativeTime(stats.lastBackupDate)
                : 'Never'}
            </div>
            <div className="text-xs text-gray-500">Last</div>
          </div>
        </div>
      </div>
      
      {/* Quick Backup Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 mb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <Archive className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-lg font-bold">Create New Backup</h2>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder='Description: e.g., "After feature X", "Before database migration"'
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleBackup()}
            />
            
            <button
              onClick={handleBackup}
              disabled={creating || !description.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap font-medium transition-colors"
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                'Create Backup'
              )}
            </button>
          </div>
          
          <input
            type="text"
            placeholder="Tags (optional): feature, milestone, pre-deploy"
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>
      </div>
      
      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search backups by description, tags, or filename..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
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
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="size-desc">Largest First</option>
          <option value="size-asc">Smallest First</option>
        </select>
        
        <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
          {filteredBackups.length} backup{filteredBackups.length !== 1 ? 's' : ''}
        </div>
      </div>
      
      {/* Backup Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        {filteredBackups.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <div className="text-lg font-medium mb-2">No backups found</div>
            <div className="text-sm">
              {search ? 'Try adjusting your search' : 'Create your first backup above'}
            </div>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBackups.map(backup => (
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
        )}
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

// Helper function
function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) return new Date(timestamp).toLocaleDateString();
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}
```

---

## Step 2: Create BackupRow Component

**File:** `app/app/backups/BackupRow.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Download, Trash2, Edit2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export function BackupRow({ backup, onRestore, onDelete, onDownload, onUpdateDescription }) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(backup.description);
  
  const handleSave = () => {
    if (description.trim() !== backup.description) {
      onUpdateDescription(backup._id, description.trim());
    }
    setEditing(false);
  };
  
  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };
  
  const formatAbsoluteDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };
  
  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      {/* Description (Editable) */}
      <td className="px-6 py-4">
        {editing ? (
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSave()}
            onBlur={handleSave}
            className="w-full px-2 py-1 text-sm border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
            autoFocus
          />
        ) : (
          <div
            className="group cursor-pointer"
            onClick={() => setEditing(true)}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {backup.description}
              </span>
              <Edit2 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            {backup.tags && backup.tags.length > 0 && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {backup.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </td>
      
      {/* Date */}
      <td className="px-6 py-4 text-sm">
        <div className="text-gray-900 dark:text-gray-100">{formatDate(backup.createdAt)}</div>
        <div className="text-xs text-gray-500" title={formatAbsoluteDate(backup.createdAt)}>
          {formatAbsoluteDate(backup.createdAt)}
        </div>
      </td>
      
      {/* Size */}
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        {formatFileSize(backup.size)}
      </td>
      
      {/* Status */}
      <td className="px-6 py-4">
        {backup.isValid ? (
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Valid</span>
          </div>
        ) : backup.validationError ? (
          <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
            <XCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Corrupted</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Check</span>
          </div>
        )}
      </td>
      
      {/* Actions */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onRestore(backup)}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Restore
          </button>
          <button
            onClick={() => onDownload(backup)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Download backup"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(backup)}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete backup"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
```

---

## Step 3: Create Restore Modal

**File:** `app/app/backups/RestoreModal.tsx`

```tsx
'use client';

import { AlertTriangle, X } from 'lucide-react';

export function RestoreModal({
  backup,
  confirmed,
  setConfirmed,
  createSafetyBackup,
  setCreateSafetyBackup,
  onClose,
  onConfirm
}) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold">Restore Backup</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Backup Details */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
            <div>
              <div className="text-sm text-gray-500 mb-1">Backup Description</div>
              <div className="font-medium">{backup.description}</div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-500">Created</div>
                <div className="font-medium">{formatDate(backup.createdAt)}</div>
              </div>
              <div>
                <div className="text-gray-500">Size</div>
                <div className="font-medium">{formatFileSize(backup.size)}</div>
              </div>
            </div>
          </div>
          
          {/* Warning */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="text-yellow-800 dark:text-yellow-200 font-medium mb-2">
              ⚠️ Warning: This will revert your workspace
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300">
              Restoring will replace your current workspace with the state from{' '}
              <strong>{formatDate(backup.createdAt)}</strong>.
              All changes made after that time will be lost.
            </div>
          </div>
          
          {/* Safety Backup Option */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={createSafetyBackup}
              onChange={(e) => setCreateSafetyBackup(e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <div>
              <div className="font-medium group-hover:text-blue-600 transition-colors">
                Create safety backup first (Recommended)
              </div>
              <div className="text-sm text-gray-500 mt-0.5">
                Automatically backup current state before restoring.
                This allows you to undo if needed.
              </div>
            </div>
          </label>
          
          {/* Confirmation Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="font-medium group-hover:text-blue-600 transition-colors">
              I understand this will restore to {formatDate(backup.createdAt)}
            </span>
          </label>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!confirmed}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Restore Backup
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 4: Create Progress Modal

**File:** `app/app/backups/RestoreProgressModal.tsx`

```tsx
'use client';

import { RefreshCw, CheckCircle, Circle } from 'lucide-react';

export function RestoreProgressModal({ status }) {
  const steps = [
    'Validating backup',
    'Creating safety backup',
    'Stopping services',
    'Extracting files',
    'Restoring workspace',
    'Validating restore',
    'Restarting services'
  ];
  
  const currentStepIndex = Math.floor(status.progressPercent / 14);
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h3 className="text-xl font-bold mb-2">Restoring Backup...</h3>
          <div className="text-sm text-gray-500">{status.currentStep}</div>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">Progress</span>
            <span className="font-medium">{status.progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 transition-all duration-300"
              style={{ width: `${status.progressPercent}%` }}
            />
          </div>
        </div>
        
        {/* Steps */}
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`flex items-center gap-2 text-sm transition-colors ${
                i < currentStepIndex
                  ? 'text-green-600 dark:text-green-400'
                  : i === currentStepIndex
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-400 dark:text-gray-600'
              }`}
            >
              {i < currentStepIndex ? (
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
              ) : (
                <Circle className="w-4 h-4 flex-shrink-0" />
              )}
              <span>{step}</span>
            </div>
          ))}
        </div>
        
        {/* Warning */}
        <div className="mt-6 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Do not close this window or refresh the page
        </div>
      </div>
    </div>
  );
}
```

---

## Step 5: Update Menu Item

**File:** `app/app/layout.tsx`

Find the `menuItems` array and add:

```typescript
{
  name: "Backups",
  path: "/app/backups",
  icon: HardDrive, // or Archive
}
```

---

## Step 6: Test the Implementation

```bash
# 1. Start Mission Control
cd mission-control
npm run dev

# 2. Open browser
open http://localhost:3000/app/backups

# 3. Test quick backup
# - Type description
# - Press Enter or click "Create Backup"
# - Watch it appear in list

# 4. Test search
# - Type in search box
# - See results filter instantly

# 5. Test inline editing
# - Click on any backup description
# - Edit and press Enter

# 6. Test restore
# - Click "Restore" button
# - See confirmation modal
# - Check both checkboxes
# - Click "Restore Backup"
# - Watch progress modal
```

---

## Complete! 🎉

You now have a **single-page backup system** with:

✅ Quick "Backup Now" at top  
✅ Search and filter bar  
✅ Backup table with inline editing  
✅ Restore confirmation modal  
✅ Progress tracking modal  
✅ Delete and download actions  

**No subpages. Just one powerful interface.**

---

## Next Steps

1. **Add validation** - Check backup integrity
2. **Add notifications** - Toast messages for success/error
3. **Add keyboard shortcuts** - `Cmd+N` for new backup, `/` for search
4. **Add empty states** - Better messaging when no backups
5. **Add loading states** - Skeleton loaders while fetching

---

## Troubleshooting

### Issue: Backups not appearing
- Check Convex connection
- Verify API endpoint is working
- Check browser console for errors

### Issue: Inline editing not saving
- Check `updateBackup` mutation
- Verify Convex permissions
- Check network tab for API calls

### Issue: Restore not working
- Check `restore.sh` script exists
- Verify backup file path is correct
- Check server logs for errors

---

**Implementation time: ~5-6 days for experienced developer.**
