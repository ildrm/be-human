import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { DbService } from './db.service.js';
import { ResourcePolicyService } from './households.js';

describe('household resource policy', () => {
  it('allows the owner without consulting household membership', async () => {
    const db = { query: async () => { throw new Error('query should not run'); } } as unknown as DbService;
    assert.equal(await new ResourcePolicyService(db).canAccess('same', 'same', 'goal'), true);
  });

  it('denies household members unless an explicit active grant exists', async () => {
    const db = { query: async () => ({ rows: [], rowCount: 0 }) } as unknown as DbService;
    assert.equal(await new ResourcePolicyService(db).canAccess('owner', 'member', 'goal'), false);
  });

  it('does not let a view grant satisfy an edit check', async () => {
    let accepted: unknown;
    const db = { query: async (_sql: string, values: unknown[]) => { accepted = values[3]; return { rows: [], rowCount: 0 }; } } as unknown as DbService;
    await new ResourcePolicyService(db).canAccess('owner', 'member', 'goal', 'edit');
    assert.deepEqual(accepted, ['edit', 'coordinate']);
  });
});
