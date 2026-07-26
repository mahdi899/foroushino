#!/bin/bash
HOSTIP=$(getent hosts bahram.rahai.online | awk '{print $1}' | head -1)
echo "host ip: $HOSTIP"
if command -v csf >/dev/null 2>&1; then
  echo "--- csf deny check ---"
  csf -g "$HOSTIP" 2>&1 | tail -20
fi
echo "--- recent nginx access for host ip ---"
grep "$HOSTIP" /var/log/nginx/*access*.log 2>/dev/null | tail -20
echo "--- recent nginx error mentioning host ip ---"
grep "$HOSTIP" /var/log/nginx/*error*.log 2>/dev/null | tail -20
echo "--- iptables rules mentioning host ip ---"
iptables -L -n | grep "$HOSTIP"
echo "--- curl from iran to host ip https ---"
curl -sv --max-time 6 -o /dev/null -w "HTTP:%{http_code} time:%{time_total}\n" "https://bahram.rahai.online/rostam/telegram/public/host-sync.php" 2>&1 | tail -20
