import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';

/**
 * Local checkout load — unique X-Forwarded-For per VU (trusted loopback proxy).
 *
 * Prerequisites:
 *   - Laravel on API_URL (default http://127.0.0.1:8010)
 *   - At least one active product
 *   - PAYMENT_DEV_MODE / sandbox OK; this script only creates orders (no live Zarinpal)
 *
 * Run:
 *   k6 run -e API_URL=http://127.0.0.1:8010 -e PRODUCT_ID=1 bahram-cm/deploy/load-tests/checkout-local.js
 */

const failRate = new Rate('checkout_fail_rate');
const rateLimited = new Counter('checkout_429');
const created = new Counter('checkout_201');

export const options = {
  stages: [
    { duration: '20s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '30s', target: 250 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.15'],
    checkout_fail_rate: ['rate<0.2'],
    'http_req_duration{name:order}': ['p(95)<2000'],
  },
};

const API_URL = (__ENV.API_URL || 'http://127.0.0.1:8010').replace(/\/+$/, '');
const PRODUCT_ID = Number(__ENV.PRODUCT_ID || '0');

function clientIp(vu) {
  // TEST-NET-3 documentation range
  const a = 203;
  const b = 0;
  const c = 113;
  const d = 10 + (vu % 200);
  return `${a}.${b}.${c}.${d}`;
}

export function setup() {
  let productId = PRODUCT_ID;
  if (!productId) {
    const res = http.get(`${API_URL}/api/products`, {
      headers: { Accept: 'application/json' },
    });
    const body = res.json();
    productId = body?.data?.[0]?.id || body?.[0]?.id || 0;
  }
  if (!productId) {
    throw new Error('No PRODUCT_ID and could not discover a product from /api/products');
  }
  return { productId };
}

export default function (data) {
  const ip = clientIp(__VU);
  const phone = `0912${String(1000000 + (__VU * 17 + __ITER) % 8999999).padStart(7, '0')}`;
  const payload = JSON.stringify({
    product_id: data.productId,
    customer_name: `VU ${__VU}`,
    customer_phone: phone,
  });

  const res = http.post(`${API_URL}/api/orders`, payload, {
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Forwarded-For': ip,
      'X-Real-IP': ip,
    },
    tags: { name: 'order' },
  });

  const ok = check(res, {
    'order 201 or soft 429': (r) => r.status === 201 || r.status === 429,
    'not shared-loopback collapse': (r) => r.status !== 502 && r.status !== 500,
  });

  failRate.add(!ok);
  if (res.status === 201) created.add(1);
  if (res.status === 429) rateLimited.add(1);

  sleep(3 + Math.random() * 5);
}
