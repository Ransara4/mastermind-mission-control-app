# All Sorted — Docker Quick-Start

## Prerequisites

- Docker + Docker Compose (v2) installed
- 2 GB RAM minimum, 4 GB recommended
- An Anthropic API key (for AI features)

## Install

```bash
curl -sL https://raw.githubusercontent.com/allsorted/golden-claw/main/docker/install.sh | bash
```

This downloads `docker-compose.yml` and `.env.example` into `~/allsorted/`.

## Configure

```bash
cd ~/allsorted
nano .env
```

Fill in at minimum:

- `USER_FIRST_NAME`, `USER_FULL_NAME`, `USER_EMAIL`
- `ANTHROPIC_API_KEY`

All other vars (Telegram, Stripe, Google) are optional and enable specific integrations.

## Launch

```bash
docker compose up -d
```

Open http://localhost:3000.

## Services

| Service | What it does |
|---------|-------------|
| `mission-control` | Main dashboard (Next.js, port 3000) |
| `gateway` | Telegram router — routes commands to agent handlers |
| `cron-runner` | Runs scheduled jobs defined in `cron/jobs.json` |
| `playwright-mcp` | Headless browser for web automation (port 8931) |

## Update

```bash
cd ~/allsorted
docker compose pull
docker compose up -d
```

Data in named volumes (`allsorted-data`, `allsorted-config`, `allsorted-backups`) is preserved across updates.

## Stop

```bash
docker compose down
```

To also remove data volumes (destructive):

```bash
docker compose down -v
```
