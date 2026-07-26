#!/bin/bash
echo "--- pm2 list ---"
pm2 list 2>&1
echo "--- pm2 describe (first app) ---"
APP=$(pm2 jlist 2>/dev/null | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "app: $APP"
pm2 describe "$APP" 2>&1 | grep -E "restarts|uptime|status|memory"
echo "--- recent pm2 logs (errors) ---"
pm2 logs "$APP" --lines 60 --nostream 2>&1 | tail -80
echo "--- memory / oom check ---"
dmesg 2>/dev/null | grep -i "out of memory" | tail -10
free -h
