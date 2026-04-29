# Mission Control - Quick Start Guide

Get Mission Control up and running in 60 seconds! 🚀

## Option 1: Automated Startup (Recommended)

```bash
cd /Users/openclaw/.openclaw/workspace/mission-control
./start.sh
```

This single command:
- ✅ Installs dependencies if needed
- ✅ Starts Convex backend (port 3210)
- ✅ Starts Next.js frontend (port 3000)
- ✅ Saves logs to `convex.log` and `nextjs.log`

Press **Ctrl+C** to stop all services.

---

## Option 2: Manual Startup

### Terminal 1: Convex Backend
```bash
cd /Users/openclaw/.openclaw/workspace/mission-control
npx convex dev
```

### Terminal 2: Next.js Frontend
```bash
cd /Users/openclaw/.openclaw/workspace/mission-control
npm run dev
```

---

## Access the Application

Open your browser to: **http://localhost:3000**

---

## Available Routes

| Route | Module | Description |
|-------|--------|-------------|
| `/app/tasks` | Tasks | Kanban board for task management |
| `/app/projects` | Projects | File explorer and markdown editor |
| `/app/office` | Office | Agent status and activity |
| `/app/team` | Team | Team roster and roles |
| `/app/memory` | Memory | Knowledge base and search |
| `/app/calendar` | Calendar | Scheduled jobs and cron |

---

## First Visit Features

**All modules auto-seed on first visit!**

- **Office Space**: 5 agents (Uni, Sonnet, Haiku, Llama, Codex)
- **Team Space**: 5 team members with roles
- **Memory**: 8 sample memories with tags
- **Calendar**: 7 example scheduled jobs

No manual setup required! 🎉

---

## Troubleshooting

### "Loading..." never finishes
- Make sure **both** Convex and Next.js are running
- Check that Convex is on port 3210: `lsof -i :3210`
- Check that Next.js is on port 3000: `lsof -i :3000`

### Port already in use
```bash
# Kill existing processes
pkill -f "convex dev"
pkill -f "next dev"
```

### Clear all data and restart
```bash
# Stop services
pkill -f "convex dev"
pkill -f "next dev"

# Clear Next.js cache
rm -rf .next

# Restart
./start.sh
```

---

## Development Tips

### View Logs
```bash
# Convex logs
tail -f convex.log

# Next.js logs
tail -f nextjs.log
```

### Stop Services
```bash
# If using start.sh: Press Ctrl+C

# Manual stop:
pkill -f "convex dev"
pkill -f "next dev"
```

### Rebuild
```bash
npm run build
```

---

## Next Steps

1. ✅ Visit http://localhost:3000
2. ✅ Explore all 6 modules via sidebar
3. ✅ Try creating/editing tasks
4. ✅ Browse files in Projects
5. ✅ Check agent status in Office
6. ✅ Search memories

---

## Documentation

- **Full Docs**: `README.md`
- **Implementation**: `MISSION_CONTROL_MVP_COMPLETE.md`
- **Schema**: `convex/schema.ts`

---

**Happy exploring!** 🦞✨
