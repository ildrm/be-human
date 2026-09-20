import { randomUUID } from 'node:crypto';
import pg from 'pg';

const webOrigin = process.env.SMOKE_WEB_ORIGIN ?? 'http://localhost:3000';
const apiOrigin = process.env.SMOKE_API_ORIGIN ?? 'http://localhost:3001';
const cookies = new Map();
const testEmail = `smoke-${randomUUID()}@example.test`;
let userId;
let householdId;

function captureCookies(response) {
  const values = response.headers.getSetCookie?.() ?? [];
  for (const value of values) {
    const match = /^([^=]+)=([^;]*)/.exec(value);
    if (match) cookies.set(match[1], match[2]);
  }
}

async function request(path, init = {}) {
  const headers = new Headers(init.headers);
  if (cookies.size) headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '));
  const response = await fetch(`${webOrigin}${path}`, { ...init, headers, redirect: 'manual' });
  captureCookies(response);
  return response;
}

function expect(response, status, label) {
  if (response.status !== status) throw new Error(`${label}: expected ${status}, received ${response.status}`);
}

const pool = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
async function cleanupTestUser(id) {
  if (!pool) return;
  await pool.query(`DELETE FROM job_outbox WHERE actor_user_id=$1::uuid OR payload->>'userId'=$1::text`, [id]);
  await pool.query('DELETE FROM household WHERE created_by=$1', [id]);
  await pool.query('DELETE FROM app_user WHERE id=$1', [id]);
}
try {
  if (pool) {
    const stale = await pool.query(`SELECT id FROM app_user WHERE email LIKE 'smoke-%@example.test'`);
    for (const row of stale.rows) await cleanupTestUser(row.id);
  }
  for (const path of ['/', '/login', '/app/today', '/app/goals', '/app/privacy', '/app/sharing']) expect(await request(path), 200, `page ${path}`);
  expect(await fetch(`${apiOrigin}/health`), 200, 'health');
  expect(await fetch(`${apiOrigin}/ready`), 200, 'readiness');

  const register = await request('/api/backend/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: testEmail, password: 'Smoke-test-password-1!' }) });
  expect(register, 201, 'register');
  const registered = await register.json();
  userId = registered.user.id;
  if (!cookies.get('bh_session') || !cookies.get('bh_csrf')) throw new Error('register did not establish both session cookies');

  expect(await request('/api/backend/auth/me'), 200, 'authenticated session');
  expect(await request('/api/backend/goals', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ level: 'direction', title: 'Should be rejected without CSRF' }) }), 403, 'CSRF rejection');
  const csrf = decodeURIComponent(cookies.get('bh_csrf'));
  const writeHeaders = { 'content-type': 'application/json', 'x-csrf-token': csrf };
  const goal = await request('/api/backend/goals', { method: 'POST', headers: writeHeaders, body: JSON.stringify({ level: 'direction', title: 'Protect enough recovery', reason: 'Smoke-test owned record' }) });
  expect(goal, 201, 'goal creation');
  const goals = await request('/api/backend/goals'); expect(goals, 200, 'goal list');
  if (!(await goals.json()).data.some((item) => item.title === 'Protect enough recovery')) throw new Error('created goal was not returned to its owner');

  const household = await request('/api/backend/households', { method: 'POST', headers: writeHeaders, body: JSON.stringify({ name: 'Smoke household' }) });
  expect(household, 201, 'household creation'); householdId = (await household.json()).data.id;

  const exportRequest = await request('/api/backend/privacy/requests', { method: 'POST', headers: writeHeaders, body: JSON.stringify({ requestType: 'export' }) });
  expect(exportRequest, 201, 'export request'); const exportId = (await exportRequest.json()).data.id;
  let exported;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await request(`/api/backend/privacy/exports/${exportId}`);
    if (response.status === 200) { exported = await response.json(); break; }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!exported?.data?.goals?.some((item) => item.title === 'Protect enough recovery')) throw new Error('worker export did not include the owned goal');

  expect(await request('/api/backend/auth/logout', { method: 'POST', headers: { 'x-csrf-token': csrf } }), 204, 'logout');
  expect(await request('/api/backend/auth/me'), 401, 'revoked session');
  process.stdout.write('HTTP smoke journey passed: pages, readiness, auth, CSRF, owned goal, household, worker export, logout.\n');
} finally {
  if (pool && userId) {
    await pool.query(`DELETE FROM job_outbox WHERE actor_user_id=$1::uuid OR payload->>'userId'=$1::text`, [userId]);
    if (householdId) await pool.query('DELETE FROM household WHERE id=$1', [householdId]);
    await pool.query('DELETE FROM app_user WHERE id=$1', [userId]);
  }
  await pool?.end();
}
