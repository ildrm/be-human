import { createHmac, randomUUID } from 'node:crypto';
import pg from 'pg';

type Job = { id: string; jobType: string; attempts: number; maxAttempts: number; payload: { requestId: string; userId: string } };
const connectionString = process.env.DATABASE_URL ?? 'postgresql://be_human:be_human_dev@localhost:5432/be_human';
const pool = new pg.Pool({ connectionString, max: 4, application_name: 'be-human-worker', statement_timeout: 60_000 });
const workerId = `${process.env.HOSTNAME ?? 'local'}:${process.pid}:${randomUUID()}`;
let stopping = false;

const pause = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const subjectHash = (userId: string) => createHmac('sha256', process.env.SESSION_SECRET ?? 'development-only-secret').update('deletion-receipt:').update(userId).digest('hex');

async function claim(): Promise<Job | null> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<Job>(`WITH candidate AS (
      SELECT id FROM job_outbox WHERE status IN ('pending','failed') AND available_at <= now() AND attempts < max_attempts
      ORDER BY available_at,created_at FOR UPDATE SKIP LOCKED LIMIT 1
    ) UPDATE job_outbox j SET status='processing',attempts=attempts+1,locked_at=now(),locked_by=$1
      FROM candidate WHERE j.id=candidate.id
      RETURNING j.id,j.job_type AS "jobType",j.attempts,j.max_attempts,j.payload`, [workerId]);
    await client.query('COMMIT');
    return result.rows[0] ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function exportUserData(job: Job): Promise<void> {
  const { requestId, userId } = job.payload;
  const tables = [
    ['account', `SELECT id,email,display_name,locale,timezone,status,created_at FROM app_user WHERE id=$1`],
    ['profile', `SELECT * FROM profile WHERE user_id=$1`],
    ['consents', `SELECT * FROM consent WHERE user_id=$1 ORDER BY recorded_at`],
    ['goals', `SELECT * FROM goal WHERE user_id=$1 ORDER BY created_at`],
    ['lifeEvents', `SELECT * FROM life_event WHERE user_id=$1 ORDER BY starts_at`],
    ['plans', `SELECT p.*,COALESCE(json_agg(i.*) FILTER (WHERE i.id IS NOT NULL),'[]') AS items FROM plan p LEFT JOIN plan_item i ON i.plan_id=p.id WHERE p.user_id=$1 GROUP BY p.id ORDER BY p.plan_date`],
    ['capacity', `SELECT * FROM capacity_snapshot WHERE user_id=$1 ORDER BY observed_at`],
    ['metrics', `SELECT * FROM metric_observation WHERE user_id=$1 ORDER BY observed_at`],
    ['assessments', `SELECT * FROM wellbeing_assessment WHERE user_id=$1 ORDER BY administered_at`],
    ['sharingGiven', `SELECT id,household_id,grantee_user_id,resource_type,permission,expires_at,revoked_at,created_at FROM sharing_permission WHERE owner_user_id=$1 ORDER BY created_at`],
    ['sharingReceived', `SELECT id,household_id,owner_user_id,resource_type,permission,expires_at,revoked_at,created_at FROM sharing_permission WHERE grantee_user_id=$1 ORDER BY created_at`],
  ] as const;
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
    const request = await client.query(`SELECT 1 FROM data_request WHERE id=$1 AND user_id=$2 AND status='pending' AND cancelled_at IS NULL FOR UPDATE`, [requestId, userId]);
    if (!request.rowCount) { await client.query('COMMIT'); return; }
    await client.query(`UPDATE data_request SET status='processing' WHERE id=$1`, [requestId]);
    const exportData: Record<string, unknown> = { schemaVersion: 2, generatedAt: new Date().toISOString() };
    for (const [key, sql] of tables) exportData[key] = (await client.query(sql, [userId])).rows;
    await client.query(`UPDATE data_request SET status='completed',completed_at=now(),result=$2,result_expires_at=now()+interval '7 days' WHERE id=$1`, [requestId, JSON.stringify(exportData)]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function deleteUserData(job: Job): Promise<void> {
  const { requestId, userId } = job.payload;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const request = await client.query(`SELECT 1 FROM data_request WHERE id=$1 AND user_id=$2 AND request_type='deletion' AND status='pending' AND cancelled_at IS NULL AND available_at <= now() FOR UPDATE`, [requestId, userId]);
    if (!request.rowCount) { await client.query('COMMIT'); return; }
    await client.query(`INSERT INTO deletion_receipt(subject_hash,request_id) VALUES ($1,$2)`, [subjectHash(userId), requestId]);
    await client.query(`INSERT INTO audit_log(actor_user_id,action,resource_type,resource_id,metadata) VALUES ($1,'complete_deletion','account',$1,$2)`, [userId, JSON.stringify({ requestId })]);
    await client.query(`DELETE FROM app_user WHERE id=$1`, [userId]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

async function complete(job: Job): Promise<void> {
  await pool.query(`UPDATE job_outbox SET status='completed',completed_at=now(),locked_at=NULL,locked_by=NULL,last_error=NULL,payload=CASE WHEN $2 THEN '{}'::jsonb ELSE payload END WHERE id=$1`, [job.id, job.jobType === 'privacy.deletion']);
}

async function fail(job: Job, error: unknown): Promise<void> {
  const dead = job.attempts >= job.maxAttempts;
  const delaySeconds = Math.min(3600, 2 ** job.attempts * 5);
  await pool.query(`UPDATE job_outbox SET status=$2,last_error=$3,available_at=now()+($4*interval '1 second'),locked_at=NULL,locked_by=NULL WHERE id=$1`, [job.id, dead ? 'dead' : 'failed', error instanceof Error ? error.name : 'UnknownError', delaySeconds]);
  await pool.query(`UPDATE data_request SET status=$2,error_code=$3 WHERE id=$1`, [job.payload.requestId, dead ? 'failed' : 'pending', dead ? 'PROCESSING_FAILED' : null]);
}

async function run(): Promise<void> {
  await pool.query(`WITH stale AS (
    UPDATE job_outbox SET status=CASE WHEN attempts>=max_attempts THEN 'dead' ELSE 'failed' END,locked_at=NULL,locked_by=NULL,available_at=now()
    WHERE status='processing' AND locked_at < now()-interval '15 minutes'
    RETURNING job_type,payload,status
  ) UPDATE data_request d SET status=CASE WHEN stale.status='dead' THEN 'failed' ELSE 'pending' END,
      error_code=CASE WHEN stale.status='dead' THEN 'PROCESSING_FAILED' ELSE NULL END
    FROM stale WHERE d.request_type='export' AND d.status='processing'
      AND stale.job_type='privacy.export' AND d.id=(stale.payload->>'requestId')::uuid`);
  while (!stopping) {
    await pool.query(`UPDATE data_request SET result=NULL,status='expired' WHERE request_type='export' AND result_expires_at <= now() AND result IS NOT NULL`);
    const job = await claim();
    if (!job) { await pause(2_000); continue; }
    try {
      if (job.jobType === 'privacy.export') await exportUserData(job);
      else if (job.jobType === 'privacy.deletion') await deleteUserData(job);
      else throw new Error(`Unsupported job type: ${job.jobType}`);
      await complete(job);
    } catch (error) { await fail(job, error); }
  }
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => { stopping = true; });
try { await run(); } finally { await pool.end(); }
