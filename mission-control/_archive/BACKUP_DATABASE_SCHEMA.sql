-- Mission Control Backup & Restore Management
-- Database Schema (Convex TypeScript Version)
-- This is a reference SQL representation of the Convex schema

-- ==============================================
-- BACKUPS TABLE
-- ==============================================
CREATE TABLE backups (
    -- Primary Key
    id VARCHAR(255) PRIMARY KEY,
    
    -- File Metadata
    filename VARCHAR(500) NOT NULL,
    filepath VARCHAR(1000) NOT NULL,
    size BIGINT NOT NULL,                    -- Size in bytes
    
    -- User-Editable Metadata
    description TEXT NOT NULL,
    tags JSON NOT NULL DEFAULT '[]',         -- Array of strings
    
    -- Backup Context
    backup_type ENUM('manual', 'auto', 'pre-restore', 'milestone') NOT NULL DEFAULT 'manual',
    
    -- Technical Metadata
    workspace_size BIGINT,
    file_count INTEGER,
    checksum VARCHAR(64),                    -- SHA256 hash
    compression VARCHAR(50) DEFAULT 'gzip',
    
    -- Status Tracking
    status ENUM('completed', 'failed', 'partial', 'archived', 'deleted') NOT NULL DEFAULT 'completed',
    
    -- Validation
    is_valid BOOLEAN DEFAULT FALSE,
    validated_at TIMESTAMP,
    validation_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255),                 -- Agent ID or "user"
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Retention
    retention_policy VARCHAR(50),            -- "keep-forever", "30-days", "90-days"
    expires_at TIMESTAMP,
    
    -- Indexes
    INDEX idx_created_at (created_at DESC),
    INDEX idx_status_created (status, created_at DESC),
    INDEX idx_backup_type (backup_type, created_at DESC),
    INDEX idx_tags (tags),                   -- JSON array index
    INDEX idx_filename (filename),
    FULLTEXT INDEX idx_description_search (description)
);

-- ==============================================
-- RESTORE OPERATIONS TABLE
-- ==============================================
CREATE TABLE restore_operations (
    -- Primary Key
    id VARCHAR(255) PRIMARY KEY,
    
    -- Source Backup
    backup_id VARCHAR(255) NOT NULL,
    backup_filename VARCHAR(500) NOT NULL,
    
    -- Operation Context
    requested_by VARCHAR(255),               -- Agent ID or "user"
    reason TEXT,
    
    -- Pre-restore Safety Backup
    pre_restore_backup_id VARCHAR(255),
    
    -- Status Tracking
    status ENUM(
        'validating',
        'creating-safety-backup',
        'extracting',
        'restoring',
        'completed',
        'failed',
        'rolled-back'
    ) NOT NULL DEFAULT 'validating',
    
    -- Progress Tracking
    progress_percent INTEGER NOT NULL DEFAULT 0,
    current_step TEXT,
    
    -- Timing
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration INTEGER,                        -- milliseconds
    
    -- Results
    files_restored INTEGER,
    bytes_restored BIGINT,
    error TEXT,
    logs JSON DEFAULT '[]',                  -- Array of log strings
    
    -- Foreign Keys
    FOREIGN KEY (backup_id) REFERENCES backups(id),
    FOREIGN KEY (pre_restore_backup_id) REFERENCES backups(id),
    
    -- Indexes
    INDEX idx_backup_id (backup_id),
    INDEX idx_started_at (started_at DESC),
    INDEX idx_status (status)
);

-- ==============================================
-- BACKUP METRICS TABLE
-- ==============================================
CREATE TABLE backup_metrics (
    -- Composite Primary Key
    date DATE PRIMARY KEY,
    
    -- Backup Statistics
    total_backups INTEGER NOT NULL DEFAULT 0,
    total_size BIGINT NOT NULL DEFAULT 0,    -- bytes
    manual_backups INTEGER NOT NULL DEFAULT 0,
    auto_backups INTEGER NOT NULL DEFAULT 0,
    
    -- Restore Statistics
    restore_operations INTEGER NOT NULL DEFAULT 0,
    successful_restores INTEGER NOT NULL DEFAULT 0,
    failed_restores INTEGER NOT NULL DEFAULT 0,
    
    -- Performance Metrics
    avg_backup_size BIGINT,
    avg_backup_duration INTEGER,             -- milliseconds
    
    -- Index
    INDEX idx_date (date DESC)
);

-- ==============================================
-- SAMPLE DATA
-- ==============================================

-- Sample Manual Backup
INSERT INTO backups (
    id, filename, filepath, size, description, tags, backup_type,
    workspace_size, file_count, checksum, is_valid, validated_at,
    created_at, created_by, updated_at, retention_policy
) VALUES (
    'k17abc123xyz',
    'workspace_cold-email-v1-complete_20260220_002241.tar.gz',
    '/Users/openclaw/.openclaw/backups/workspace_cold-email-v1-complete_20260220_002241.tar.gz',
    33554432,
    'Cold Email Campaign V1 Complete - All modules integrated',
    '["cold-email", "v1", "milestone"]',
    'manual',
    52428800,
    1247,
    'a3f5d8e9b2c1f4a7d6e8c9b1a5f3e7d2c4b6a8e1f9d3c7b5a2e6d8f1c4b9a7e3',
    TRUE,
    '2026-02-20 00:24:01',
    '2026-02-20 00:22:41',
    'user',
    '2026-02-20 00:24:01',
    'keep-forever'
);

-- Sample Auto Backup
INSERT INTO backups (
    id, filename, filepath, size, description, tags, backup_type,
    workspace_size, file_count, checksum, is_valid, validated_at,
    created_at, created_by, updated_at, retention_policy, expires_at
) VALUES (
    'k18def456uvw',
    'workspace_20260223_020000.tar.gz',
    '/Users/openclaw/.openclaw/backups/workspace_20260223_020000.tar.gz',
    31457280,
    'Automatic daily backup',
    '["auto", "daily"]',
    'auto',
    50331648,
    1198,
    'b4f6d9e8c2a1f5b7e6d8c9a1b5f3e7c2d4a6b8e1d9f3c7a5b2d6e8c1f4a9b7d3',
    TRUE,
    '2026-02-23 02:01:30',
    '2026-02-23 02:00:00',
    'cron',
    '2026-02-23 02:01:30',
    '30-days',
    '2026-03-25 02:00:00'
);

-- Sample Restore Operation
INSERT INTO restore_operations (
    id, backup_id, backup_filename, requested_by, reason,
    pre_restore_backup_id, status, progress_percent, current_step,
    started_at, completed_at, duration, files_restored, bytes_restored,
    logs
) VALUES (
    'k28ghi789rst',
    'k17abc123xyz',
    'workspace_cold-email-v1-complete_20260220_002241.tar.gz',
    'user',
    'Need to go back before breaking changes',
    'k29jkl012mno',
    'completed',
    100,
    'Restore complete',
    '2026-02-23 15:30:00',
    '2026-02-23 15:30:45',
    45000,
    1247,
    52428800,
    '[
        "Validating backup file...",
        "Creating safety backup...",
        "Stopping services...",
        "Extracting backup...",
        "Restoring files...",
        "Validating restore...",
        "Restarting services...",
        "Restore complete!"
    ]'
);

-- Sample Metrics
INSERT INTO backup_metrics (
    date, total_backups, total_size, manual_backups, auto_backups,
    restore_operations, successful_restores, failed_restores,
    avg_backup_size, avg_backup_duration
) VALUES (
    '2026-02-23',
    5,
    167772160,
    2,
    3,
    1,
    1,
    0,
    33554432,
    28500
);

-- ==============================================
-- USEFUL QUERIES
-- ==============================================

-- Find all backups from last 7 days
SELECT * FROM backups
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
ORDER BY created_at DESC;

-- Search backups by description
SELECT * FROM backups
WHERE description LIKE '%cold email%'
ORDER BY created_at DESC;

-- Find all manual backups
SELECT * FROM backups
WHERE backup_type = 'manual'
ORDER BY created_at DESC;

-- Get backups by tag
SELECT * FROM backups
WHERE JSON_CONTAINS(tags, '"v1"')
ORDER BY created_at DESC;

-- Get restore history for a backup
SELECT ro.*
FROM restore_operations ro
WHERE ro.backup_id = 'k17abc123xyz'
ORDER BY ro.started_at DESC;

-- Calculate total storage used
SELECT 
    COUNT(*) as total_backups,
    SUM(size) as total_bytes,
    SUM(size) / 1024 / 1024 / 1024 as total_gb
FROM backups
WHERE status = 'completed';

-- Find backups needing validation
SELECT * FROM backups
WHERE is_valid = FALSE
   OR validated_at IS NULL
   OR validated_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
ORDER BY created_at DESC;

-- Get backup metrics for last 30 days
SELECT * FROM backup_metrics
WHERE date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
ORDER BY date DESC;

-- Find largest backups
SELECT filename, size, size / 1024 / 1024 as size_mb, description
FROM backups
WHERE status = 'completed'
ORDER BY size DESC
LIMIT 10;

-- Get restore success rate
SELECT 
    COUNT(*) as total_restores,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    ROUND(
        100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*),
        2
    ) as success_rate_percent
FROM restore_operations;

-- ==============================================
-- MAINTENANCE QUERIES
-- ==============================================

-- Soft delete expired backups
UPDATE backups
SET status = 'deleted', updated_at = NOW()
WHERE expires_at IS NOT NULL
  AND expires_at < NOW()
  AND status != 'deleted';

-- Mark old unvalidated backups for review
UPDATE backups
SET validation_error = 'Needs re-validation (>90 days old)'
WHERE validated_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
  AND is_valid = TRUE;

-- Clean up old restore logs (keep last 100)
DELETE FROM restore_operations
WHERE id NOT IN (
    SELECT id FROM (
        SELECT id FROM restore_operations
        ORDER BY started_at DESC
        LIMIT 100
    ) AS keep
);

-- Recalculate daily metrics
INSERT INTO backup_metrics (date, total_backups, total_size, manual_backups, auto_backups)
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_backups,
    SUM(size) as total_size,
    SUM(CASE WHEN backup_type = 'manual' THEN 1 ELSE 0 END) as manual_backups,
    SUM(CASE WHEN backup_type = 'auto' THEN 1 ELSE 0 END) as auto_backups
FROM backups
WHERE DATE(created_at) = CURDATE()
GROUP BY DATE(created_at)
ON DUPLICATE KEY UPDATE
    total_backups = VALUES(total_backups),
    total_size = VALUES(total_size),
    manual_backups = VALUES(manual_backups),
    auto_backups = VALUES(auto_backups);
