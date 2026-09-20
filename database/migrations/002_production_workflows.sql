ALTER TABLE user_session ADD COLUMN IF NOT EXISTS csrf_hash text;
ALTER TABLE user_session ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE goal ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE goal ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS goal_user_status_idx ON goal(user_id, status, created_at DESC);

ALTER TABLE data_request ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE data_request ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE data_request ADD COLUMN IF NOT EXISTS result jsonb;
ALTER TABLE data_request ADD COLUMN IF NOT EXISTS error_code text;
ALTER TABLE data_request ADD COLUMN IF NOT EXISTS result_expires_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS data_request_one_open_idx ON data_request(user_id, request_type)
  WHERE status IN ('pending','processing') AND cancelled_at IS NULL;

CREATE TABLE IF NOT EXISTS job_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','dead')),
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 8,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS job_outbox_ready_idx ON job_outbox(status, available_at, created_at)
  WHERE status IN ('pending','failed');

CREATE TABLE IF NOT EXISTS notification_preference (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  in_app boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  quiet_hours jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  kind text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_path text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notification_user_idx ON notification(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS deletion_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_hash text NOT NULL,
  request_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_user_id_fkey;
ALTER TABLE household ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE household DROP CONSTRAINT IF EXISTS household_created_by_fkey;
ALTER TABLE household ADD CONSTRAINT household_created_by_fkey FOREIGN KEY (created_by) REFERENCES app_user(id) ON DELETE SET NULL;
ALTER TABLE standard_definition DROP CONSTRAINT IF EXISTS standard_definition_published_by_fkey;
ALTER TABLE standard_definition ADD CONSTRAINT standard_definition_published_by_fkey FOREIGN KEY (published_by) REFERENCES app_user(id) ON DELETE SET NULL;
ALTER TABLE feature_flag DROP CONSTRAINT IF EXISTS feature_flag_updated_by_fkey;
ALTER TABLE feature_flag ADD CONSTRAINT feature_flag_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES app_user(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$;
DROP TRIGGER IF EXISTS audit_log_no_update ON audit_log;
CREATE TRIGGER audit_log_no_update BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();
