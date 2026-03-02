#!/bin/bash

# Stop backend
BACKEND_PIDS=$(pgrep -f "tsx watch server.ts")
if [ -n "$BACKEND_PIDS" ]; then
    kill $BACKEND_PIDS 2>/dev/null
fi

# Stop frontend
FRONTEND_PIDS=$(pgrep -f "vite")
if [ -n "$FRONTEND_PIDS" ]; then
    kill $FRONTEND_PIDS 2>/dev/null
fi

echo "Stopped."
