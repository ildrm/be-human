import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { AuthService, type AuthUser } from './auth.js';
import { DbService } from './db.service.js';
import { ResourcePolicyService } from './households.js';
import { GoalService } from './resources.js';

const enabled = Boolean(process.env.DATABASE_URL);
describe('PostgreSQL ownership and session integration', { skip: !enabled }, () => {
  const db = new DbService();
  const auth = new AuthService(db);
  const goals = new GoalService(db);
  const policy = new ResourcePolicyService(db);
  const suffix = randomUUID();
  const emails = [`owner-${suffix}@example.test`, `member-${suffix}@example.test`];
  let owner: AuthUser;
  let member: AuthUser;
  let householdId = '';

  before(async () => {
    owner = await auth.register({ email: emails[0]!, password: 'Integration-password-1!' });
    member = await auth.register({ email: emails[1]!, password: 'Integration-password-2!' });
  });

  after(async () => {
    if (householdId) await db.query('DELETE FROM household WHERE id=$1', [householdId]);
    await db.query('DELETE FROM app_user WHERE email=ANY($1::text[])', [emails]);
    await db.pool.end();
  });

  it('round-trips a keyed session and its CSRF binding', async () => {
    const session = await auth.createSession(owner.id, { ip: '127.0.0.1', userAgent: 'integration-test' });
    assert.equal((await auth.resolveSession(session.token))?.id, owner.id);
    assert.equal(await auth.verifyCsrf(session.token, session.csrfToken), true);
    assert.equal(await auth.verifyCsrf(session.token, 'incorrect'), false);
  });

  it('isolates owner goals in repository queries', async () => {
    const created = await goals.create(owner.id, { title: 'Private direction', level: 'direction' });
    assert.equal((await goals.list(owner.id)).some((goal) => goal.id === created.id), true);
    assert.equal((await goals.list(member.id)).some((goal) => goal.id === created.id), false);
  });

  it('requires an explicit grant in addition to household membership', async () => {
    const household = await db.query<{ id: string }>(`INSERT INTO household(name,created_by) VALUES ('Integration household',$1) RETURNING id`, [owner.id]);
    householdId = household.rows[0]!.id;
    await db.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator'),($1,$3,'member')`, [householdId, owner.id, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    await db.query(`INSERT INTO sharing_permission(owner_user_id,grantee_user_id,resource_type,permission) VALUES ($1,$2,'goal','view')`, [owner.id, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), true);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal', 'edit'), false);
  });
});
