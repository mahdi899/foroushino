/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'bahram-frontend',
      cwd: '/var/www/bahram-cm/frontend',
      script: '/var/www/bahram-cm/deploy/pm2/next-prod.cjs',
      interpreter: 'node',
      // Keep a single Next process: ISR/full-route cache is in-process.
      // Revisit cluster only with shared cache / sticky sessions.
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      min_uptime: '30s',
      max_restarts: 30,
      restart_delay: 4000,
      exp_backoff_restart_delay: 200,
      kill_timeout: 8000,
      max_memory_restart: '1536M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=1280',
        // SSR adminFetch must hit loopback Laravel (nginx :8010), not the public domain.
        API_INTERNAL_URL: 'http://127.0.0.1:8010/api/v1',
        BACKEND_PROXY_URL: 'http://127.0.0.1:8010',
      },
      error_file: '/var/log/pm2/bahram-frontend-error.log',
      out_file: '/var/log/pm2/bahram-frontend-out.log',
      merge_logs: true,
      time: true,
    },
    // family-manager-web is optional and RAM-heavy — start manually when needed:
    // pm2 start deploy/pm2/ecosystem.family-manager.cjs
  ],
};
