# ============================================================
# Stage 1: deps — install all Node dependencies
# ============================================================
FROM node:20-slim AS deps

WORKDIR /app

COPY mission-control/package.json mission-control/package-lock.json ./

RUN npm ci

# ============================================================
# Stage 2: builder — compile the Next.js app
# ============================================================
FROM node:20-slim AS builder

# Install build tools needed by better-sqlite3 (native module)
RUN apt-get update -y && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY mission-control/ ./

# Rebuild better-sqlite3 native bindings for the target architecture
RUN npm rebuild better-sqlite3

ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN npm run build

# ============================================================
# Stage 3: runner — minimal production image
# ============================================================
FROM node:20-slim AS runner

# Install system dependencies:
#   curl      - used by healthcheck
#   ffmpeg    - required by openai-whisper for audio decoding
#   python3, pip - required to install openai-whisper
RUN apt-get update -y && \
    apt-get install -y curl ffmpeg python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Install openai-whisper and pre-download the base model so first use is instant.
# The model is cached at /root/.cache/whisper/ inside the image.
RUN pip3 install openai-whisper --break-system-packages && \
    python3 -c "import whisper; whisper.load_model('base')"

# Install claude CLI globally
RUN npm install -g @anthropic-ai/claude-code

WORKDIR /app

ENV NODE_ENV=production

# Copy the standalone Next.js output
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public assets
COPY --from=builder /app/public ./public

# Persistent data and config directories
VOLUME ["/data", "/config"]

EXPOSE 3000

CMD ["node", "server.js"]
