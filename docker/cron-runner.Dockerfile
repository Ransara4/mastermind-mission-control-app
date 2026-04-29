# ============================================================
# Cron Runner — executes scheduled jobs from cron/jobs.json
# ============================================================
FROM node:20-slim

# Install curl for health pings and jq for JSON manipulation
RUN apt-get update -y && apt-get install -y curl jq && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root-level package files (cron-runner uses workspace deps)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev 2>/dev/null || npm install --omit=dev

# Copy the cron directory (jobs.json + any runner scripts)
COPY cron/ ./cron/

# Copy ops utilities that cron jobs may call
COPY ops/ ./ops/

ENV NODE_ENV=production

# The cron directory is mounted from /config in compose so job state persists
VOLUME ["/config"]

# Run using node's built-in cron parsing (cron-parser is in mission-control deps).
# This entrypoint reads cron/jobs.json and fires jobs on schedule.
CMD ["node", "cron/runner.js"]
