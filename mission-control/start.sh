#!/bin/bash
# Mission Control Startup Script
# Starts both Convex backend and Next.js frontend

echo "🦞 Starting Mission Control..."
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from mission-control directory"
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🚀 Starting services..."
echo ""
echo "Terminal 1: Convex Backend (port 3210)"
echo "Terminal 2: Next.js Frontend (port 3000)"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Start Convex in background
echo "Starting Convex..."
npx convex dev > convex.log 2>&1 &
CONVEX_PID=$!

# Wait a bit for Convex to start
sleep 3

# Start Next.js in background
echo "Starting Next.js..."
npm run dev > nextjs.log 2>&1 &
NEXTJS_PID=$!

echo ""
echo "✅ Services started!"
echo ""
echo "📊 Convex Backend: http://localhost:3210 (PID: $CONVEX_PID)"
echo "🌐 Next.js Frontend: http://localhost:3000 (PID: $NEXTJS_PID)"
echo ""
echo "📝 Logs:"
echo "  Convex: tail -f convex.log"
echo "  Next.js: tail -f nextjs.log"
echo ""
echo "🛑 To stop:"
echo "  kill $CONVEX_PID $NEXTJS_PID"
echo ""
echo "Press Ctrl+C to stop all services..."

# Trap Ctrl+C and cleanup
trap "echo ''; echo '🛑 Stopping services...'; kill $CONVEX_PID $NEXTJS_PID 2>/dev/null; exit 0" INT

# Wait indefinitely
wait
