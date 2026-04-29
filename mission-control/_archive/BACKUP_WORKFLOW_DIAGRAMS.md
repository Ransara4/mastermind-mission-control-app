# Backup & Restore System: Workflow Diagrams

This document contains detailed workflow diagrams for all major operations in the Backup & Restore system.

---

## 1. Create Manual Backup Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Backup UI
    participant API as Next.js API
    participant Script as backup.sh
    participant FS as File System
    participant DB as Convex DB

    User->>UI: Click "Backup Now"
    UI->>UI: Open CreateBackup Dialog
    User->>UI: Enter description & tags
    User->>UI: Click "Create Backup"
    
    UI->>UI: Validate inputs
    UI->>API: POST /api/backup/create
    
    API->>Script: Execute backup.sh
    Script->>FS: Check workspace size
    Script->>FS: Check available disk space
    
    alt Insufficient Space
        Script-->>API: Error: Insufficient disk space
        API-->>UI: Error response
        UI-->>User: Show error notification
    else Space Available
        Script->>FS: Create tar.gz file
        Note over Script,FS: Exclude node_modules, .next, etc.
        Script->>Script: Calculate checksum (SHA256)
        Script->>Script: Count files
        Script-->>API: Success + metadata (JSON)
        
        API->>DB: Create backup record
        DB-->>API: Backup ID
        
        API-->>UI: Success response
        UI->>UI: Close dialog
        UI->>UI: Show success notification
        UI->>UI: Refresh backup list
        User->>UI: See new backup in list
    end
```

**Key Points:**
- Validation happens both client-side and server-side
- Pre-backup checks prevent partial/failed backups
- Atomic operation: backup fully completes or fails entirely
- Metadata extracted during backup (no post-processing needed)

---

## 2. Restore from Backup Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as Backup UI
    participant API as Next.js API
    participant Validate as validate-backup.sh
    participant Backup as backup.sh
    participant Restore as restore.sh
    participant FS as File System
    participant DB as Convex DB
    participant Services as Mission Control Services

    User->>UI: Click "Restore" on backup
    UI->>UI: Open RestoreDialog
    UI->>UI: Show backup details & warning
    
    User->>UI: Check "Create safety backup"
    User->>UI: Click "Confirm Restore"
    
    UI->>API: POST /api/backup/validate
    API->>Validate: Execute validate-backup.sh
    Validate->>FS: Check file exists
    Validate->>FS: Test tar integrity
    Validate->>FS: Count files
    Validate-->>API: Validation result
    
    alt Backup Invalid
        API-->>UI: Validation failed
        UI-->>User: Show error, block restore
    else Backup Valid
        API->>DB: Create restoreOperation record
        DB-->>API: Operation ID
        
        par Safety Backup Creation
            API->>Backup: Execute backup.sh (pre-restore)
            Backup->>FS: Create safety backup
            Backup-->>DB: Create backup record (type: pre-restore)
        end
        
        API->>Services: Stop services (pkill -f "next dev")
        Services-->>API: Services stopped
        
        API->>Restore: Execute restore.sh
        Restore->>DB: Update progress: 10% (Validating)
        Restore->>FS: Validate backup file again
        
        Restore->>DB: Update progress: 30% (Clearing workspace)
        Restore->>FS: Remove current workspace files
        Note over Restore,FS: Keep node_modules, .next, backups
        
        Restore->>DB: Update progress: 50% (Extracting)
        Restore->>FS: Extract tar.gz
        
        Restore->>DB: Update progress: 70% (Restoring files)
        Restore->>FS: Write files to workspace
        
        Restore->>DB: Update progress: 90% (Validating)
        Restore->>FS: Check key files exist
        
        alt Validation Failed
            Restore->>DB: Update progress: Rollback
            Restore->>FS: Restore from safety backup
            Restore-->>API: Error: Validation failed
            API-->>UI: Restore failed
            UI-->>User: Show error + rollback notice
        else Validation Passed
            Restore->>DB: Update progress: 95% (Restarting)
            Restore->>Services: Restart services
            Services-->>Restore: Services started
            
            Restore->>DB: Update progress: 100% (Complete)
            Restore-->>API: Success
            
            API->>DB: Update restoreOperation (completed)
            API-->>UI: Restore complete
            
            UI->>UI: Show success notification
            UI-->>User: "Workspace restored! Restart recommended."
        end
    end
```

**Key Safety Features:**
1. **Pre-validation:** Check backup integrity before touching workspace
2. **Safety backup:** Always create pre-restore backup (unless disabled)
3. **Atomic restore:** All files or none (rollback on failure)
4. **Service management:** Stop/start services to prevent file locks
5. **Post-validation:** Verify restore succeeded before declaring success

---

## 3. Search & Find Backup Flow

```mermaid
flowchart TD
    A[User needs specific backup] --> B[Open Backups Dashboard]
    B --> C{Know exact date?}
    
    C -->|Yes| D[Use date filter]
    C -->|No| E[Search by description]
    
    D --> F[Apply date range filter]
    E --> G[Enter search keywords]
    
    F --> H[View filtered results]
    G --> H
    
    H --> I{Found it?}
    
    I -->|No| J{Try different approach?}
    J -->|Search by tags| K[Click on tag filters]
    J -->|Browse timeline| L[Scroll through timeline view]
    J -->|Sort differently| M[Sort by size/date]
    
    K --> H
    L --> H
    M --> H
    
    I -->|Yes| N[Click on backup]
    N --> O[View backup details]
    O --> P{Is this the right one?}
    
    P -->|No| J
    P -->|Yes| Q[Click 'Restore']
    Q --> R[Follow restore flow]
    
    style A fill:#e1f5ff
    style Q fill:#90ee90
    style R fill:#90ee90
```

**Search Features:**
- **Full-text search:** Description, tags, filename
- **Date filters:** Exact date, date range, relative (last 7 days)
- **Tag filters:** Click tag to filter, multi-select
- **Smart suggestions:** Auto-complete based on history
- **Timeline grouping:** Today, Yesterday, This Week, This Month

---

## 4. Automatic Backup (Cron) Flow

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant Script as backup.sh
    participant FS as File System
    participant DB as Convex DB
    participant Monitor as Mission Control

    Note over Cron: Daily at 2:00 AM
    Cron->>Script: Execute backup.sh "Daily backup" "auto,daily" "auto"
    
    Script->>FS: Check workspace size
    Script->>FS: Check disk space
    
    alt Insufficient Space
        Script->>Monitor: Log warning
        Script->>DB: Create alert record
        Note over Script: Skip backup, alert user
    else Space Available
        Script->>FS: Create backup tar.gz
        Script->>Script: Calculate checksum
        Script->>DB: Create backup record
        DB->>DB: Set retentionPolicy: "30-days"
        DB->>DB: Calculate expiresAt: createdAt + 30 days
        
        Script->>Monitor: Log success
        Script->>DB: Update backup metrics
        
        Note over Script,DB: Backup appears in dashboard automatically
    end
```

**Cron Configuration:**
```bash
# In crontab
0 2 * * * /Users/openclaw/.openclaw/workspace/ops/backup.sh "Automatic daily backup" "auto,daily" "auto"

# In CRON_GOVERNANCE.md
Job: Daily Workspace Backup
Schedule: 0 2 * * * (2 AM daily)
Purpose: Automatic safety backups
Retention: 30 days
```

---

## 5. Backup Validation Flow

```mermaid
flowchart TD
    A[Start Validation] --> B[Check file exists]
    B --> C{File found?}
    
    C -->|No| D[Mark invalid: File missing]
    C -->|Yes| E[Test tar integrity]
    
    E --> F{tar -tzf passes?}
    F -->|No| G[Mark invalid: Corrupt tar]
    F -->|Yes| H[List contents]
    
    H --> I[Count files]
    I --> J[Get file size]
    J --> K[Verify checksum optional]
    
    K --> L{Checksum stored?}
    L -->|No| M[Skip checksum check]
    L -->|Yes| N[Calculate actual checksum]
    
    N --> O{Checksums match?}
    O -->|No| P[Mark invalid: Checksum mismatch]
    O -->|Yes| Q[Check key files]
    
    M --> Q
    Q --> R{package.json exists?}
    
    R -->|No| S[Mark invalid: Missing key files]
    R -->|Yes| T[Mark valid ✓]
    
    T --> U[Update DB: isValid=true, validatedAt=now]
    D --> V[Update DB: isValid=false, validationError]
    G --> V
    P --> V
    S --> V
    
    U --> W[Return success]
    V --> W
    
    style T fill:#90ee90
    style D fill:#ff6b6b
    style G fill:#ff6b6b
    style P fill:#ff6b6b
    style S fill:#ff6b6b
```

**When Validation Runs:**
1. **Before Restore:** Always validate before restoring
2. **On Demand:** User clicks "Validate" button
3. **Scheduled:** Weekly validation of all backups (cron job)
4. **On Upload:** If restoring from external backup

---

## 6. Backup Retention Policy Flow

```mermaid
flowchart TD
    A[Nightly Retention Job<br/>3 AM daily] --> B[Query all backups]
    B --> C[For each backup...]
    
    C --> D{Has retentionPolicy?}
    D -->|No| E[Skip keep forever]
    D -->|Yes| F{Policy = keep-forever?}
    
    F -->|Yes| E
    F -->|No| G[Calculate age]
    
    G --> H{Age > policy days?}
    H -->|No| E
    H -->|Yes| I{backupType = pre-restore?}
    
    I -->|Yes| J{Age > 24 hours?}
    I -->|No| K{Important backup?}
    
    J -->|No| E
    J -->|Yes| L[Soft delete]
    
    K -->|Has restoreHistory?| E[Keep skip deletion]
    K -->|No restoreHistory| L
    
    L --> M[Update status: deleted]
    M --> N{deleteFile = true?}
    
    N -->|Yes| O[Delete physical file]
    N -->|No| P[Keep file, mark deleted]
    
    O --> Q[Log deletion]
    P --> Q
    E --> R[Continue to next backup]
    Q --> R
    
    R --> S{More backups?}
    S -->|Yes| C
    S -->|No| T[Update metrics]
    T --> U[End]
    
    style L fill:#ffc107
    style O fill:#ff6b6b
    style E fill:#90ee90
```

**Retention Policies:**
- **keep-forever:** Never auto-delete (default for manual/milestone backups)
- **30-days:** Delete after 30 days (default for auto backups)
- **90-days:** Delete after 90 days (configurable)
- **pre-restore:** Delete after 24 hours (safety backups)

**Smart Retention:**
- Keep backups that have been restored (historical importance)
- Keep milestone backups regardless of age
- Warn before deleting large/old backups
- Soft-delete first (can be recovered for 7 days)

---

## 7. Backup List Loading & Rendering

```mermaid
sequenceDiagram
    actor User
    participant UI as Backups Page
    participant Convex as Convex Client
    participant DB as Convex DB
    participant FS as File System

    User->>UI: Navigate to /app/backups
    UI->>UI: Mount component
    
    UI->>Convex: Subscribe to listBackups query
    Convex->>DB: Query backups table
    DB->>DB: Filter by status != "deleted"
    DB->>DB: Sort by createdAt DESC
    DB->>DB: Apply pagination (limit 50)
    
    DB-->>Convex: Return backups array
    
    par File Existence Check
        Convex->>FS: Check each backup file exists
        FS-->>Convex: Existence status
    end
    
    Convex-->>UI: Backups data + existence
    UI->>UI: Render backup list
    
    Note over UI: User sees backup list<br/>with live updates
    
    User->>UI: Type in search box
    UI->>Convex: Update query filters
    Convex->>DB: Re-query with search filter
    DB-->>Convex: Filtered results
    Convex-->>UI: Update UI (instant)
    
    Note over UI,Convex: Convex subscription<br/>auto-updates on any DB change
    
    DB->>Convex: [New backup created elsewhere]
    Convex->>UI: Push update
    UI->>UI: Prepend new backup to list
    UI->>UI: Show notification "New backup available"
```

**Performance Optimizations:**
- **Pagination:** Load 50 backups at a time
- **Virtual scrolling:** Render only visible rows (future)
- **Debounced search:** Wait 300ms after typing stops
- **Cached file checks:** Cache existence checks for 60s
- **Optimistic UI:** Show backup immediately, validate in background

---

## 8. Error Handling & Recovery Flow

```mermaid
flowchart TD
    A[Error Occurs] --> B{Error Type?}
    
    B -->|Insufficient Space| C[Show error dialog]
    B -->|Corrupt Backup| D[Mark backup invalid]
    B -->|Network Error| E[Retry with exponential backoff]
    B -->|Script Failure| F[Log error details]
    B -->|Restore Failure| G[Rollback to safety backup]
    
    C --> H[Suggest cleanup actions]
    H --> I[Show disk usage]
    I --> J[Offer to delete old backups]
    
    D --> K[Update isValid = false]
    K --> L[Show warning badge]
    L --> M[Offer re-validation]
    
    E --> N{Retry count < 3?}
    N -->|Yes| O[Wait and retry]
    N -->|No| P[Give up, show error]
    
    O --> Q{Success?}
    Q -->|Yes| R[Continue operation]
    Q -->|No| E
    
    F --> S[Create error log]
    S --> T[Show user-friendly message]
    T --> U[Offer to view technical details]
    
    G --> V[Stop restore process]
    V --> W[Extract safety backup]
    W --> X[Restore original state]
    X --> Y[Show rollback success]
    
    J --> Z[User action]
    M --> Z
    P --> Z
    U --> Z
    Y --> Z
    R --> Z
    
    style C fill:#ff6b6b
    style D fill:#ffc107
    style G fill:#ff6b6b
    style Y fill:#90ee90
    style R fill:#90ee90
```

**Error Categories:**

1. **User-Recoverable Errors:**
   - Insufficient disk space → Cleanup suggestions
   - Invalid backup selected → Show validation details
   - Missing backup file → Offer re-download or delete

2. **System-Recoverable Errors:**
   - Network timeouts → Auto-retry
   - Temporary file locks → Wait and retry
   - Service restart failure → Retry with sudo

3. **Critical Errors:**
   - Restore validation failure → Automatic rollback
   - Data corruption → Block operation, alert user
   - Permission denied → Show detailed instructions

---

## 9. Real-Time Progress Updates

```mermaid
sequenceDiagram
    participant UI as UI Component
    participant API as Next.js API
    participant Script as restore.sh
    participant DB as Convex DB
    
    UI->>API: POST /api/restore/start
    API->>Script: Execute restore.sh (background)
    API-->>UI: Return operationId
    
    UI->>UI: Open progress dialog
    UI->>DB: Subscribe to restoreOperation(operationId)
    
    loop Every 1-2 seconds
        Script->>DB: Update progress_percent
        Script->>DB: Update current_step
        DB->>UI: Push update via subscription
        UI->>UI: Update progress bar
        UI->>UI: Update status text
    end
    
    Script->>Script: Restore completes
    Script->>DB: Set status = "completed"
    Script->>DB: Set progress_percent = 100
    
    DB->>UI: Final update
    UI->>UI: Show success message
    UI->>UI: Close progress dialog
    UI->>UI: Refresh backup list
```

**Progress Steps:**
1. **0-10%:** Validating backup file
2. **10-20%:** Creating safety backup
3. **20-30%:** Stopping services
4. **30-50%:** Clearing workspace
5. **50-70%:** Extracting backup
6. **70-90%:** Restoring files
7. **90-95%:** Validating restore
8. **95-100%:** Restarting services

---

## 10. Integration with Mission Control

```mermaid
flowchart LR
    A[Mission Control] --> B[Backups Menu Item]
    B --> C[Backups Dashboard]
    
    C --> D[Backup List]
    C --> E[Backup Stats Widget]
    C --> F[Quick Actions]
    
    D --> G[Individual Backup Details]
    
    F --> H[Backup Now]
    F --> I[Restore Latest]
    F --> J[View History]
    
    H --> K[Create Backup Dialog]
    I --> L[Restore Dialog]
    J --> M[Restore History Page]
    
    E --> N[Total Backups: 47]
    E --> O[Total Size: 8.3 GB]
    E --> P[Last Backup: 2h ago]
    
    A --> Q[Calendar]
    Q --> R[Scheduled Backups]
    R --> S[Cron: Daily 2 AM]
    
    A --> T[Settings]
    T --> U[Backup Preferences]
    U --> V[Retention Policies]
    U --> W[Auto-Backup Schedule]
    
    style C fill:#e1f5ff
    style K fill:#90ee90
    style L fill:#ffc107
```

**Menu Structure:**
```
Mission Control
├── Tasks
├── Calendar
│   └── Scheduled Backups (shows auto-backup jobs)
├── Team
├── Memory
├── Office Space
├── Email Cleanup
└── Backups (NEW)
    ├── Dashboard (default view)
    ├── History (restore operations)
    └── Settings (retention, schedule)
```

---

## Summary

These workflows demonstrate:
- **Safety-first design:** Multiple validation points, automatic rollbacks
- **User-friendly:** Clear progress, helpful errors, smart defaults
- **Production-ready:** Error handling, retry logic, atomic operations
- **Real-time:** Live updates via Convex subscriptions
- **Integrated:** Seamlessly fits into Mission Control ecosystem

**Next Steps:**
1. Implement core backup/restore scripts
2. Build Convex schema and queries
3. Create UI components
4. Add real-time subscriptions
5. Comprehensive testing
6. Deploy and monitor
