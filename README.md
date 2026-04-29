# Get Sorted — Golden Claw (Testing Build)

Get Sorted is a self-hosted personal AI OS. It runs as a Next.js dashboard, wires together agents, tools, and automations, and serves as a command center for managing business, research, and productivity workflows.

---

## What This Is

This is **Golden Claw** — Joe's sanitized testing build of Get Sorted. Personal names and client data have been replaced with generic equivalents, but real API keys are present so features can be tested end-to-end.

This is NOT the public release. For the public release, see **All Sorted** (`~/allsorted-web/`).

---

## Three-Tier Architecture

| Build | API Keys | Personal Data | Purpose |
|-------|----------|---------------|---------|
| OpenClaw (`~/.openclaw/workspace/`) | Real | Real | Joe's live system |
| Golden Claw (`~/golden-claw/`) | Real | Sanitized | Testing build (this repo) |
| All Sorted (`~/allsorted-web/`) | Template | Sanitized | Public GitHub release |

---

## Setup

All active development happens in the `mission-control/` directory, which is a Next.js app.

```bash
cd ~/golden-claw/mission-control
cp .env.local.example .env.local   # add your API keys
npm install
npm run dev
# Opens http://localhost:3000
```

For the full sync and sanitization workflow, see `SANITIZATION_RULES.md`.

---

## Key Files

| File | Purpose |
|------|---------|
| `SANITIZATION_RULES.md` | Rules governing what changes between OpenClaw and this build |
| `mission-control/` | Main Next.js app |
| `agents/` | Background agents (research, security, automation) |
| `skills/` | Installed Claude Code skills |

---

*Last updated: 2026-03-31*
