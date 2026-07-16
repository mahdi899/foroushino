#!/usr/bin/env node
/**
 * پروکسی توسعه — یک پورت عمومی (7357):
 *   /api/*      → Laravel :8010
 *   /storage/*  → Laravel :8010 (فایل‌های رسانه)
 *   /*          → Flutter web-server :7358
 */
import http from 'node:http';

const PUBLIC_PORT = Number(process.env.FAMILY_WEB_PORT || 7357);
const FLUTTER_PORT = Number(process.env.FAMILY_WEB_INTERNAL_PORT || 7358);
const API_HOST = process.env.FAMILY_API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.FAMILY_API_PORT || 8010);

function pipeProxy(req, res, { host, port, path }) {
  const headers = { ...req.headers, host: `${host}:${port}` };
  const upstream = http.request(
    { hostname: host, port, path, method: req.method, headers },
    (pres) => {
      const outHeaders = { ...pres.headers };
      const urlPath = path.split('?')[0] ?? '/';
      if (
        urlPath === '/' ||
        urlPath.endsWith('.html') ||
        urlPath.endsWith('.js') ||
        urlPath.endsWith('.json') ||
        urlPath.startsWith('/main.dart')
      ) {
        outHeaders['cache-control'] = 'no-store, no-cache, must-revalidate';
        outHeaders['pragma'] = 'no-cache';
      }
      res.writeHead(pres.statusCode ?? 502, outHeaders);
      pres.pipe(res);
    },
  );
  upstream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('سرویس در دسترس نیست. ابتدا Laravel (:8010) و Flutter (:7358) را اجرا کنید.');
    }
  });
  req.pipe(upstream);
}

const server = http.createServer((req, res) => {
  const url = req.url ?? '/';
  if (url.startsWith('/api') || url.startsWith('/storage')) {
    pipeProxy(req, res, { host: API_HOST, port: API_PORT, path: url });
    return;
  }
  pipeProxy(req, res, { host: '127.0.0.1', port: FLUTTER_PORT, path: url });
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PUBLIC_PORT} is already in use. Close the other process or run: npm run dev:family\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PUBLIC_PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  مدیر خانواده — توسعه وب');
  console.log(`  اپ (تنها آدرس مرورگر):  http://localhost:${PUBLIC_PORT}`);
  console.log(`  API (همان origin):       http://localhost:${PUBLIC_PORT}/api/v1`);
  console.log(`  Storage (همان origin):   http://localhost:${PUBLIC_PORT}/storage/...`);
  console.log(`  Laravel (داخلی):         http://${API_HOST}:${API_PORT}`);
  console.log(`  Flutter (داخلی):         http://127.0.0.1:${FLUTTER_PORT}`);
  console.log('');
});
