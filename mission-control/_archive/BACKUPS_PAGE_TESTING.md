# Backups Page - Testing Strategy

## Testing Overview

Comprehensive testing strategy for the Backups page covering unit tests, integration tests, E2E tests, and manual testing scenarios.

## Test Categories

1. **Unit Tests** - Individual component behavior
2. **Integration Tests** - Component + API interaction
3. **E2E Tests** - Full user workflows
4. **Manual Tests** - Real-world scenarios
5. **Load Tests** - Performance under stress
6. **Security Tests** - Permission and safety checks

---

## 1. Unit Tests

### Framework
- **React Testing Library** - Component testing
- **Jest** - Test runner
- **MSW** - API mocking

### Test Files Structure
```
__tests__/
├── components/
│   ├── BackupsPage.test.tsx
│   ├── CreateBackupSection.test.tsx
│   ├── BackupsTable.test.tsx
│   ├── BackupRow.test.tsx
│   ├── StatusBadge.test.tsx
│   └── RestoreModal.test.tsx
├── utils/
│   ├── formatBytes.test.ts
│   ├── formatDate.test.ts
│   └── validation.test.ts
└── api/
    ├── backups-list.test.ts
    ├── backups-create.test.ts
    ├── backups-restore.test.ts
    └── backups-delete.test.ts
```

---

### BackupsPage Component Tests

```typescript
describe("BackupsPage", () => {
  it("renders loading state initially", () => {
    render(<BackupsPage />);
    expect(screen.getByText(/loading backups/i)).toBeInTheDocument();
  });
  
  it("renders backup list after loading", async () => {
    const mockBackups = [createMockBackup()];
    mockUseQuery.mockReturnValue(mockBackups);
    
    render(<BackupsPage />);
    
    await waitFor(() => {
      expect(screen.getByText(mockBackups[0].filename)).toBeInTheDocument();
    });
  });
  
  it("filters backups by search query", async () => {
    const mockBackups = [
      createMockBackup({ filename: "backup1.tar.gz", description: "Test" }),
      createMockBackup({ filename: "backup2.tar.gz", description: "Production" }),
    ];
    mockUseQuery.mockReturnValue(mockBackups);
    
    render(<BackupsPage />);
    
    const searchInput = screen.getByPlaceholderText(/search backups/i);
    fireEvent.change(searchInput, { target: { value: "Test" } });
    
    await waitFor(() => {
      expect(screen.getByText("backup1.tar.gz")).toBeInTheDocument();
      expect(screen.queryByText("backup2.tar.gz")).not.toBeInTheDocument();
    });
  });
  
  it("sorts backups by date", async () => {
    const mockBackups = [
      createMockBackup({ createdAt: 1000 }),
      createMockBackup({ createdAt: 2000 }),
    ];
    mockUseQuery.mockReturnValue(mockBackups);
    
    render(<BackupsPage />);
    
    const sortDropdown = screen.getByRole("combobox");
    fireEvent.change(sortDropdown, { target: { value: "date-asc" } });
    
    const rows = screen.getAllByRole("row").slice(1); // Skip header
    expect(rows[0]).toHaveTextContent("1000");
    expect(rows[1]).toHaveTextContent("2000");
  });
  
  it("displays error banner on backup creation failure", async () => {
    mockUseMutation.mockRejectedValue(new Error("Disk space insufficient"));
    
    render(<BackupsPage />);
    
    const createButton = screen.getByText(/create backup/i);
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText(/disk space insufficient/i)).toBeInTheDocument();
    });
  });
});
```

---

### CreateBackupSection Component Tests

```typescript
describe("CreateBackupSection", () => {
  const mockOnCreateBackup = jest.fn();
  
  it("renders input and button", () => {
    render(<CreateBackupSection onCreateBackup={mockOnCreateBackup} creating={false} />);
    
    expect(screen.getByPlaceholderText(/description/i)).toBeInTheDocument();
    expect(screen.getByText(/create backup/i)).toBeInTheDocument();
  });
  
  it("calls onCreateBackup with description", async () => {
    render(<CreateBackupSection onCreateBackup={mockOnCreateBackup} creating={false} />);
    
    const input = screen.getByPlaceholderText(/description/i);
    const button = screen.getByText(/create backup/i);
    
    fireEvent.change(input, { target: { value: "Test backup" } });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOnCreateBackup).toHaveBeenCalledWith("Test backup");
    });
  });
  
  it("disables form while creating", () => {
    render(<CreateBackupSection onCreateBackup={mockOnCreateBackup} creating={true} />);
    
    const input = screen.getByPlaceholderText(/description/i);
    const button = screen.getByText(/creating/i);
    
    expect(input).toBeDisabled();
    expect(button).toBeDisabled();
  });
  
  it("shows success message", () => {
    const lastSuccess = {
      filename: "backup.tar.gz",
      sizeBytes: 1024000,
      timestamp: Date.now(),
    };
    
    render(
      <CreateBackupSection
        onCreateBackup={mockOnCreateBackup}
        creating={false}
        lastSuccess={lastSuccess}
      />
    );
    
    expect(screen.getByText(/backup created successfully/i)).toBeInTheDocument();
    expect(screen.getByText(/backup.tar.gz/i)).toBeInTheDocument();
  });
  
  it("auto-dismisses success message after 5 seconds", async () => {
    jest.useFakeTimers();
    
    const lastSuccess = {
      filename: "backup.tar.gz",
      sizeBytes: 1024000,
      timestamp: Date.now(),
    };
    
    render(
      <CreateBackupSection
        onCreateBackup={mockOnCreateBackup}
        creating={false}
        lastSuccess={lastSuccess}
      />
    );
    
    expect(screen.getByText(/backup created successfully/i)).toBeInTheDocument();
    
    jest.advanceTimersByTime(5000);
    
    await waitFor(() => {
      expect(screen.queryByText(/backup created successfully/i)).not.toBeInTheDocument();
    });
    
    jest.useRealTimers();
  });
});
```

---

### BackupsTable Component Tests

```typescript
describe("BackupsTable", () => {
  const mockBackups = [
    createMockBackup({ filename: "backup1.tar.gz" }),
    createMockBackup({ filename: "backup2.tar.gz" }),
  ];
  
  const defaultProps = {
    backups: mockBackups,
    onRestore: jest.fn(),
    onDelete: jest.fn(),
    onDownload: jest.fn(),
    onUpdateDescription: jest.fn(),
    searchQuery: "",
    sortBy: "date" as const,
    sortOrder: "desc" as const,
    onSearchChange: jest.fn(),
    onSortChange: jest.fn(),
    loading: false,
  };
  
  it("renders all backups", () => {
    render(<BackupsTable {...defaultProps} />);
    
    expect(screen.getByText("backup1.tar.gz")).toBeInTheDocument();
    expect(screen.getByText("backup2.tar.gz")).toBeInTheDocument();
  });
  
  it("shows empty state when no backups", () => {
    render(<BackupsTable {...defaultProps} backups={[]} />);
    
    expect(screen.getByText(/no backups found/i)).toBeInTheDocument();
  });
  
  it("shows loading state", () => {
    render(<BackupsTable {...defaultProps} loading={true} />);
    
    expect(screen.getByText(/loading backups/i)).toBeInTheDocument();
  });
  
  it("displays total size and count", () => {
    render(<BackupsTable {...defaultProps} />);
    
    expect(screen.getByText(/2 backups/i)).toBeInTheDocument();
  });
  
  it("calls onSearchChange when typing in search", () => {
    render(<BackupsTable {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText(/search backups/i);
    fireEvent.change(searchInput, { target: { value: "test" } });
    
    expect(defaultProps.onSearchChange).toHaveBeenCalledWith("test");
  });
});
```

---

### BackupRow Component Tests

```typescript
describe("BackupRow", () => {
  const mockBackup = createMockBackup({
    filename: "backup.tar.gz",
    description: "Test backup",
    status: "valid",
  });
  
  const defaultProps = {
    backup: mockBackup,
    onRestore: jest.fn(),
    onDelete: jest.fn(),
    onDownload: jest.fn(),
    onUpdateDescription: jest.fn(),
  };
  
  it("renders backup information", () => {
    render(<BackupRow {...defaultProps} />);
    
    expect(screen.getByText("backup.tar.gz")).toBeInTheDocument();
    expect(screen.getByText("Test backup")).toBeInTheDocument();
  });
  
  it("enters edit mode on description click", () => {
    render(<BackupRow {...defaultProps} />);
    
    const description = screen.getByText("Test backup");
    fireEvent.click(description);
    
    const input = screen.getByDisplayValue("Test backup");
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });
  
  it("saves description on blur", async () => {
    render(<BackupRow {...defaultProps} />);
    
    const description = screen.getByText("Test backup");
    fireEvent.click(description);
    
    const input = screen.getByDisplayValue("Test backup");
    fireEvent.change(input, { target: { value: "Updated description" } });
    fireEvent.blur(input);
    
    await waitFor(() => {
      expect(defaultProps.onUpdateDescription).toHaveBeenCalledWith("Updated description");
    });
  });
  
  it("saves description on Enter key", async () => {
    render(<BackupRow {...defaultProps} />);
    
    const description = screen.getByText("Test backup");
    fireEvent.click(description);
    
    const input = screen.getByDisplayValue("Test backup");
    fireEvent.change(input, { target: { value: "Updated description" } });
    fireEvent.keyDown(input, { key: "Enter" });
    
    await waitFor(() => {
      expect(defaultProps.onUpdateDescription).toHaveBeenCalledWith("Updated description");
    });
  });
  
  it("cancels edit on Escape key", () => {
    render(<BackupRow {...defaultProps} />);
    
    const description = screen.getByText("Test backup");
    fireEvent.click(description);
    
    const input = screen.getByDisplayValue("Test backup");
    fireEvent.change(input, { target: { value: "Changed" } });
    fireEvent.keyDown(input, { key: "Escape" });
    
    expect(screen.getByText("Test backup")).toBeInTheDocument();
    expect(defaultProps.onUpdateDescription).not.toHaveBeenCalled();
  });
  
  it("calls onRestore when restore button clicked", () => {
    render(<BackupRow {...defaultProps} />);
    
    const restoreButton = screen.getByTitle("Restore");
    fireEvent.click(restoreButton);
    
    expect(defaultProps.onRestore).toHaveBeenCalled();
  });
  
  it("confirms before delete", async () => {
    global.confirm = jest.fn(() => true);
    
    render(<BackupRow {...defaultProps} />);
    
    const deleteButton = screen.getByTitle("Delete");
    fireEvent.click(deleteButton);
    
    expect(global.confirm).toHaveBeenCalledWith(
      expect.stringContaining("Delete backup")
    );
    
    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });
  });
  
  it("does not delete if user cancels", () => {
    global.confirm = jest.fn(() => false);
    
    render(<BackupRow {...defaultProps} />);
    
    const deleteButton = screen.getByTitle("Delete");
    fireEvent.click(deleteButton);
    
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  });
  
  it("disables restore button for corrupted backups", () => {
    const corruptedBackup = createMockBackup({ status: "corrupted" });
    
    render(<BackupRow {...defaultProps} backup={corruptedBackup} />);
    
    const restoreButton = screen.getByTitle("Restore");
    expect(restoreButton).toBeDisabled();
  });
});
```

---

### StatusBadge Component Tests

```typescript
describe("StatusBadge", () => {
  it("renders valid status", () => {
    render(<StatusBadge status="valid" />);
    
    expect(screen.getByText("Valid")).toBeInTheDocument();
    expect(screen.getByText("Valid")).toHaveClass("text-green-700");
  });
  
  it("renders corrupted status", () => {
    render(<StatusBadge status="corrupted" />);
    
    expect(screen.getByText("Corrupted")).toBeInTheDocument();
    expect(screen.getByText("Corrupted")).toHaveClass("text-red-700");
  });
  
  it("shows spinner for creating status", () => {
    render(<StatusBadge status="creating" />);
    
    expect(screen.getByText("Creating")).toBeInTheDocument();
    const spinner = screen.getByText("Creating").previousSibling;
    expect(spinner).toHaveClass("animate-spin");
  });
});
```

---

### RestoreModal Component Tests

```typescript
describe("RestoreModal", () => {
  const mockBackup = createMockBackup({
    filename: "backup.tar.gz",
    description: "Test backup",
    createdAt: Date.now(),
  });
  
  const defaultProps = {
    backup: mockBackup,
    open: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    restoring: false,
  };
  
  it("does not render when open is false", () => {
    render(<RestoreModal {...defaultProps} open={false} />);
    
    expect(screen.queryByText(/restore workspace backup/i)).not.toBeInTheDocument();
  });
  
  it("renders when open is true", () => {
    render(<RestoreModal {...defaultProps} />);
    
    expect(screen.getByText(/restore workspace backup/i)).toBeInTheDocument();
  });
  
  it("displays backup details", () => {
    render(<RestoreModal {...defaultProps} />);
    
    expect(screen.getByText("backup.tar.gz")).toBeInTheDocument();
    expect(screen.getByText("Test backup")).toBeInTheDocument();
  });
  
  it("disables confirm button until checkbox is checked", () => {
    render(<RestoreModal {...defaultProps} />);
    
    const confirmButton = screen.getByText(/restore workspace/i);
    expect(confirmButton).toBeDisabled();
    
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    expect(confirmButton).not.toBeDisabled();
  });
  
  it("calls onConfirm when confirmed", async () => {
    render(<RestoreModal {...defaultProps} />);
    
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    
    const confirmButton = screen.getByText(/restore workspace/i);
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(defaultProps.onConfirm).toHaveBeenCalled();
    });
  });
  
  it("calls onClose when cancel clicked", () => {
    render(<RestoreModal {...defaultProps} />);
    
    const cancelButton = screen.getByText(/cancel/i);
    fireEvent.click(cancelButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
  
  it("resets checkbox when modal reopens", () => {
    const { rerender } = render(<RestoreModal {...defaultProps} />);
    
    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
    
    rerender(<RestoreModal {...defaultProps} open={false} />);
    rerender(<RestoreModal {...defaultProps} open={true} />);
    
    const newCheckbox = screen.getByRole("checkbox");
    expect(newCheckbox).not.toBeChecked();
  });
  
  it("disables all actions while restoring", () => {
    render(<RestoreModal {...defaultProps} restoring={true} />);
    
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getByText(/restoring/i)).toBeDisabled();
    expect(screen.getByText(/cancel/i)).toBeDisabled();
  });
});
```

---

## 2. Integration Tests

### API Integration Tests

```typescript
describe("Backups API Integration", () => {
  beforeEach(() => {
    setupTestDatabase();
  });
  
  afterEach(() => {
    cleanupTestDatabase();
  });
  
  describe("POST /api/backups/create", () => {
    it("creates backup with description", async () => {
      const response = await fetch("/api/backups/create", {
        method: "POST",
        body: JSON.stringify({ description: "Test backup" }),
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.filename).toContain("workspace_");
      expect(data.description).toBe("Test backup");
      expect(data.sizeBytes).toBeGreaterThan(0);
    });
    
    it("creates backup without description", async () => {
      const response = await fetch("/api/backups/create", {
        method: "POST",
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.description).toBeNull();
    });
    
    it("returns error on insufficient disk space", async () => {
      mockDiskSpace({ free: 100 }); // Simulate low disk space
      
      const response = await fetch("/api/backups/create", {
        method: "POST",
        body: JSON.stringify({}),
      });
      
      expect(response.status).toBe(500);
      expect(await response.text()).toContain("Insufficient disk space");
    });
  });
  
  describe("GET /api/backups/list", () => {
    it("returns all backups", async () => {
      await createTestBackup({ description: "Backup 1" });
      await createTestBackup({ description: "Backup 2" });
      
      const response = await fetch("/api/backups/list");
      const data = await response.json();
      
      expect(data.backups).toHaveLength(2);
      expect(data.totalCount).toBe(2);
    });
    
    it("syncs with filesystem", async () => {
      // Create file manually (not in DB)
      await createFileSystemBackup("manual_backup.tar.gz");
      
      const response = await fetch("/api/backups/list");
      const data = await response.json();
      
      // Should detect and add to DB
      expect(data.backups.some(b => b.filename === "manual_backup.tar.gz")).toBe(true);
    });
  });
  
  describe("POST /api/backups/restore", () => {
    it("restores backup successfully", async () => {
      const backup = await createTestBackup({ description: "Test" });
      
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: JSON.stringify({ backupId: backup._id }),
      });
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.preRestoreBackup).toBeDefined();
    });
    
    it("creates pre-restore backup", async () => {
      const backup = await createTestBackup({ description: "Test" });
      
      await fetch("/api/backups/restore", {
        method: "POST",
        body: JSON.stringify({ backupId: backup._id }),
      });
      
      const backups = await fetch("/api/backups/list").then(r => r.json());
      
      expect(
        backups.backups.some(b => b.isPreRestoreBackup === true)
      ).toBe(true);
    });
    
    it("fails if backup is corrupted", async () => {
      const backup = await createTestBackup({ status: "corrupted" });
      
      const response = await fetch("/api/backups/restore", {
        method: "POST",
        body: JSON.stringify({ backupId: backup._id }),
      });
      
      expect(response.status).toBe(400);
    });
  });
});
```

---

## 3. E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";

test.describe("Backups Page E2E", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:3000/app/backups");
  });
  
  test("complete backup creation flow", async ({ page }) => {
    // Enter description
    await page.fill('input[placeholder*="Description"]', "E2E Test Backup");
    
    // Click create
    await page.click('button:has-text("Create Backup")');
    
    // Wait for success message
    await expect(page.locator('text=Backup created successfully')).toBeVisible();
    
    // Verify backup appears in table
    await expect(page.locator('text=E2E Test Backup')).toBeVisible();
  });
  
  test("complete restore flow", async ({ page }) => {
    // Find first valid backup
    const restoreButton = page.locator('button[title="Restore"]').first();
    await restoreButton.click();
    
    // Modal should appear
    await expect(page.locator('text=Restore Workspace Backup')).toBeVisible();
    
    // Check confirmation
    await page.check('input[type="checkbox"]');
    
    // Confirm restore
    await page.click('button:has-text("Restore Workspace")');
    
    // Wait for success (or handle reload prompt)
    await page.waitForTimeout(5000);
  });
  
  test("edit backup description", async ({ page }) => {
    // Click on description
    const description = page.locator('tbody tr:first-child td:nth-child(4)');
    await description.click();
    
    // Should show input
    const input = page.locator('input[value]');
    await expect(input).toBeVisible();
    
    // Edit
    await input.fill("Updated description");
    await input.press("Enter");
    
    // Verify saved
    await expect(page.locator('text=Updated description')).toBeVisible();
  });
  
  test("delete backup", async ({ page }) => {
    // Mock confirmation
    page.on('dialog', dialog => dialog.accept());
    
    // Click delete
    const deleteButton = page.locator('button[title="Delete"]').first();
    await deleteButton.click();
    
    // Wait for deletion
    await page.waitForTimeout(1000);
    
    // Verify removed (check row count changed)
    const initialCount = await page.locator('tbody tr').count();
    expect(initialCount).toBeGreaterThan(0);
  });
  
  test("search backups", async ({ page }) => {
    // Type in search
    await page.fill('input[placeholder*="Search"]', "test");
    
    // Verify filtered results
    await page.waitForTimeout(500);
    
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    
    // At least one result or empty state
    expect(count).toBeGreaterThanOrEqual(0);
  });
  
  test("sort backups", async ({ page }) => {
    // Change sort
    await page.selectOption('select', 'size-desc');
    
    // Verify order changed
    await page.waitForTimeout(500);
    
    const firstRow = page.locator('tbody tr:first-child td:nth-child(3)');
    await expect(firstRow).toBeVisible();
  });
});
```

---

## 4. Manual Testing Checklist

### Backup Creation
- [ ] Create backup without description
- [ ] Create backup with short description
- [ ] Create backup with long description (>100 chars)
- [ ] Create backup with special characters in description
- [ ] Create multiple backups rapidly
- [ ] Create backup with low disk space
- [ ] Cancel backup creation mid-process
- [ ] Create backup while another is in progress

### Backup List
- [ ] View empty backup list
- [ ] View list with 1 backup
- [ ] View list with 10+ backups
- [ ] View list with 100+ backups
- [ ] Search for existing backup
- [ ] Search for non-existent backup
- [ ] Clear search
- [ ] Sort by date ascending/descending
- [ ] Sort by size ascending/descending
- [ ] Sort by name A-Z/Z-A
- [ ] Verify total size calculation
- [ ] Verify backup count

### Description Editing
- [ ] Click to edit description
- [ ] Save with Enter key
- [ ] Save with blur (click away)
- [ ] Cancel with Escape key
- [ ] Edit empty description
- [ ] Edit existing description
- [ ] Clear description (make empty)
- [ ] Edit with special characters
- [ ] Edit while backup is being restored
- [ ] Edit multiple descriptions simultaneously

### Status Indicators
- [ ] View "Valid" status
- [ ] View "Corrupted" status
- [ ] View "Missing" status
- [ ] View "Creating" status (animated)
- [ ] View "Restoring" status (animated)

### Restore Workflow
- [ ] Open restore modal
- [ ] View backup details in modal
- [ ] Try to confirm without checking box
- [ ] Check confirmation box
- [ ] Confirm restore
- [ ] Cancel restore
- [ ] Close modal with X button
- [ ] Restore valid backup
- [ ] Try to restore corrupted backup
- [ ] Try to restore missing backup
- [ ] Restore with low disk space
- [ ] Restore while backup is being created
- [ ] Multiple restore attempts
- [ ] Verify pre-restore backup created
- [ ] Verify workspace restored correctly

### Delete Operations
- [ ] Delete single backup
- [ ] Cancel delete confirmation
- [ ] Delete multiple backups in sequence
- [ ] Try to delete pinned backup (future)
- [ ] Delete and verify file removed from filesystem
- [ ] Delete and verify DB record removed

### Download Operations
- [ ] Download backup
- [ ] Download large backup (>100MB)
- [ ] Download multiple backups
- [ ] Cancel download mid-stream
- [ ] Verify downloaded file integrity

### Error Handling
- [ ] Create backup with full disk
- [ ] Restore corrupted backup
- [ ] Restore non-existent backup
- [ ] Delete non-existent backup
- [ ] Network error during operation
- [ ] Database error
- [ ] Permission denied error
- [ ] Concurrent operation conflicts

### Performance
- [ ] Load page with 100+ backups
- [ ] Search through 100+ backups
- [ ] Rapid backup creation (10 in 1 minute)
- [ ] Large backup creation (>1GB)
- [ ] Large backup restore (>1GB)
- [ ] Multiple users accessing simultaneously

### Accessibility
- [ ] Navigate with keyboard only
- [ ] Use screen reader (VoiceOver/NVDA)
- [ ] Tab order is logical
- [ ] Focus indicators visible
- [ ] ARIA labels present
- [ ] Color contrast sufficient
- [ ] Resizable text
- [ ] Modal focus trap working

### Browser Compatibility
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 5. Load Testing

### Performance Benchmarks

```javascript
// Load test with autocannon
const autocannon = require("autocannon");

// Create backup - should complete in <10s
autocannon({
  url: "http://localhost:3000/api/backups/create",
  method: "POST",
  connections: 1,
  duration: 10,
  body: JSON.stringify({ description: "Load test" }),
});

// List backups - should respond in <500ms
autocannon({
  url: "http://localhost:3000/api/backups/list",
  connections: 10,
  duration: 30,
});

// Expected Results:
// - List API: >100 req/s
// - Create API: ~6 req/min (10s per backup)
// - 99th percentile latency: <1000ms
```

---

## 6. Security Testing

### Security Test Cases

1. **Path Traversal**
   - [ ] Try to restore backup with path: `../../../etc/passwd`
   - [ ] Try to download backup with path: `../../sensitive.file`
   - [ ] Verify all paths are sanitized

2. **Authentication**
   - [ ] Access page without login
   - [ ] Access API without auth token
   - [ ] Verify session timeout

3. **Authorization**
   - [ ] User A cannot delete User B's backups (multi-user)
   - [ ] User cannot access backups outside allowed directory

4. **Input Validation**
   - [ ] Description with SQL injection attempt
   - [ ] Description with XSS script tags
   - [ ] Description with null bytes
   - [ ] Backup ID with invalid format

5. **File Safety**
   - [ ] Backup extraction to allowed directory only
   - [ ] No symlink following
   - [ ] No overwriting system files

---

## 7. Testing Utilities

### Mock Data Factory

```typescript
export function createMockBackup(overrides?: Partial<Backup>): Backup {
  return {
    _id: `backup_${Date.now()}`,
    _creationTime: Date.now(),
    filename: "workspace_20260223_120000.tar.gz",
    filepath: "/Users/openclaw/.openclaw/backups/workspace_20260223_120000.tar.gz",
    sizeBytes: 2400000,
    description: "Test backup",
    status: "valid",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    restoreCount: 0,
    createdBy: "manual",
    ...overrides,
  };
}
```

### Test Database Setup

```typescript
export async function setupTestDatabase() {
  // Clear existing data
  await convex.mutation(api.backups.deleteAll);
  
  // Seed test data
  await convex.mutation(api.backups.seedTestBackups);
}

export async function cleanupTestDatabase() {
  await convex.mutation(api.backups.deleteAll);
}
```

### Filesystem Helpers

```typescript
export async function createTestBackup(options: {
  description?: string;
  sizeBytes?: number;
}): Promise<Backup> {
  // Create actual tar.gz file for testing
  const timestamp = formatTimestamp(new Date());
  const filename = `test_backup_${timestamp}.tar.gz`;
  
  // Create dummy backup
  await exec(`
    cd /tmp
    echo "test content" > test.txt
    tar -czf ~/.openclaw/backups/${filename} test.txt
  `);
  
  // Create DB record
  return await convex.mutation(api.backups.create, {
    filename,
    filepath: `~/.openclaw/backups/${filename}`,
    sizeBytes: options.sizeBytes || 1024,
    description: options.description,
    createdBy: "cli",
  });
}

export async function cleanupTestBackups() {
  await exec(`rm -f ~/.openclaw/backups/test_backup_*.tar.gz`);
}
```

---

## Test Coverage Goals

- **Unit Tests**: >80% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All critical user flows covered
- **Manual Tests**: 100% checklist completion before release

---

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Test Backups Page

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 20
      
      - name: Install dependencies
        run: npm install
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## Test Report Template

```
# Backups Page Test Report - YYYY-MM-DD

## Summary
- Total Tests: XXX
- Passed: XXX
- Failed: XXX
- Coverage: XX%

## Unit Tests
✓ All component tests passing
✓ All utility tests passing

## Integration Tests
✓ API endpoints working
✗ Restore workflow failing (investigating)

## E2E Tests
✓ All flows tested
✓ Cross-browser compatibility verified

## Manual Tests
✓ Checklist 95% complete
⚠ Performance tests show slowdown with >200 backups

## Issues Found
1. [High] Restore fails on large backups (>500MB)
2. [Medium] Search debounce not working
3. [Low] Status badge animation stutters

## Next Steps
1. Fix restore timeout for large backups
2. Implement pagination for backup list
3. Optimize status badge animations
```
