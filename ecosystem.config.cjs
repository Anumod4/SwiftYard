module.exports = {
  apps: [
    {
      name: 'swiftyard-server',
      script: 'npx tsx server/index.ts',
      watch: false,
      autorestart: true,
      restart_delay: 1000,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 4000
      },
      error_file: './.pm2-logs/server-error.log',
      out_file: './.pm2-logs/server-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss'
    },
    {
      name: 'swiftyard-client',
      script: 'npx vite --host 0.0.0.0',
      cwd: '.',
      autorestart: true,
      restart_delay: 1000,
      max_memory_restart: '1G',
      watch: false
    }
  ]
};
