import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DbService } from './db.service.js';
import { AuthService } from './auth.js';

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

  it('rejects a mismatched CSRF token', async () => {
    process.env.SESSION_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
    const db = { query: async () => ({ rows: [{ csrfHash: '0'.repeat(64) }], rowCount: 1 }) } as unknown as DbService;
    assert.equal(await new AuthService(db).verifyCsrf('session', 'wrong'), false);
  });
});
