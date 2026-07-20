'use strict';

const { spawn } = require('child_process');
const path = require('path');

/** Ignore client disconnect noise — prevents PM2 crash loops on RSC/aborted requests. */
process.on('uncaughtException', (err) => {
  const msg = String(err?.message || err);
  const code = err?.code;
  if (
    msg === 'aborted' ||
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ERR_STREAM_PREMATURE_CLOSE'
  ) {
    return;
  }
  console.error('[next-prod] uncaughtException:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const msg = String(reason?.message || reason || '');
  if (msg === 'aborted') return;
  console.error('[next-prod] unhandledRejection:', reason);
});

const frontendDir = path.resolve(__dirname, '../../frontend');
const nextBin = path.join(frontendDir, 'node_modules/.bin/next');

const child = spawn(nextBin, ['start', '-p', '3000'], {
  cwd: frontendDir,
  stdio: 'inherit',
  env: process.env,
});

child.on('exit', (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});

child.on('error', (err) => {
  console.error('[next-prod] failed to start Next.js:', err);
  process.exit(1);
});
