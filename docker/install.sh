#!/bin/bash
set -e

echo "Installing All Sorted..."

mkdir -p ~/allsorted && cd ~/allsorted

curl -sL https://raw.githubusercontent.com/allsorted/golden-claw/main/docker/docker-compose.yml -o docker-compose.yml
curl -sL https://raw.githubusercontent.com/allsorted/golden-claw/main/docker/.env.example -o .env.example
cp .env.example .env

echo ""
echo "Done. Next steps:"
echo "  1. Edit .env with your details:   nano .env"
echo "  2. Launch:                         docker compose up -d"
echo "  3. Open:                           http://localhost:3000"
