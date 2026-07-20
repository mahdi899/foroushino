#!/usr/bin/env node
/**
 * Local dual-domain dev — mirrors production:
 *   local.rostami.app:3000  ≈  rostami.app
 *   local.rostami.club:3001 ≈  rostami.club
 *
 * One Next.js process (:3010) + two Host-based proxies (like nginx on server).
 * Requires hosts entries — run: npm run setup:hosts
 */
import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');

const APP_PORT = Number(process.env.APP_DEV_PORT || 3000);
const CLUB_PORT = Number(process.env.CLUB_DEV_PORT || 3001);
const NEXT_PORT = Number(process.env.NEXT_INTERNAL_PORT || 3010);
const APP_HOST = process.env.APP_DEV_HOST || 'app.lvh.me';
const CLUB_HOST = process.env.CLUB_DEV_HOST || 'club.lvh.me';
const NEXT_HOST = '127.0.0.1';

function createHostProxy(publicPort, virtualHost, label) {
  return http.createServer((req, res) => {
    const headers = {
      ...req.headers,
      host: `${virtualHost}:${publicPort}`,
      'x-forwarded-host': `${virtualHost}:${publicPort}`,
      'x-forwarded-proto': 'http',
    };
    const upstream = http.request(
      { hostname: NEXT_HOST, port: NEXT_PORT, path: req.url, method: req.method, headers },
      (pres) => {
        res.writeHead(pres.statusCode ?? 502, pres.headers);
        pres.pipe(res);
      },
    );
    upstream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`Next.js روی :${NEXT_PORT} آماده نیست. چند ثانیه صبر کنید…`);
      }
    });
    req.pipe(upstream);
  }).listen(publicPort, '0.0.0.0', () => {
    console.log(`  ${label}: http://${virtualHost}:${publicPort}`);
  });
}

const isWin = process.platform === 'win32';
const nextBin = path.join(frontendRoot, 'node_modules', 'next', 'dist', 'bin', 'next');

const nextProc = spawn(process.execPath, [nextBin, 'dev', '--turbopack', '-p', String(NEXT_PORT), '-H', '127.0.0.1'], {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: { ...process.env },
  shell: false,
});

createHostProxy(APP_PORT, APP_HOST, 'سایت');
createHostProxy(CLUB_PORT, CLUB_HOST, 'خانواده');

console.log('');
console.log('  لوکال dual-domain — مثل سرور');
console.log(`  سایت:    http://${APP_HOST}:${APP_PORT}`);
console.log(`  خانواده: http://${CLUB_HOST}:${CLUB_PORT}`);
console.log(`  Next.js داخلی: :${NEXT_PORT}`);
console.log('');

function shutdown() {
  if (!nextProc.killed) nextProc.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

nextProc.on('exit', (code) => process.exit(code ?? 0));
