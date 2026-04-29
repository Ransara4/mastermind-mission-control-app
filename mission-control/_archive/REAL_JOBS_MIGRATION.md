# Mission Control - Real Jobs Migration

**Date:** 2026-02-22  
**Status:** ✅ Complete

## Overview
Migrated Mission Control's calendar from mock data to real OpenClaw cron job data.

## Changes Made

### 1. Created `/hooks/useRealJobs.ts`
- Fetches real cron jobs from OpenClaw via API
- Parses job details: name, schedule, next run, last run, status
- Maps agent names to emojis:
  - 🧸 Teddy
  - 📧 Emmie  
  - 💾 System
- Auto-refreshes every 30 seconds

### 2. Created `/app/api/cron/list/route.ts`
- Next.js API route that executes `openclaw cron list`
- Returns raw cron output as plain text
- Handles errors gracefully with 500 status

### 3. Updated `/app/app/calendar/page.tsx`
- Changed from `useMockJobs()` to `useRealJobs()`
- Added support for new status types: `idle`, `ok`
- Updated status icons and badge colors
- Fixed job filtering to include idle jobs in scheduled count

## Verified Jobs Showing Up

✅ **Teddy's Telegram Cleanup**
- Schedule: `cron 30 2 * * *` (2:30 AM GMT+8)
- Status: idle (not run yet)
- Agent: 🧸 Teddy

✅ **Emmie's 4AM Inbox Review** (2 instances)
- Schedule: `cron 0 4 * * *` (4:00 AM GMT+8)
- Status: ok (completed)
- Last run: 17h ago
- Agent: 📧 Emmie

✅ **OpenClaw Backup - Midnight**
- Schedule: `cron 0 0 * * *` (12:00 AM GMT+8)
- Status: ok
- Last run: 21h ago
- Agent: 💾 System

✅ **OpenClaw Backup - Noon**
- Schedule: `cron 0 12 * * *` (12:00 PM GMT+8)
- Status: ok
- Last run: 9h ago
- Agent: 💾 System

✅ **Model Fallback Monitor**
- Schedule: `every 5m`
- Status: ok
- Last run: 3m ago
- Agent: 💾 System

✅ **Google Contacts Sync**
- Schedule: `cron 0 9 * * 2` (9:00 AM Tuesday GMT+8)
- Status: ok
- Last run: 6d ago
- Agent: 💾 System

## Testing

### API Endpoint
```bash
curl http://localhost:3000/api/cron/list
```
Returns: Raw cron list output (1145 bytes, 7 jobs)

### Parsing Logic
All 7 jobs parse correctly with:
- Correct agent emoji mapping
- Accurate next run times
- Proper status handling
- Timezone extraction

### Calendar Display
- Jobs display in list and calendar views
- Real-time countdown updates every second
- Next scheduled job banner shows correct info
- Stats show accurate counts

## Files Modified
- ✅ `/hooks/useRealJobs.ts` (new)
- ✅ `/app/api/cron/list/route.ts` (new)
- ✅ `/app/app/calendar/page.tsx` (updated)

## Files NOT Modified
- ❌ `/hooks/useMockJobs.ts` (kept for reference)

## Migration Complete
The calendar now displays REAL scheduling data from OpenClaw's cron system instead of mocks. All agent jobs show up with accurate schedules, next run times, and execution history.
