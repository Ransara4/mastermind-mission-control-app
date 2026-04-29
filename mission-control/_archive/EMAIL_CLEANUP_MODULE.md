# Email Cleanup Module (Emmie) - Mission Control

## Overview

The Email Cleanup module provides a comprehensive interface for managing Emmie's inbox cleaning operations. Built as a fully-featured section within Mission Control, it allows users to configure rules, review uncertain emails, track metrics, and test cleanup operations before execution.

## Architecture

### Database Schema (Convex)

#### `emmieRules`
Stores cleanup rules with flexible configuration:
- **Fields**: name, description, type, action, condition, targetLabel, ageThresholdDays, enabled, priority, maxPerRun
- **Types**: age, sender, label, category, custom
- **Actions**: delete, archive, file
- **Priority**: Higher values execute first

#### `emmieWhitelist`
Protected senders that Emmie will never touch:
- **Fields**: email, name, reason, pattern (for domain matching)
- Supports both individual emails and domain patterns

#### `emmieUncertainEmails`
Emails flagged by Emmie for manual review:
- **Fields**: messageId, from, subject, snippet, receivedAt, flaggedAt, reason, suggestedAction, status
- **Statuses**: pending, approved, denied, filed
- Supports bulk approve/deny operations

#### `emmieCleanupLogs`
Detailed execution history:
- **Fields**: runId, startedAt, completedAt, status, emailsProcessed, emailsDeleted, emailsArchived, emailsFiled, emailsFlagged, errors, rulesApplied, duration
- Tracks performance and errors for each run

#### `emmieMetrics`
Daily aggregated metrics:
- **Fields**: date, totalDeleted, totalArchived, totalFiled, totalFlagged, successRate, falsePositives, avgProcessingTime, rulesExecuted, topRules
- Used for trend analysis and performance tracking

### Backend API (Convex Mutations/Queries)

Located in `convex/emmie.ts`:

#### Rules Management
- `listRules()` - Get all rules
- `getRule(id)` - Get specific rule
- `createRule(data)` - Create new rule
- `updateRule(id, data)` - Update existing rule
- `deleteRule(id)` - Delete rule
- `toggleRule(id)` - Enable/disable rule

#### Whitelist Management
- `listWhitelist()` - Get protected senders
- `addToWhitelist(data)` - Add sender to whitelist
- `removeFromWhitelist(id)` - Remove from whitelist

#### Uncertain Emails
- `listUncertainEmails()` - Get pending emails
- `getAllUncertainEmails()` - Get all (including resolved)
- `flagUncertainEmail(data)` - Flag email for review
- `approveUncertainEmail(id, action)` - Approve suggested action
- `denyUncertainEmail(id)` - Keep email in inbox
- `bulkApproveUncertainEmails(ids, action)` - Bulk approve
- `bulkDenyUncertainEmails(ids)` - Bulk deny

#### Logs & Metrics
- `listCleanupLogs(limit)` - Get execution logs
- `getCleanupLog(id)` - Get specific log
- `createCleanupLog(data)` - Create log entry
- `updateCleanupLog(id, data)` - Update log
- `getMetrics(days)` - Get metrics for period
- `recordDailyMetrics(data)` - Record daily stats

#### Demo Data
- `seedEmmieData()` - Initialize with sample data

### Frontend Components

Located in `app/app/email-cleanup/`:

#### Main Page (`page.tsx`)
- Smart sidebar navigation with collapsible sections
- Dashboard overview with key metrics
- Quick action buttons
- Section routing

#### Sections

**1. Rules & Instructions** (`sections/RulesSection.tsx`)
- Full CRUD for cleanup rules
- Rule templates for quick setup
- Priority management
- Enable/disable toggle
- Expandable rule details
- Gmail search query builder

**2. Whitelist** (`sections/WhitelistSection.tsx`)
- Protected senders list
- Add/remove senders
- Domain pattern support
- Search functionality
- Safety statistics

**3. Uncertain Emails** (`sections/UncertainEmailsSection.tsx`)
- Pending email review queue
- Individual approve/deny actions
- Bulk operations
- Email preview with context
- Reason explanations
- Suggested actions

**4. Metrics** (`sections/MetricsSection.tsx`)
- 30-day trend analysis
- Visual progress bars
- Action breakdown (deleted/archived/filed)
- Success rate tracking
- Top performing rules
- Daily activity chart

**5. Execution Logs** (`sections/LogsSection.tsx`)
- Detailed run history
- Status filtering (all/completed/failed/running)
- Expandable log details
- Error tracking
- Performance metrics per run

**6. Test Rules** (`sections/TestRulesSection.tsx`)
- Rule simulation
- Preview affected emails
- Safety checks (starred, important, unread)
- Whitelist conflict detection
- Sample email preview
- Warning system

## UI/UX Features

### Design Patterns
- Consistent color coding:
  - Delete = Red
  - Archive = Blue
  - File = Purple
  - Success = Green
  - Warning = Orange
  - Info = Blue
- Status badges with visual hierarchy
- Gradient backgrounds for key CTAs
- Hover states and transitions
- Responsive grid layouts

### User Experience
- Smart defaults and templates
- Bulk actions for efficiency
- Search and filtering
- Expandable details to reduce clutter
- Clear visual feedback
- Safety warnings and confirmations
- Preview before execution

### Accessibility
- Clear labels and descriptions
- Logical tab order
- Descriptive button text
- Status icons with colors
- Keyboard-friendly interactions

## Integration Points

### Gmail Integration
The module is designed to integrate with Gmail via:
1. **Search API** - Test rules and find matching emails
2. **Modification API** - Execute delete/archive/label operations
3. **OAuth 2.0** - Secure authentication

### Cron Job Integration
- Rules stored in Convex can be loaded by the Emmie cron job
- Execution results are logged back to `emmieCleanupLogs`
- Metrics are updated daily in `emmieMetrics`

### Suggested Implementation Flow:
```javascript
// In Emmie's cron job
async function runCleanup() {
  const rules = await convex.query(api.emmie.listRules);
  const whitelist = await convex.query(api.emmie.listWhitelist);
  
  const logId = await convex.mutation(api.emmie.createCleanupLog, {
    runId: `run_${Date.now()}`,
    rulesApplied: rules.map(r => r._id),
  });
  
  // Execute each rule
  for (const rule of rules.filter(r => r.enabled)) {
    // ... Gmail API operations
    
    // Flag uncertain emails
    if (uncertain) {
      await convex.mutation(api.emmie.flagUncertainEmail, { ... });
    }
  }
  
  // Update log
  await convex.mutation(api.emmie.updateCleanupLog, {
    id: logId,
    status: 'completed',
    emailsDeleted: count,
    // ...
  });
  
  // Record metrics
  await convex.mutation(api.emmie.recordDailyMetrics, { ... });
}
```

## Setup & Deployment

### 1. Database Migration
The schema changes are already in `convex/schema.ts`. Deploy with:
```bash
cd mission-control
npx convex dev  # or npx convex deploy
```

### 2. Initialize Data
On first load, the UI will prompt to initialize sample data. Alternatively, run:
```javascript
await convex.mutation(api.emmie.seedEmmieData);
```

### 3. Configure Rules
1. Navigate to Email Cleanup > Rules & Instructions
2. Create rules using templates or custom queries
3. Set priority and thresholds
4. Test rules in Test Rules section
5. Enable rules when ready

### 4. Set Up Whitelist
1. Navigate to Email Cleanup > Whitelist
2. Add important senders
3. Use patterns for entire domains

### 5. Connect Cron Job
Update the Emmie cron job script to:
- Load rules from Convex
- Execute cleanup operations
- Log results to Convex
- Flag uncertain emails

## Future Enhancements

### Phase 2 (Suggested)
- [ ] Visual rule builder (no-code)
- [ ] Email preview with full content
- [ ] A/B testing for rules
- [ ] Machine learning suggestions
- [ ] Integration with other email providers
- [ ] Export/import rule sets
- [ ] Advanced analytics dashboard
- [ ] Email threading analysis
- [ ] Sender reputation scoring
- [ ] Auto-whitelist suggestions

### Phase 3 (Advanced)
- [ ] Real-time cleanup execution from UI
- [ ] Schedule rules for specific times
- [ ] Conditional rules (if-then logic)
- [ ] Rule templates marketplace
- [ ] Multi-account support
- [ ] Slack/Telegram notifications
- [ ] API for external integrations
- [ ] Advanced regex pattern matching

## Technical Details

### Stack
- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Convex (serverless)
- **Icons**: Lucide React
- **State Management**: Convex React hooks

### File Structure
```
mission-control/
├── convex/
│   ├── schema.ts                 # Database schema (updated)
│   └── emmie.ts                  # API endpoints (new)
├── app/app/
│   ├── layout.tsx                # Navigation (updated)
│   └── email-cleanup/
│       ├── page.tsx              # Main page
│       └── sections/
│           ├── RulesSection.tsx
│           ├── WhitelistSection.tsx
│           ├── UncertainEmailsSection.tsx
│           ├── MetricsSection.tsx
│           ├── LogsSection.tsx
│           └── TestRulesSection.tsx
```

### Performance Considerations
- Convex queries are automatically cached
- Pagination implemented for logs (limit param)
- Metrics pre-aggregated by day
- Bulk operations to reduce API calls
- Optimistic UI updates where applicable

## Maintenance

### Regular Tasks
- Monitor execution logs for errors
- Review uncertain emails weekly
- Update whitelist as needed
- Archive old logs (>90 days)
- Review rule effectiveness monthly

### Monitoring
Key metrics to watch:
- Success rate (should be >95%)
- False positive rate
- Processing time
- Uncertain email volume
- Whitelist growth

### Troubleshooting
- **High false positives**: Adjust rule thresholds or add to whitelist
- **Slow execution**: Reduce maxPerRun or optimize queries
- **Too many uncertain**: Review rule specificity
- **Low success rate**: Check for conflicts between rules

## Security

- All Gmail operations require OAuth 2.0
- Whitelist prevents accidental deletion of important emails
- Test mode prevents accidental data loss
- Audit trail in execution logs
- Confirmation prompts for bulk actions

## Support

For issues or questions:
1. Check execution logs for error details
2. Review uncertain emails for patterns
3. Test rules in isolation
4. Verify Gmail API permissions
5. Contact system administrator

---

**Module Version**: 1.0.0  
**Last Updated**: 2026-02-21  
**Author**: OpenClaw AI  
**Status**: Production Ready
