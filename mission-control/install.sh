#!/bin/bash
set -e

echo "Installing Mission Control..."
echo ""

if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "Error: npm is required."
  exit 1
fi

if ! command -v python3 &> /dev/null; then
  echo "Error: Python 3 is required. It comes pre-installed on Mac."
  exit 1
fi

echo "Installing dependencies..."
npm install --no-audit --no-fund

# Set up hourly task executor cron job
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRON_CMD="0 * * * * cd \"$SCRIPT_DIR\" && python3 executor.py >> \"$SCRIPT_DIR/executor.log\" 2>&1"

echo ""
echo "Setting up hourly task executor..."
(crontab -l 2>/dev/null | grep -v "executor.py"; echo "$CRON_CMD") | crontab -
echo "Task executor scheduled — runs every hour on the hour."

# Wire up the Claude binary path in executor.py
echo ""
echo "Wiring up Claude Code path..."
CLAUDE_PATH=$(command -v claude 2>/dev/null || true)

if [ -z "$CLAUDE_PATH" ]; then
  # Common install locations on Mac and Windows Git Bash
  for CANDIDATE in \
    "$HOME/.local/bin/claude" \
    "/usr/local/bin/claude" \
    "$HOME/AppData/Roaming/npm/claude" \
    "$HOME/AppData/Local/Programs/claude/claude.exe"; do
    if [ -x "$CANDIDATE" ]; then
      CLAUDE_PATH="$CANDIDATE"
      break
    fi
  done
fi

if [ -n "$CLAUDE_PATH" ]; then
  # Replace bare "claude" string in the subprocess.run call with the full path
  sed -i.bak "s|\"claude\", \"--dangerously-skip-permissions\"|\"$CLAUDE_PATH\", \"--dangerously-skip-permissions\"|g" "$SCRIPT_DIR/executor.py"
  rm -f "$SCRIPT_DIR/executor.py.bak"
  echo "Claude found at: $CLAUDE_PATH"
else
  echo "Warning: claude not found in PATH. Open executor.py and set the path manually after install."
fi

echo ""
echo "Starting Mission Control..."
echo ""
echo "Open your browser to: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop."
echo ""

npm run dev
