/** PM2 — development mode (next dev, single instance, hot reload) */
module.exports = {
  apps: [
    {
      name: 'bahram-frontend',
      cwd: '/var/www/bahram-cm/frontend',
      script: 'npm',
      args: 'run dev',
      interpreter: 'none',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '2G',
      watch: false,
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/bahram-frontend-dev-error.log',
      out_file: '/var/log/pm2/bahram-frontend-dev-out.log',
      merge_logs: true,
      time: true,
    },
    {
      name: 'family-manager-web',
      cwd: '/var/www/foroushino/bahram-family-manager',
      script: 'npx',
      args: '--yes serve -s build/web -l 7358',
      interpreter: 'none',
      autorestart: true,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      error_file: '/var/log/pm2/family-manager-web-error.log',
      out_file: '/var/log/pm2/family-manager-web-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
