#!/usr/bin/env bash
# Bahram CM / shared VPS hardening — firewall, fail2ban, auto security updates, cleanup.
# Usage: sudo bash harden-server.sh
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> [1/6] System update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get dist-upgrade -y -qq

echo "==> [2/6] Firewall (ufw) — allow only SSH, HTTP, HTTPS"
apt-get install -y -qq ufw
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> [3/6] fail2ban — brute-force protection for SSH"
apt-get install -y -qq fail2ban
cat > /etc/fail2ban/jail.d/sshd.local <<'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 5
findtime = 600
bantime = 3600
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

echo "==> [4/6] Automatic security updates"
apt-get install -y -qq unattended-upgrades apt-listchanges
dpkg-reconfigure -f noninteractive unattended-upgrades || true
systemctl enable --now unattended-upgrades

echo "==> [5/6] SSH hardening (keep password auth — key-only disabled unless you confirm keys work)"
SSHD_CONFIG=/etc/ssh/sshd_config
grep -q '^PermitRootLogin' "$SSHD_CONFIG" && sed -i 's/^PermitRootLogin.*/PermitRootLogin prohibit-password/' "$SSHD_CONFIG" || echo "PermitRootLogin prohibit-password" >> "$SSHD_CONFIG"
grep -q '^MaxAuthTries' "$SSHD_CONFIG" && sed -i 's/^MaxAuthTries.*/MaxAuthTries 4/' "$SSHD_CONFIG" || echo "MaxAuthTries 4" >> "$SSHD_CONFIG"
grep -q '^ClientAliveInterval' "$SSHD_CONFIG" && sed -i 's/^ClientAliveInterval.*/ClientAliveInterval 300/' "$SSHD_CONFIG" || echo "ClientAliveInterval 300" >> "$SSHD_CONFIG"
echo "NOTE: PermitRootLogin set to 'prohibit-password' requires an SSH key for root."
echo "      Add your public key to /root/.ssh/authorized_keys BEFORE reconnecting, or this will lock you out."
echo "      Skipping restart of sshd — apply manually once a key is confirmed: systemctl restart sshd"

echo "==> [6/6] Cleanup — remove unused packages, old kernels, caches, logs"
apt-get autoremove --purge -y -qq
apt-get autoclean -y -qq
apt-get clean -qq
journalctl --vacuum-time=7d >/dev/null 2>&1 || true
rm -rf /tmp/* /var/tmp/* 2>/dev/null || true
find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
find /var/log -type f -name "*.1" -delete 2>/dev/null || true

echo ""
echo "============================================"
echo "Hardening complete."
echo "  ufw status: $(ufw status | head -1)"
echo "  fail2ban:   $(systemctl is-active fail2ban)"
echo "  disk free:  $(df -h / | tail -1 | awk '{print $4}')"
echo "============================================"
