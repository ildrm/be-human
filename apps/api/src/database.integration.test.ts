import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { createHmac, randomUUID } from 'node:crypto';
import { AuthService, hashPurposeToken, type AuthUser } from './auth.js';
import { DbService } from './db.service.js';
import { HouseholdsController, ResourcePolicyService } from './households.js';
import { DailyPlanService } from './plans.js';
import { GoalService, PrivacyController } from './resources.js';
import type { FastifyRequest } from 'fastify';

const enabled = Boolean(process.env.DATABASE_URL);
describe('PostgreSQL ownership and session integration', { skip: !enabled }, () => {
  const db = new DbService();
  const auth = new AuthService(db);
  const goals = new GoalService(db);
  const daily = new DailyPlanService(db);
  const policy = new ResourcePolicyService(db);
  const households = new HouseholdsController(db);
  const privacy = new PrivacyController(db);
  const suffix = randomUUID();
  const emails = [`owner-${suffix}@example.test`, `member-${suffix}@example.test`];
  let owner: AuthUser;
  let member: AuthUser;
  const householdIds: string[] = [];
  const asRequest = (user: AuthUser) => ({ user }) as unknown as FastifyRequest;

  before(async () => {
    owner = await auth.register({ email: emails[0]!, password: 'Integration-password-1!' });
    member = await auth.register({ email: emails[1]!, password: 'Integration-password-2!' });
  });

  after(async () => {
    for (const id of householdIds) await db.query('DELETE FROM household WHERE id=$1', [id]);
    await db.query('DELETE FROM app_user WHERE email=ANY($1::text[])', [emails]);
    await db.pool.end();
  });

  it('round-trips a keyed session and its CSRF binding', async () => {
    const session = await auth.createSession(owner.id, { ip: '127.0.0.1', userAgent: 'integration-test' });
    assert.equal((await auth.resolveSession(session.token))?.id, owner.id);
    assert.equal(await auth.verifyCsrf(session.token, session.csrfToken), true);
    assert.equal(await auth.verifyCsrf(session.token, 'incorrect'), false);
    await db.query(`UPDATE user_session SET last_seen_at=now()-interval '1 hour' WHERE token_hash=$1`, [hashPurposeToken('session', session.token)]);
    await auth.resolveSession(session.token);
    const touched = await db.query<{ recent: boolean }>(`SELECT last_seen_at > now()-interval '5 minutes' AS recent FROM user_session WHERE token_hash=$1`, [hashPurposeToken('session', session.token)]);
    assert.equal(touched.rows[0]?.recent, true);
  });
  it('accepts a pre-upgrade session and CSRF pair until ordinary expiry', async () => {
    const token = `legacy-${randomUUID()}`;
    const csrf = `legacy-csrf-${randomUUID()}`;
    const digest = (value: string) => createHmac('sha256', process.env.SESSION_SECRET ?? 'development-only-secret').update(value).digest('hex');
    await db.query(`INSERT INTO user_session(user_id,token_hash,csrf_hash,expires_at) VALUES ($1,$2,$3,now()+interval '1 hour')`, [owner.id, digest(token), digest(csrf)]);
    assert.equal((await auth.resolveSession(token))?.id, owner.id);
    assert.equal(await auth.verifyCsrf(token, csrf), true);
    await auth.revoke(token);
    assert.equal(await auth.resolveSession(token), null);
  });

  it('isolates owner goals in repository queries', async () => {
    const created = await goals.create(owner.id, { title: 'Private direction', level: 'direction' });
    assert.equal((await goals.list(owner.id)).some((goal) => goal.id === created.id), true);
    assert.equal((await goals.list(member.id)).some((goal) => goal.id === created.id), false);
  });

  it('marks manual and edited plans as unverified', async () => {
    const item = await daily.createItem(owner.id, { planDate: '2026-09-25', title: 'Manual commitment', startTime: '09:00', durationMinutes: 30 });
    const plan = await db.query<{ id: string; feasible: boolean | null }>(`SELECT id,feasible FROM plan WHERE user_id=$1 AND model_version='manual-v1'`, [owner.id]);
    const planId = plan.rows[0]!.id;
    assert.equal(plan.rows[0]!.feasible, null);
    await db.query('UPDATE plan SET feasible=true WHERE id=$1', [planId]);
    await daily.updateItem(owner.id, item.id, { title: 'Changed commitment' });
    assert.equal((await db.query<{ feasible: boolean | null }>('SELECT feasible FROM plan WHERE id=$1', [planId])).rows[0]!.feasible, null);
    await db.query('UPDATE plan SET feasible=true WHERE id=$1', [planId]);
    await daily.updateMode(owner.id, planId, 'recovery');
    assert.equal((await db.query<{ feasible: boolean | null }>('SELECT feasible FROM plan WHERE id=$1', [planId])).rows[0]!.feasible, null);
    await db.query('UPDATE plan SET feasible=true WHERE id=$1', [planId]);
    await daily.deleteItem(owner.id, item.id);
    assert.equal((await db.query<{ feasible: boolean | null }>('SELECT feasible FROM plan WHERE id=$1', [planId])).rows[0]!.feasible, null);
  });

  it('requires an explicit grant in addition to household membership', async () => {
    const household = await db.query<{ id: string }>(`INSERT INTO household(name,created_by) VALUES ('Integration household',$1) RETURNING id`, [owner.id]);
    const householdId = household.rows[0]!.id;
    householdIds.push(householdId);
    await db.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator'),($1,$3,'member')`, [householdId, owner.id, member.id]);
    const other = await db.query<{ id: string }>(`INSERT INTO household(name,created_by) VALUES ('Other integration household',$1) RETURNING id`, [owner.id]);
    householdIds.push(other.rows[0]!.id);
    await db.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator'),($1,$3,'member')`, [other.rows[0]!.id, owner.id, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    await db.query(`INSERT INTO sharing_permission(household_id,owner_user_id,grantee_user_id,resource_type,permission) VALUES ($1,$2,$3,'goal','view')`, [householdId, owner.id, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), true);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal', 'edit'), false);
    assert.equal((await households.shares(asRequest(owner))).data.length, 1);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 1);
    await db.query(`UPDATE app_user SET status='pending_deletion' WHERE id=$1`, [owner.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 0);
    await db.query(`UPDATE app_user SET status='active' WHERE id=$1`, [owner.id]);
    await db.query(`UPDATE app_user SET status='pending_deletion' WHERE id=$1`, [member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 0);
    await db.query(`UPDATE app_user SET status='active' WHERE id=$1`, [member.id]);
    await db.query(`UPDATE sharing_permission SET expires_at=now()-interval '1 minute' WHERE owner_user_id=$1 AND grantee_user_id=$2`, [owner.id, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    assert.equal((await households.shares(asRequest(owner))).data.length, 0);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 0);
    await db.query(`UPDATE sharing_permission SET expires_at=NULL WHERE owner_user_id=$1 AND grantee_user_id=$2`, [owner.id, member.id]);
    await db.query('UPDATE household_member SET valid_to=now() WHERE household_id=$1 AND user_id=$2 AND valid_to IS NULL', [householdId, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    assert.equal((await households.shares(asRequest(owner))).data.length, 0);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 0);
    await db.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'member')`, [householdId, member.id]);
    assert.equal(await policy.canAccess(owner.id, member.id, 'goal'), false);
    assert.equal((await privacy.summary(asRequest(owner))).data.activeShares, 0);
  });
});
