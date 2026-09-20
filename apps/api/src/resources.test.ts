import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DbService } from './db.service.js';
import { GoalService } from './resources.js';

describe('resource ownership policy', () => {
  it('always scopes goal reads to the authenticated owner', async () => {
    let parameters: unknown[] = [];
    const db = { query: async (_sql: string, values: unknown[]) => { parameters = values; return { rows: [], rowCount: 0 }; } } as unknown as DbService;
    await new GoalService(db).list('owner-id');
    assert.deepEqual(parameters, ['owner-id']);
  });

  it('does not archive a goal outside the authenticated owner scope', async () => {
    const db = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as DbService;
    await assert.rejects(() => new GoalService(db).archive('attacker-id', 'another-users-goal'), /Goal not found/);
  });
});
