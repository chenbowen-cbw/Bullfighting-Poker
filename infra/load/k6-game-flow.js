/**
 * k6 压测脚本:登录 → 建房 → 开局 → 抢庄/下注/亮牌 全流程。
 *
 * 关注指标:各业务步骤的 p95 延迟与错误率。
 *
 * 运行(对 Preview 跑,切勿打生产):
 *   k6 run -e BASE_URL="https://<preview-url>" infra/load/k6-game-flow.js
 *
 * 可选环境变量:
 *   BASE_URL   被测根地址(必填,如 https://xxx.vercel.app)
 *   VUS        并发虚拟用户数(默认 20)
 *   DURATION   压测时长(默认 "1m")
 *   PASSWORD   注册/登录用口令(默认 "Passw0rd!k6")
 *   MATCH_SIZE 开局所需人数(默认 4),用于在单 VU 内尽量凑齐房间
 *
 * 设计说明:
 * - 每个 VU 先注册一个唯一用户并登录,后续请求带 Bearer。
 * - 建房与开局存在多人耦合;脚本以"尽力而为"的方式串起流程:
 *   能建房就压建房,能开局/抢庄/下注/亮牌就继续压,接口不存在(404)时
 *   记为"跳过"而非失败,保证脚本在任意里程碑阶段都能给出延迟画像。
 * - 真实的"4 人满座再开局"建议用 k6 的 scenarios + 共享房间编排,
 *   或由专门的 setup() 预建房间;此处提供单文件可跑版本。
 */
/* global __ENV, __VU, __ITER */
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js';

const BASE_URL = __ENV.BASE_URL;
const PASSWORD = __ENV.PASSWORD || 'Passw0rd!k6';
const MATCH_SIZE = Number(__ENV.MATCH_SIZE || 4);

if (!BASE_URL) {
  throw new Error('必须设置 BASE_URL,例如 k6 run -e BASE_URL="https://<preview>" ...');
}

// 自定义指标:分步延迟
const regTrend = new Trend('step_register', true);
const loginTrend = new Trend('step_login', true);
const createRoomTrend = new Trend('step_create_room', true);
const startTrend = new Trend('step_start', true);
const robTrend = new Trend('step_rob_banker', true);
const betTrend = new Trend('step_bet', true);
const revealTrend = new Trend('step_reveal', true);

const bizErrors = new Rate('biz_errors'); // 业务错误率(5xx / 非预期)
const skipped = new Counter('skipped_steps'); // 因接口缺失而跳过的步骤数

export const options = {
  scenarios: {
    game_flow: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: Number(__ENV.VUS || 20) },
        { duration: __ENV.DURATION || '1m', target: Number(__ENV.VUS || 20) },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    // 整体 p95 < 800ms、错误率 < 5%(按需收紧)
    http_req_duration: ['p(95)<800'],
    biz_errors: ['rate<0.05'],
    // 关键步骤分别给出 p95 目标
    step_login: ['p(95)<600'],
    step_create_room: ['p(95)<800'],
  },
};

/** 统一 JSON 头 */
function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

/** 记录一次请求:写入分步 Trend 与业务错误率;返回 res */
function record(res, trend, okStatuses) {
  trend.add(res.timings.duration);
  const ok = okStatuses.includes(res.status);
  // 404/405 视为"接口尚未实现",不计入业务错误,但计跳过
  if (res.status === 404 || res.status === 405) {
    skipped.add(1);
  } else {
    bizErrors.add(!ok);
  }
  return res;
}

export default function () {
  const uid = `k6_${__VU}_${__ITER}_${randomString(6)}`;
  let token = null;
  let roomId = null;

  group('auth', () => {
    const regRes = record(
      http.post(
        `${BASE_URL}/api/auth/register`,
        JSON.stringify({ username: uid, password: PASSWORD }),
        {
          headers: jsonHeaders(),
        },
      ),
      regTrend,
      [200, 201, 409], // 409=已存在也算可接受
    );
    check(regRes, { 注册返回可接受状态: (r) => [200, 201, 409].includes(r.status) });

    const loginRes = record(
      http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ username: uid, password: PASSWORD }),
        {
          headers: jsonHeaders(),
        },
      ),
      loginTrend,
      [200],
    );
    if (loginRes.status === 200) {
      try {
        token = loginRes.json('token');
      } catch {
        token = null;
      }
    }
    check(loginRes, { '登录成功并拿到 token': () => !!token });
  });

  if (!token) {
    sleep(1);
    return;
  }

  group('room', () => {
    const res = record(
      http.post(`${BASE_URL}/api/rooms`, JSON.stringify({ baseScore: 1, maxPlayers: MATCH_SIZE }), {
        headers: jsonHeaders(token),
      }),
      createRoomTrend,
      [200, 201],
    );
    if (res.status === 200 || res.status === 201) {
      try {
        roomId = res.json('room.id') || res.json('id') || res.json('roomId');
      } catch {
        roomId = null;
      }
    }
  });

  // 以下步骤依赖"对局接口"(后续里程碑提供)。接口不存在时自动跳过。
  if (roomId) {
    group('game', () => {
      record(
        http.post(`${BASE_URL}/api/game/${roomId}/start`, null, { headers: jsonHeaders(token) }),
        startTrend,
        [200, 201],
      );
      record(
        http.post(`${BASE_URL}/api/game/${roomId}/rob-banker`, JSON.stringify({ multiple: 1 }), {
          headers: jsonHeaders(token),
        }),
        robTrend,
        [200],
      );
      record(
        http.post(`${BASE_URL}/api/game/${roomId}/bet`, JSON.stringify({ amount: 1 }), {
          headers: jsonHeaders(token),
        }),
        betTrend,
        [200],
      );
      record(
        http.post(`${BASE_URL}/api/game/${roomId}/reveal`, null, { headers: jsonHeaders(token) }),
        revealTrend,
        [200],
      );
    });
  }

  sleep(Math.random() * 1 + 0.5);
}
