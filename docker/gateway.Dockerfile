# ============================================================
# Gateway — Telegram router (long-poll, no HTTP port)
# ============================================================
FROM node:20-slim

WORKDIR /app

# Copy ops package files and install dependencies
COPY ops/package.json ops/package-lock.json* ./

# Install deps (fall back gracefully if no lock file exists)
RUN npm install --omit=dev 2>/dev/null || npm install --omit=dev

# Copy the gateway script and supporting ops files
COPY ops/telegram-router.js ./
COPY ops/agent-registry.json ./

ENV NODE_ENV=production

EXPOSE 47293

CMD ["node", "telegram-router.js"]
