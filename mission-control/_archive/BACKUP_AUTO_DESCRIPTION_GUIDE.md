# Automatic Backup Description Generation Guide

## Overview

The Mission Control Backups page now automatically generates smart, contextual backup descriptions based on recent system activity. Users can:

1. **See auto-generated descriptions** when they load the backup form
2. **Edit or override** the auto-generated description
3. **Choose from alternatives** if they want a different option
4. **Use custom descriptions** if the auto-generated ones don't fit

## How It Works

### Architecture

The system consists of three main components:

#### 1. Activity Logger (`convex/activity-logger.ts`)
- **Purpose**: Tracks recent system activity from the last 1 hour
- **Sources**:
  - Cron jobs (from CRON_GOVERNANCE.md and log files)
  - Agent runs and sessions (from agent directories)
  - File changes (modified files in ops, bin, lib directories)
  - System events (from daily memory files)
- **Output**: Sorted list of activities with timestamps, types, and details

#### 2. Description Generator (`convex/description-generator.ts`)
- **Purpose**: Generates contextual descriptions based on activity
- **Features**:
  - Analyzes recent activities
  - Maps agents/cron jobs to meaningful descriptions
  - Provides confidence scores
  - Generates multiple alternatives
- **Output**: Smart descriptions like "After Guard Dog security scan", "Post-Scrooge optimization sync"

#### 3. Frontend Integration (`app/app/backups/page.tsx`)
- **Purpose**: Displays and manages backup descriptions
- **Features**:
  - Auto-loads generated description on page load
  - Shows "✨ Auto-generated" label
  - Provides reset button to go back to auto-generated version
  - Shows alternative suggestions in a dropdown
  - Allows manual editing anytime

### Supported Auto-Descriptions

The system recognizes these agents and cron jobs:

#### Agents
| Agent | Description |
|-------|-------------|
| guard-dog | "After Guard Dog security scan" |
| scrooge | "Post-Scrooge optimization sync" |
| emmie | "After Emmie inbox cleanup" |
| teddy | "After Teddy cleanup task" |

#### Cron Jobs
| Job | Description |
|-----|-------------|
| OpenClaw Backup | "Post-scheduled backup sync" |
| Teddy's Telegram Cleanup | "After Telegram cleanup" |
| Emmie's 4AM Inbox Review | "After inbox review" |
| Google Contacts Sync | "Post-contacts sync" |
| Model Fallback Monitor | "After model fallback check" |

### Activity Detection

The system detects activity by:

1. **Cron Jobs**: Checking log files in `/workspace/logs/` that were modified in the last hour
2. **Agent Activity**: Looking for recently modified session files or logs in `/workspace/agents/`
3. **File Changes**: Scanning `ops/`, `bin/`, `lib/` for recently modified files
4. **System Events**: Reading today's memory file and extracting documented tasks

## Usage

### For End Users

1. **Open the Backups page** - The auto-generated description appears immediately
2. **Review the suggestion** - It shows the suggested description based on recent activity
3. **Choose to:**
   - Accept it (default behavior)
   - Edit it manually
   - Click "Reset" to go back to auto-generated version
   - Click "More suggestions" to see alternatives
   - Type a completely custom description

### For Developers

#### Adding New Agent Recognition

Edit `convex/description-generator.ts`:

```typescript
const AGENT_DESCRIPTIONS: Record<string, { after: string; before: string }> = {
  'my-agent': {
    after: 'After My Agent did something',
    before: 'Before My Agent did something',
  },
  // ... other agents
};
```

#### Adding New Cron Jobs

Edit `convex/description-generator.ts`:

```typescript
const CRON_JOB_DESCRIPTIONS: Record<string, { after: string; before: string }> = {
  'My Cron Job': {
    after: 'Post-my cron job execution',
    before: 'Pre-my cron job execution',
  },
  // ... other jobs
};
```

Also make sure the cron job is documented in `CRON_GOVERNANCE.md` with an entry like:

```
| My Cron Job | 0 2 * * * | 02:00 | Maintenance |
```

## Convex Queries & Mutations

### Query: `generateBackupDescription`

Generates a single smart backup description based on recent activity.

**Args:**
- `hoursBack` (optional): Number of hours to look back (default: 1)

**Returns:**
```typescript
{
  success: boolean;
  description: string;
  confidence: number; // 0-1, how confident the system is
  sources: string[];   // Where the description came from
}
```

**Example:**
```typescript
const desc = await ctx.db.query(api.backups.generateBackupDescription, {
  hoursBack: 1,
});
```

### Query: `generateBackupDescriptionAlternatives`

Generates multiple alternative descriptions for the user to choose from.

**Args:**
- `count` (optional): Number of alternatives (default: 3)

**Returns:**
```typescript
{
  success: boolean;
  alternatives: string[];
}
```

**Example:**
```typescript
const alts = await ctx.db.query(api.backups.generateBackupDescriptionAlternatives, {
  count: 3,
});
```

## Technical Details

### Activity Logger Algorithm

```
For each hour lookback:
  1. Scan CRON_GOVERNANCE.md for job names
  2. Check logs/ for modified files
  3. Scan agents/ for session files modified recently
  4. Check ops/, bin/, lib/ for file changes
  5. Read today's memory file for documented events
  6. Sort all activities by timestamp (newest first)
```

### Description Generation Algorithm

```
1. Load recent activities (last hour)
2. If no activities found: return "System checkpoint"
3. Sort activities by recency
4. For each activity:
   - Check if it's a known agent (0.9 confidence)
   - Check if it's a known cron job (0.8 confidence)
   - Check if there are file changes (0.5 confidence)
5. Return the highest-confidence description
6. Include sources for transparency
```

## API Endpoint

The existing `/api/backups/create` endpoint already accepts the description parameter:

```typescript
POST /api/backups/create
{
  "description": "After Guard Dog security scan",
  "tags": ["security", "scan"],
  "backupType": "manual",
  "retentionPolicy": "30-days"
}
```

## Troubleshooting

### Auto-description not showing

1. Check that the queries are properly registered in Convex
2. Verify activity-logger.ts and description-generator.ts are in the convex/ directory
3. Ensure the activity detection sources exist:
   - `/workspace/logs/` (for cron logs)
   - `/workspace/agents/` (for agent activity)
   - `/workspace/memory/` (for events)

### Wrong descriptions being generated

1. Update the agent/cron job mappings in `description-generator.ts`
2. Ensure CRON_GOVERNANCE.md is up-to-date
3. Check that recent activity is being detected by looking at file modification times

### Confidence too low

The system uses confidence scores to determine how sure it is about a description. If confidence is low:
1. More activity types were considered
2. The description is a best-guess based on partial information
3. Users can see "More suggestions" to choose alternatives

## Future Enhancements

Potential improvements to the description system:

1. **Smart timestamps**: Include "within last 30 minutes" context
2. **Multi-agent descriptions**: "Post-Guard Dog + Scrooge sync"
3. **User history**: Learn from user choices over time
4. **Scheduled backups**: Different descriptions for scheduled vs manual
5. **Risk assessment**: "Before risky operation" descriptions
6. **Integration with external logs**: Pull from Telegram, Gmail, etc.

## Files Modified/Created

### New Files
- `/mission-control/convex/activity-logger.ts` - Activity tracking
- `/mission-control/convex/description-generator.ts` - Description generation
- `/mission-control/BACKUP_AUTO_DESCRIPTION_GUIDE.md` - This guide

### Modified Files
- `/mission-control/convex/backups.ts` - Added queries
- `/mission-control/app/app/backups/page.tsx` - UI integration

## Testing

To test the auto-description feature:

1. Trigger a cron job or agent run
2. Open the Backups page
3. Verify the auto-description appears
4. Check that "More suggestions" shows alternatives
5. Test editing and resetting the description
6. Create a backup with the auto-generated description
7. Verify it saves correctly

## Support

For issues or questions about the auto-description system, refer to:
- CRON_GOVERNANCE.md for cron job configuration
- SOUL.md for system architecture
- Activity logger and description generator source code comments
