#!/bin/bash

# Check if MongoDB is running, start it if not
if ! pgrep -x "mongod" > /dev/null; then
    sudo systemctl start mongod
    sleep 2
fi

if ! systemctl is-active --quiet mongod; then
    echo "Error: Failed to start MongoDB"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$SCRIPT_DIR/backend"
npm run dev > /tmp/clouddrive-backend.log 2>&1 &

cd "$SCRIPT_DIR/frontend"
npm run dev > /tmp/clouddrive-frontend.log 2>&1 &

sleep 3

echo "Cloud Drive running at http://localhost:5173"
echo "Stop with: ./stop.sh"

if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:5173 2>/dev/null &
fi
