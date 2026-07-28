/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
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
