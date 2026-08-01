/** @type {import('pm2').StartOptions} */
const NEXT_PORTS = [3000, 3001, 3002];

const sharedEnv = {
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=1024',
  // SSR adminFetch must hit loopback Laravel (nginx :8010), not the public domain.
  API_INTERNAL_URL: 'http://127.0.0.1:8010/api/v1',
  BACKEND_PROXY_URL: 'http://127.0.0.1:8010',
};

module.exports = {
  apps: NEXT_PORTS.map((port) => ({
    name: `bahram-frontend-${port}`,
    cwd: '/var/www/bahram-cm/frontend',
    script: '/var/www/bahram-cm/deploy/pm2/next-prod.cjs',
    interpreter: 'node',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    min_uptime: '30s',
    max_restarts: 30,
    restart_delay: 4000,
    exp_backoff_restart_delay: 200,
    kill_timeout: 8000,
    max_memory_restart: '1200M',
    env: {
      ...sharedEnv,
      PORT: String(port),
    },
    error_file: `/var/log/pm2/bahram-frontend-${port}-error.log`,
    out_file: `/var/log/pm2/bahram-frontend-${port}-out.log`,
    merge_logs: true,
    time: true,
  })),
  // family-manager-web is optional and RAM-heavy — start manually when needed:
  // pm2 start deploy/pm2/ecosystem.family-manager.cjs
};
