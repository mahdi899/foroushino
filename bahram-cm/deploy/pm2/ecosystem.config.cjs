/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'bahram-frontend',
      cwd: '/var/www/bahram-cm/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/bahram-frontend-error.log',
      out_file: '/var/log/pm2/bahram-frontend-out.log',
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
        NODE_ENV: 'production',
      },
      error_file: '/var/log/pm2/family-manager-web-error.log',
      out_file: '/var/log/pm2/family-manager-web-out.log',
      merge_logs: true,
      time: true,
    },
  ],
};
