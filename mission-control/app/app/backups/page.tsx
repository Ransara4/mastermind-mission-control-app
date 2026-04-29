'use client';

import { useState, useEffect } from 'react';
import {
  Archive,
  Search,
  Download,
  Trash2,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Loader,
  Tag,
  Clock,
  Database,
  Plus,
} from 'lucide-react';

interface Backup {
  _id: string;
  _creationTime: number;
  filename: string;
  filepath: string;
  size: number;
  description: string;
  tags: string[];
  backupType: string;
  workspaceSize?: number;
  fileCount?: number;
  checksum?: string;
  compression: string;
  status: string;
  isValid: boolean;
  validatedAt?: number;
  validationError?: string;
  createdAt: number;
  createdBy?: string;
  updatedAt: number;
  retentionPolicy?: string;
  expiresAt?: number;
}

export default function BackupsPage() {
  // State for backup creation
  const [description, setDescription] = useState('');
  const [autoDescription, setAutoDescription] = useState('');
  const [showDescriptionAlternatives, setShowDescriptionAlternatives] = useState(false);
  const [descriptionAlternatives, setDescriptionAlternatives] = useState<string[]>([]);
  const [tags, setTags] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [loadTimeout, setLoadTimeout] = useState(false);

  // State for search/filter
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('date-desc');

  // State for restore
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [createSafetyBackup, setCreateSafetyBackup] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState({
    progressPercent: 0,
    currentStep: 'Starting restore...',
  });

  // State for editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // State for data
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Effect: Load backups from API
  useEffect(() => {
    loadBackups();
  }, [search, filter]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filter !== 'all') params.append('filter', filter);

      const response = await fetch(`/api/backups/list?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load backups');

      const data = await response.json();
      setBackups(data.backups || []);
      setStats(data.stats || { totalBackups: 0, totalSize: 0, lastBackupTime: null });
      setLoadTimeout(false);
    } catch (error) {
      console.error('Error loading backups:', error);
      setBackups([]);
      setStats({ totalBackups: 0, totalSize: 0, lastBackupTime: null });
      setLoadTimeout(true);
    } finally {
      setLoading(false);
    }
  };

  // Effect: Detect loading timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setLoadTimeout(true);
      }
    }, 5000); // 5 second timeout
    return () => clearTimeout(timer);
  }, [loading]);

  // Effect: Load auto-generated description on mount
  useEffect(() => {
    const loadDescription = async () => {
      try {
        const response = await fetch('/api/backups/generate-description?type=primary&hoursBack=1');
        const data = await response.json();
        if (data.success && data.description && !description) {
          setAutoDescription(data.description);
          setDescription(data.description);
        }
      } catch (error) {
        console.error('Error loading auto-description:', error);
      }
    };

    loadDescription();
  }, []);

  // Effect: Load description alternatives on mount
  useEffect(() => {
    const loadAlternatives = async () => {
      try {
        const response = await fetch('/api/backups/generate-description?type=alternatives&count=3');
        const data = await response.json();
        if (data.success && data.alternatives) {
          setDescriptionAlternatives(data.alternatives);
        }
      } catch (error) {
        console.error('Error loading alternatives:', error);
      }
    };

    loadAlternatives();
  }, []);

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Format time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  // Handle create backup
  const handleBackup = async () => {
    if (!description.trim()) {
      setCreateError('Description is required');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      const response = await fetch('/api/backups/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          tags: tags.split(',').map((t) => t.trim()).filter((t) => t),
          backupType: 'manual',
        }),
      });

      const result = await response.json();
      if (result.success) {
        setDescription('');
        setTags('');
        // Refresh backups list
        await loadBackups();
      } else {
        setCreateError(result.error || 'Failed to create backup');
      }
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : 'Failed to create backup'
      );
    } finally {
      setCreating(false);
    }
  };

  // Handle restore
  const handleRestore = (backup: Backup) => {
    setSelectedBackup(backup);
    setRestoreModalOpen(true);
    setConfirmed(false);
  };

  const handleConfirmRestore = async () => {
    if (!confirmed || !selectedBackup) return;

    setRestoreModalOpen(false);
    setRestoring(true);

    try {
      const response = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId: selectedBackup._id,
          createSafetyBackup,
          reason: 'User-initiated restore',
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Restore failed');

      // Poll for restore progress
      pollRestoreProgress(data.operationId);
    } catch (error) {
      setRestoreStatus({
        progressPercent: 0,
        currentStep: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setRestoring(false);
    }
  };

  const pollRestoreProgress = async (operationId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/backups/restore/progress?operationId=${operationId}`
        );
        const status = await response.json();

        setRestoreStatus({
          progressPercent: status.progressPercent || 0,
          currentStep: status.currentStep || 'Processing...',
        });

        if (
          status.status === 'completed' ||
          status.status === 'failed' ||
          status.status === 'rolled-back'
        ) {
          clearInterval(interval);
          setRestoring(false);
          if (status.status === 'completed') {
            alert('✅ Restore complete! Please refresh the page.');
          } else {
            alert(
              `❌ Restore ${status.status}: ${status.error || 'Unknown error'}`
            );
          }
        }
      } catch (error) {
        console.error('Progress poll error:', error);
      }
    }, 1000);
  };

  // Handle delete
  const handleDelete = async (backup: Backup) => {
    if (
      !window.confirm(
        `Delete backup: "${backup.description}"?\n\nThis will mark the backup as deleted.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch('/api/backups/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupId: backup._id }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');

      // Refresh
      await loadBackups();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Handle download
  const handleDownload = (backup: Backup) => {
    const url = `/api/backups/download?path=${encodeURIComponent(backup.filepath)}`;
    window.open(url, '_blank');
  };

  // Handle update description
  const handleUpdateDescription = async (
    backupId: string,
    newDescription: string
  ) => {
    if (!newDescription.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch('/api/backups/update-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupId,
          description: newDescription.trim(),
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Update failed');

      setEditingId(null);
      // Refresh
      await loadBackups();
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading || !backups || !stats) {
    if (loadTimeout) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-lg">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-dark-danger" />
            <h3 className="text-xl font-semibold tracking-tight text-dark-text mb-2">
              Backups API Not Available
            </h3>
            <p className="text-dark-muted mb-4">
              Unable to connect to the backups API. Please ensure the API endpoint is configured correctly.
            </p>
            <button
              onClick={loadBackups}
              className="px-4 py-2 bg-cm-purple text-white rounded-lg hover:bg-cm-purple/80 transition"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-cm-purple" />
          <p className="text-dark-muted">Loading backups...</p>
        </div>
      </div>
    );
  }

  // Sort backups
  let displayBackups = [...backups];
  if (sort === 'date-desc') {
    displayBackups.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sort === 'date-asc') {
    displayBackups.sort((a, b) => a.createdAt - b.createdAt);
  } else if (sort === 'size-desc') {
    displayBackups.sort((a, b) => b.size - a.size);
  } else if (sort === 'size-asc') {
    displayBackups.sort((a, b) => a.size - b.size);
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-6 mb-8 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-4xl font-bold tracking-tight text-dark-text flex items-center gap-3">
            <Archive className="w-8 h-8 text-cm-purple flex-shrink-0" />
            Backups
          </h1>
          <p className="text-dark-muted mt-1">Manage workspace backups and restores</p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-3 flex-shrink-0">
          <div className="bg-dark-panel border border-dark-border rounded-lg p-4 min-w-[130px]">
            <div className="text-xs text-dark-muted mb-1">Total Backups</div>
            <div className="text-2xl font-bold text-cm-purple">
              {stats.totalBackups}
            </div>
          </div>
          <div className="bg-dark-panel border border-dark-border rounded-lg p-4 min-w-[130px]">
            <div className="text-xs text-dark-muted mb-1">Storage Used</div>
            <div className="text-2xl font-bold text-cm-purple">
              {formatSize(stats.totalSize)}
            </div>
          </div>
          <div className="bg-dark-panel border border-dark-border rounded-lg p-4 min-w-[130px]">
            <div className="text-xs text-dark-muted mb-1">Last Backup</div>
            <div className="text-lg font-bold text-dark-success">
              {stats.lastBackupTime ? formatTime(stats.lastBackupTime) : 'Never'}
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Section */}
      <div className="bg-dark-panel rounded-lg shadow-md shadow-black/20 mb-8 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Backup
        </h2>

        {createError && (
          <div className="mb-4 p-4 bg-dark-danger/10 border border-dark-danger/30 rounded-lg flex items-center gap-2">
            <XCircle className="w-5 h-5 text-dark-danger" />
            <p className="text-dark-danger">{createError}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-dark-text">
                Description
              </label>
              {autoDescription && (
                <span className="text-xs text-cm-purple font-medium">
                  ✨ Auto-generated
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={autoDescription || "e.g., After cold email feature"}
                className="w-full px-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text placeholder:text-dark-muted"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !creating) {
                    handleBackup();
                  }
                }}
                disabled={creating}
              />
              {description !== autoDescription && autoDescription && (
                <button
                  type="button"
                  onClick={() => setDescription(autoDescription)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-dark-muted hover:text-dark-text underline"
                  title="Reset to auto-generated description"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Description alternatives dropdown */}
            {descriptionAlternatives.length > 0 && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => setShowDescriptionAlternatives(!showDescriptionAlternatives)}
                  className="text-sm text-cm-purple hover:text-cm-purple-mid font-medium flex items-center gap-1"
                >
                  {showDescriptionAlternatives ? '▼' : '▶'} More suggestions
                </button>

                {showDescriptionAlternatives && (
                  <div className="mt-2 space-y-2 p-3 bg-cm-purple/10 rounded-lg border border-cm-purple/20">
                    {descriptionAlternatives.map((alt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setDescription(alt);
                          setShowDescriptionAlternatives(false);
                        }}
                        className="block w-full text-left px-3 py-2 text-sm text-dark-text hover:bg-cm-purple/10 rounded transition"
                      >
                        {alt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-text mb-2">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., feature, milestone, important"
              className="w-full px-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text placeholder:text-dark-muted"
              disabled={creating}
            />
          </div>

          <button
            onClick={handleBackup}
            disabled={creating || !description.trim()}
            className="w-full px-6 py-3 bg-cm-purple text-white rounded-lg font-medium hover:bg-cm-purple/80 disabled:bg-dark-panel2 disabled:text-dark-muted disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
          >
            {creating ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Creating backup...
              </>
            ) : (
              <>
                <Archive className="w-5 h-5" />
                Create Backup
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-dark-panel rounded-lg shadow-md shadow-black/20 mb-8 p-6">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-dark-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description, tag, or filename..."
              className="w-full pl-10 pr-4 py-2 border border-dark-border bg-dark-panel2 rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text placeholder:text-dark-muted"
            />
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-4 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-transparent bg-dark-panel2 text-dark-text"
          >
            <option value="all">All Backups</option>
            <option value="manual">Manual</option>
            <option value="auto">Automatic</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-4 py-2 border border-dark-border rounded-lg focus:ring-2 focus:ring-cm-purple focus:border-transparent bg-dark-panel2 text-dark-text"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>
        </div>

        <div className="mt-4 text-sm text-dark-muted">
          Showing {displayBackups.length} of {backups.length} backups
        </div>
      </div>

      {/* Backups Table */}
      {displayBackups.length === 0 ? (
        <div className="bg-dark-panel rounded-lg shadow-md shadow-black/20 p-12 text-center">
          <Archive className="w-12 h-12 text-dark-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-dark-text">No backups found</h3>
          <p className="text-dark-muted mt-1">
            {backups.length === 0
              ? 'Create your first backup to get started'
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="bg-dark-panel rounded-lg shadow-md shadow-black/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-panel2 border-b border-dark-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-muted uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-dark-muted uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayBackups.map((backup) => (
                  <tr
                    key={backup._id}
                    className="border-b border-dark-border hover:bg-dark-panel2 transition"
                  >
                    {/* Description */}
                    <td className="px-6 py-4">
                      {editingId === backup._id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="flex-1 px-3 py-1 border border-dark-border bg-dark-panel2 rounded focus:ring-2 focus:ring-cm-purple focus:border-transparent text-dark-text"
                            autoFocus
                          />
                          <button
                            onClick={() =>
                              handleUpdateDescription(backup._id, editValue)
                            }
                            className="px-2 py-1 bg-cm-purple text-white rounded text-sm hover:bg-cm-purple/80"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-2 py-1 bg-dark-panel2 text-dark-text rounded text-sm hover:bg-dark-panel2"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium text-dark-text mb-2">
                            {backup.description}
                          </p>
                          {backup.tags.length > 0 && (
                            <div className="flex gap-2 flex-wrap">
                              {backup.tags.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-cm-purple/20 text-cm-purple rounded text-xs"
                                >
                                  <Tag className="w-3 h-3" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditingId(backup._id);
                              setEditValue(backup.description);
                            }}
                            className="mt-2 text-cm-purple hover:text-cm-purple-mid text-sm flex items-center gap-1"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Created */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-dark-text">
                        <Clock className="w-4 h-4 text-dark-muted" />
                        <div>
                          <p className="text-sm">{formatTime(backup.createdAt)}</p>
                          <p className="text-xs text-dark-muted">
                            {new Date(backup.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-dark-text">
                        <Database className="w-4 h-4 text-dark-muted" />
                        {formatSize(backup.size)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {backup.isValid ? (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-dark-success" />
                          <span className="text-dark-success font-medium">Valid</span>
                        </div>
                      ) : backup.validationError ? (
                        <div className="flex items-center gap-2">
                          <XCircle className="w-5 h-5 text-dark-danger" />
                          <span className="text-dark-danger font-medium">Invalid</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-dark-warn" />
                          <span className="text-dark-warn font-medium">
                            Checking
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(backup)}
                          className="px-3 py-2 text-sm bg-dark-panel2 border border-dark-border text-dark-muted rounded hover:border-cm-purple hover:text-cm-purple transition font-medium"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleDownload(backup)}
                          className="px-3 py-2 text-sm bg-dark-panel2 border border-dark-border text-dark-muted rounded hover:border-cm-purple hover:text-cm-purple transition"
                          title="Download backup"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(backup)}
                          className="px-3 py-2 text-sm bg-dark-panel2 border border-dark-border text-dark-muted rounded hover:border-dark-danger hover:text-dark-danger transition"
                          title="Delete backup"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {restoreModalOpen && selectedBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-dark-panel rounded-lg shadow-lg shadow-black/30 max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-dark-warn" />
                Restore Backup
              </h2>

              <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-4 mb-6">
                <p className="text-dark-warn font-medium">⚠️ Warning</p>
                <p className="text-dark-warn text-sm mt-1">
                  This will revert your workspace to the state when this backup was
                  created. This action cannot be undone unless you create a safety
                  backup.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <h3 className="font-semibold tracking-tight text-dark-text">Backup Details</h3>
                  <div className="mt-2 space-y-2 text-sm">
                    <div>
                      <p className="text-dark-muted">Description:</p>
                      <p className="text-dark-text font-medium">
                        {selectedBackup.description}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Created:</p>
                      <p className="text-dark-text font-medium">
                        {new Date(selectedBackup.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Size:</p>
                      <p className="text-dark-text font-medium">
                        {formatSize(selectedBackup.size)}
                      </p>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-3 bg-dark-panel2 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createSafetyBackup}
                    onChange={(e) => setCreateSafetyBackup(e.target.checked)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-dark-text">
                      Create safety backup first
                    </p>
                    <p className="text-sm text-dark-muted">
                      Recommended: saves current state before restore
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 bg-dark-panel2 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={(e) => setConfirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <p className="font-medium text-dark-text">
                    I understand this will restore to{' '}
                    {new Date(selectedBackup.createdAt).toLocaleDateString()}{' '}
                    and I have a backup
                  </p>
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRestoreModalOpen(false);
                    setConfirmed(false);
                  }}
                  className="flex-1 px-4 py-2 border border-dark-border rounded-lg text-dark-text hover:bg-dark-panel2 font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={!confirmed}
                  className="flex-1 px-4 py-2 bg-dark-success text-dark-bg rounded-lg hover:bg-dark-success/80 disabled:bg-dark-panel2 disabled:text-dark-muted disabled:cursor-not-allowed font-medium transition"
                >
                  Restore Backup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Restore Progress Modal */}
      {restoring && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-dark-panel rounded-lg shadow-lg shadow-black/30 max-w-lg w-full mx-4">
            <div className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight text-dark-text mb-4 flex items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-cm-purple" />
                Restoring Backup
              </h2>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-dark-muted mb-2">Progress:</p>
                  <div className="w-full bg-dark-panel2 rounded-full h-2">
                    <div
                      className="bg-cm-purple h-2 rounded-full transition-all duration-300"
                      style={{ width: `${restoreStatus.progressPercent}%` }}
                    />
                  </div>
                  <p className="text-sm font-medium text-dark-text mt-2">
                    {restoreStatus.progressPercent}%
                  </p>
                </div>

                <div className="bg-dark-panel2 rounded-lg p-4">
                  <p className="text-sm font-medium text-dark-text">
                    {restoreStatus.currentStep}
                  </p>
                </div>

                <div className="bg-dark-warn/10 border border-dark-warn/30 rounded-lg p-4">
                  <p className="text-dark-warn text-sm font-medium">
                    ⚠️ Do not close this window or refresh the page
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
