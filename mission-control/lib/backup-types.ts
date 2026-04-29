/**
 * Mission Control: Backup & Restore Management
 * TypeScript Type Definitions
 */

export type BackupType = 'manual' | 'auto' | 'pre-restore' | 'milestone';
export type BackupStatus =
  | 'completed'
  | 'failed'
  | 'partial'
  | 'archived'
  | 'deleted';
export type RestoreStatus =
  | 'validating'
  | 'creating-safety-backup'
  | 'extracting'
  | 'restoring'
  | 'completed'
  | 'failed'
  | 'rolled-back';
export type RetentionPolicy = 'keep-forever' | '30-days' | '90-days' | '1-year';
export type SortField = 'date' | 'size' | 'description' | 'status';

// Database Models
export interface Backup {
  _id: string;
  _creationTime: number;
  filename: string;
  filepath: string;
  size: number;
  description: string;
  tags: string[];
  backupType: BackupType;
  workspaceSize?: number;
  fileCount?: number;
  checksum?: string;
  compression: string;
  status: BackupStatus;
  isValid: boolean;
  validatedAt?: number;
  validationError?: string;
  createdAt: number;
  createdBy?: string;
  updatedAt: number;
  retentionPolicy?: RetentionPolicy;
  expiresAt?: number;
}

export interface RestoreOperation {
  _id: string;
  _creationTime: number;
  backupId: string;
  backupFilename: string;
  requestedBy?: string;
  reason?: string;
  preRestoreBackupId?: string;
  status: RestoreStatus;
  progressPercent: number;
  currentStep: string;
  startedAt: number;
  completedAt?: number;
  duration?: number;
  filesRestored?: number;
  bytesRestored?: number;
  error?: string;
  logs?: string[];
}

export interface BackupMetrics {
  _id: string;
  _creationTime: number;
  date: string;
  totalBackups: number;
  totalSize: number;
  manualBackups: number;
  autoBackups: number;
  restoreOperations: number;
  successfulRestores: number;
  failedRestores: number;
  avgBackupSize?: number;
  avgBackupDuration?: number;
}

// API Request/Response Types
export interface CreateBackupRequest {
  description: string;
  tags?: string[];
  backupType?: BackupType;
  retentionPolicy?: RetentionPolicy;
}

export interface CreateBackupResponse {
  success: boolean;
  backup?: Backup;
  error?: string;
  message?: string;
}

export interface RestoreBackupRequest {
  backupId: string;
  createSafetyBackup?: boolean;
  reason?: string;
}

export interface RestoreBackupResponse {
  success: boolean;
  operationId?: string;
  error?: string;
}

export interface RestoreProgressResponse {
  operationId: string;
  status: RestoreStatus;
  progressPercent: number;
  currentStep: string;
  error?: string;
}

export interface BackupListResponse {
  success: boolean;
  backups: Backup[];
  total: number;
  error?: string;
}

export interface BackupStatsResponse {
  totalBackups: number;
  totalSize: number;
  lastBackupTime: number;
}
