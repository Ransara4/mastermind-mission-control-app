# Quick Start: Auto-Generated Backup Descriptions

## 30-Second Overview

Mission Control now **automatically suggests backup descriptions** based on what just happened on your system.

- When you open Backups, it shows: "After Guard Dog security scan" or "Post-Scrooge optimization sync"
- You can **accept it, edit it, or pick alternatives**
- Everything still works if the auto-description is empty

## Using the Feature

### Basic Usage (3 clicks)

1. **Open Mission Control → Backups**
   - Auto-description loads automatically
   
2. **Review the description in the "Create New Backup" form**
   - It shows what the system thinks just happened
   - Badge says "✨ Auto-generated"

3. **Click "Create Backup"**
   - Saves with the auto-generated description

### Customization Options

**Accept the suggestion** (default):
```
Just click "Create Backup" ✓
```

**Edit manually**:
```
Click in the description field
Change the text
Click "Create Backup" ✓
```

**Go back to auto-generated**:
```
Click the "Reset" button
The original auto-generated description returns ✓
```

**Try alternatives**:
```
Click "More suggestions" dropdown
Select one of the alternatives
Click "Create Backup" ✓
```

## What Descriptions Look Like

### Smart Examples
- "After Guard Dog security scan"
- "Post-Scrooge optimization sync"
- "After Emmie inbox cleanup"
- "Post-scheduled backup sync"
- "After Telegram cleanup"

### Fallback Options
- "System checkpoint"
- "Data preservation point"
- "Safe restore point"

## How It Works (The Magic)

The system looks at what happened in the last **1 hour**:

1. **Did an agent run?**
   - Guard Dog security scan? → "After Guard Dog security scan"
   - Scrooge optimization? → "Post-Scrooge optimization sync"
   - Others? → Maps to their specific activities

2. **Did a scheduled job run?**
   - Cron job executed? → Maps to job-specific description

3. **Did files change?**
   - Recent modifications? → Mentions "files modified"

4. **Nothing specific happened?**
   - Falls back to generic: "System checkpoint"

## For Developers: Adding New Activity Recognition

### Add a New Agent (2 steps)

**Step 1**: Edit `convex/description-generator.ts`

```typescript
// Around line 15, in AGENT_DESCRIPTIONS add:
'my-new-agent': {
  after: 'After My Agent completed task',
  before: 'Before My Agent started',
},
```

**Step 2**: Your agent should create activity traces:
- Log files in `/workspace/agents/my-new-agent/`
- Session files (any file with "session" in the name)
- These need to be modified within the last hour

Done! The system will now recognize your agent.

### Add a New Cron Job (2 steps)

**Step 1**: Add to `CRON_GOVERNANCE.md`

```
| My New Job | 0 3 * * * | 03:00 | Maintenance |
```

**Step 2**: Edit `convex/description-generator.ts`

```typescript
// Around line 25, in CRON_JOB_DESCRIPTIONS add:
'My New Job': {
  after: 'Post-my cron job execution',
  before: 'Pre-my cron job execution',
},
```

Done! The system will now recognize your cron job.

## Troubleshooting

### "I don't see an auto-description"

**Check 1**: Refresh the page
- Sometimes the API needs a moment to respond
- Press Ctrl+Shift+R (hard refresh)

**Check 2**: Open browser console (F12)
- Look for errors in the Console tab
- Red errors = something's wrong

**Check 3**: Manually create a backup
- Type a description yourself
- Click "Create Backup"
- The feature is optional - backups work without it!

### "The description is wrong"

**This is normal!** The system is doing its best based on:
- What files were modified recently
- What agents/crons ran recently
- The 1-hour lookback window

**You can always**:
- Click "Reset" to see the auto suggestion again
- Type a custom description
- Pick from "More suggestions"

### "I want to disable auto-descriptions"

The feature is **safe by default**:
- Just ignore the auto-generated description
- Type your own in the field
- It works exactly as before!

## API Endpoint (For Integrations)

```bash
# Get primary auto-generated description
curl "http://localhost:3000/api/backups/generate-description?type=primary&hoursBack=1"

# Get alternatives
curl "http://localhost:3000/api/backups/generate-description?type=alternatives&count=3"
```

Response:
```json
{
  "success": true,
  "description": "After Guard Dog security scan",
  "confidence": 0.9,
  "sources": ["Agent: guard-dog"]
}
```

## File Locations

Everything is in the `mission-control/` directory:

- **Logic**: 
  - `convex/activity-logger.ts` - Detects activities
  - `convex/description-generator.ts` - Generates descriptions

- **API**: 
  - `app/api/backups/generate-description/route.ts` - Handles requests

- **UI**: 
  - `app/app/backups/page.tsx` - Shows the form

## Common Questions

**Q: Will this break existing backups?**
A: No! Backups work exactly the same. The description field is optional.

**Q: What if the auto-description is bad?**
A: Just type your own or pick from alternatives. It's a suggestion, not a requirement.

**Q: Does this use AI/ML?**
A: No! It's simple rule-based detection. Fast and deterministic.

**Q: Can I customize the descriptions?**
A: Yes! Edit `description-generator.ts` to add your own agents/jobs.

**Q: What if there's no activity in the last hour?**
A: Falls back to generic defaults like "System checkpoint".

**Q: Does this slow down backups?**
A: No! The description is generated before backup creation. Zero impact on backup performance.

**Q: Can I see what activities were detected?**
A: Yes! Check the `sources` array in the API response:
```json
"sources": ["Agent: guard-dog", "1 files modified"]
```

## Next Steps

1. **Test it**: Open Backups and see the auto-description
2. **Use it**: Create a backup with the auto-generated description
3. **Provide feedback**: Let us know what descriptions work well
4. **Extend it**: Add your own agents/crons to the recognition list

## More Information

- **Full Guide**: Read `BACKUP_AUTO_DESCRIPTION_GUIDE.md`
- **Technical Details**: See `BACKUP_AUTO_DESCRIPTION_IMPLEMENTATION.md`
- **Source Code**: Check `convex/activity-logger.ts` and `convex/description-generator.ts`

---

**Happy backing up!** 🎉

The system is smart enough to understand what you're doing, and flexible enough to let you override when you know better.
