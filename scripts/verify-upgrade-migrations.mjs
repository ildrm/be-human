import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const database = `be_human_migration_verify_${randomBytes(5).toString('hex')}`;
const admin = new pg.Client({ connectionString: process.env.DATABASE_URL });
const testUrl = new URL(process.env.DATABASE_URL);
testUrl.pathname = `/${database}`;
let test;

try {
  await admin.connect();
  await admin.query(`CREATE DATABASE ${database}`);
  test = new pg.Client({ connectionString: testUrl.toString() });
  await test.connect();
  for (const version of ['001_initial', '002_production_workflows', '003_household_permissions']) {
    await test.query(await readFile(new URL(`../database/migrations/${version}.sql`, import.meta.url), 'utf8'));
  }
  const owner = (await test.query(`INSERT INTO app_user(email,password_hash,display_name) VALUES ('migration-owner@example.test','test','Owner') RETURNING id`)).rows[0].id;
  const member = (await test.query(`INSERT INTO app_user(email,password_hash,display_name) VALUES ('migration-member@example.test','test','Member') RETURNING id`)).rows[0].id;
  const household = (await test.query(`INSERT INTO household(name,created_by) VALUES ('First',$1) RETURNING id`, [owner])).rows[0].id;
  await test.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator'),($1,$3,'member')`, [household, owner, member]);
  const unambiguous = (await test.query(`INSERT INTO sharing_permission(owner_user_id,grantee_user_id,resource_type,permission) VALUES ($1,$2,'goal','view') RETURNING id`, [owner, member])).rows[0].id;
  const other = (await test.query(`INSERT INTO household(name,created_by) VALUES ('Second',$1) RETURNING id`, [owner])).rows[0].id;
  await test.query(`INSERT INTO household_member(household_id,user_id,role) VALUES ($1,$2,'administrator'),($1,$3,'member')`, [other, owner, member]);
  const ambiguous = (await test.query(`INSERT INTO sharing_permission(owner_user_id,grantee_user_id,resource_type,permission) VALUES ($1,$2,'plan','view') RETURNING id`, [owner, member])).rows[0].id;
  await test.query(await readFile(new URL('../database/migrations/004_bind_sharing_to_household.sql', import.meta.url), 'utf8'));
  const grants = await test.query(`SELECT id,household_id,revoked_at FROM sharing_permission WHERE id=ANY($1::uuid[])`, [[unambiguous, ambiguous]]);
  const first = grants.rows.find((row) => row.id === unambiguous);
  const second = grants.rows.find((row) => row.id === ambiguous);
  assert.equal(first?.household_id, household);
  assert.equal(first?.revoked_at, null);
  assert.equal(second?.household_id, null);
  assert.ok(second?.revoked_at);
  const manual = (await test.query(`INSERT INTO plan(user_id,plan_date,timezone,operating_mode,feasible,model_version,explanation) VALUES ($1,'2026-09-25','UTC','stability',true,'manual-v1','{}') RETURNING id`, [owner])).rows[0].id;
  const generated = (await test.query(`INSERT INTO plan(user_id,plan_date,timezone,operating_mode,feasible,model_version,explanation) VALUES ($1,'2026-09-26','UTC','stability',true,'deterministic-v1','{}') RETURNING id`, [owner])).rows[0].id;
  await test.query(await readFile(new URL('../database/migrations/005_unverified_plan_feasibility.sql', import.meta.url), 'utf8'));
  const plans = await test.query(`SELECT id,feasible,explanation FROM plan WHERE id=ANY($1::uuid[])`, [[manual, generated]]);
  const oldManual = plans.rows.find((row) => row.id === manual);
  const oldGenerated = plans.rows.find((row) => row.id === generated);
  assert.equal(oldManual?.feasible, null);
  assert.equal(oldManual?.explanation.constraintCheck, 'not_assessed');
  assert.equal(oldGenerated?.feasible, null);
  assert.equal(oldGenerated?.explanation.constraintCheck, 'stale_after_upgrade');
  process.stdout.write('Sharing and plan upgrade migration probes passed.\n');
} finally {
  await test?.end();
  try { await admin.query(`DROP DATABASE IF EXISTS ${database} WITH (FORCE)`); } finally { await admin.end(); }
}
