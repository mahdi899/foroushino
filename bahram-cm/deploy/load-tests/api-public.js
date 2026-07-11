import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * API throughput test — public endpoints.
 * Run: k6 run deploy/load-tests/api-public.js
 */
export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
  },
};

const API_URL = __ENV.API_URL || 'http://localhost:8010';

export default function () {
  const endpoints = ['/api/articles', '/api/products', '/api/faqs'];
  const path = endpoints[Math.floor(Math.random() * endpoints.length)];
  const res = http.get(`${API_URL}${path}`);
  check(res, {
    'api status 200': (r) => r.status === 200,
  });
  sleep(0.2);
}
