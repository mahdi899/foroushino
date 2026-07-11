import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * Homepage stress test — target: 10k concurrent VUs (cached HTML).
 * Run: k6 run deploy/load-tests/homepage.js
 * Adjust VUs based on hardware; start with 500 and scale up.
 */
export const options = {
  stages: [
    { duration: '2m', target: 500 },
    { duration: '5m', target: 2000 },
    { duration: '2m', target: 5000 },
    { duration: '3m', target: 10000 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, {
    'homepage status 200': (r) => r.status === 200,
  });
  sleep(0.5);
}
