import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DbService } from './db.service.js';
import { AuthService, canAccessWhilePending, hashPurposeToken } from './auth.js';

describe('session security', () => {
  it('stores keyed hashes instead of raw session and CSRF tokens', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
    let values: unknown[] = [];
    const db = { query: async (_sql: string, parameters: unknown[]) => { values = parameters; return { rows: [], rowCount: 1 }; } } as unknown as DbService;
    const session = await new AuthService(db).createSession('00000000-0000-0000-0000-000000000001', { ip: '127.0.0.1' });
    assert.notEqual(values[1], session.token);
    assert.notEqual(values[2], session.csrfToken);
    assert.match(String(values[1]), /^[a-f0-9]{64}$/);
    assert.match(String(values[2]), /^[a-f0-9]{64}$/);
  });
  it('separates cryptographic purposes even when the input text is identical', () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
    assert.notEqual(hashPurposeToken('session', 'same-text'), hashPurposeToken('csrf', 'same-text'));
    assert.notEqual(hashPurposeToken('ip', 'same-text'), hashPurposeToken('session', 'same-text'));
  });

  it('rejects a mismatched CSRF token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
    const db = { query: async () => ({ rows: [{ csrfHash: '0'.repeat(64) }], rowCount: 1 }) } as unknown as DbService;
    assert.equal(await new AuthService(db).verifyCsrf('session', 'wrong'), false);
  });
  it('limits a pending-deletion account to reviewing privacy and cancelling deletion', () => {
    assert.equal(canAccessWhilePending('GET', '/api/v1/auth/me'), true);
    assert.equal(canAccessWhilePending('GET', '/api/v1/privacy/requests'), true);
    assert.equal(canAccessWhilePending('DELETE', '/api/v1/privacy/requests/00000000-0000-0000-0000-000000000001'), true);
    assert.equal(canAccessWhilePending('POST', '/api/v1/auth/logout'), true);
    assert.equal(canAccessWhilePending('POST', '/api/v1/privacy/requests'), false);
    assert.equal(canAccessWhilePending('GET', '/api/v1/today'), false);
    assert.equal(canAccessWhilePending('PATCH', '/api/v1/goals/00000000-0000-0000-0000-000000000001'), false);
  });
});
