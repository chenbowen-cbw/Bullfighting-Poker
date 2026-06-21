/**
 * k6 轻量压测:仅打健康检查与认证接口,作为最小可跑基线。
 *
 * 运行:
 *   k6 run -e BASE_URL="https://<preview-url>" infra/load/k6-auth-smoke.js
 *
 * 用途:
 * - 在没有完整对局接口时,也能得到 登录 等核心路径的 p95 画像。
 * - 作为部署后的快速健康/容量探针(低并发、短时长)。
 */
/* global __ENV, __VU, __ITER */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL;
const PASSWORD = __ENV.PASSWORD || 'Passw0rd!k6';

if (!BASE_URL) {
  throw new Error('必须设置 BASE_URL,例如 k6 run -e BASE_URL="https://<preview>" ...');
}

const healthTrend = new Trend('step_health', true);
const loginTrend = new Trend('step_login', true);

export const options = {
  vus: Number(__ENV.VUS || 10),
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<500'],
    step_login: ['p(95)<600'],
  },
};

export default function () {
  const h = http.get(`${BASE_URL}/api/health`);
  healthTrend.add(h.timings.duration);
  check(h, { '健康检查 200': (r) => r.status === 200 });

  const uid = `k6s_${__VU}_${__ITER}_${randomString(6)}`;
  http.post(
    `${BASE_URL}/api/auth/register`,
    JSON.stringify({ username: uid, password: PASSWORD }),
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );
  const login = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: uid, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  loginTrend.add(login.timings.duration);
  check(login, { '登录 200': (r) => r.status === 200 });

  sleep(1);
}
