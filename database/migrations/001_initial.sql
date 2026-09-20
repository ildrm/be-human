CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migration (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  locale text NOT NULL DEFAULT 'en',
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','locked','pending_deletion')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS app_user_email_unique ON app_user (lower(email));

CREATE TABLE IF NOT EXISTS user_role (
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','guardian','household_admin','scientific_reviewer','standards_admin','security_admin','platform_admin')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  ip_hash text,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_session_active_idx ON user_session(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS profile (
  user_id uuid PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
  birth_date date,
  life_stage text,
  worldview text CHECK (worldview IN ('none','religious','spiritual','philosophical','custom','prefer_not_to_say')),
  accessibility_needs jsonb NOT NULL DEFAULT '[]',
  professional_restrictions jsonb NOT NULL DEFAULT '[]',
  privacy_class text NOT NULL DEFAULT 'private',
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz
);

CREATE TABLE IF NOT EXISTS consent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  purpose text NOT NULL,
  policy_version text NOT NULL,
  granted boolean NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);

CREATE TABLE IF NOT EXISTS household (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS household_member (
  household_id uuid NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('member','guardian','dependent','administrator')),
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  PRIMARY KEY (household_id, user_id, valid_from)
);

CREATE TABLE IF NOT EXISTS sharing_permission (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  grantee_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  resource_type text NOT NULL,
  permission text NOT NULL CHECK (permission IN ('view','edit','coordinate')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (owner_user_id <> grantee_user_id)
);
CREATE INDEX IF NOT EXISTS sharing_permission_lookup_idx ON sharing_permission(grantee_user_id, resource_type) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS context_node (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  node_type text NOT NULL,
  label text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}',
  privacy_class text NOT NULL DEFAULT 'private',
  valid_from timestamptz NOT NULL,
  valid_to timestamptz
);

CREATE TABLE IF NOT EXISTS context_edge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  source_node_id uuid NOT NULL REFERENCES context_node(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES context_node(id) ON DELETE CASCADE,
  relationship text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}',
  valid_from timestamptz NOT NULL,
  valid_to timestamptz,
  CHECK (source_node_id <> target_node_id)
);
CREATE INDEX IF NOT EXISTS context_edge_active_idx ON context_edge(owner_user_id, relationship) WHERE valid_to IS NULL;

CREATE TABLE IF NOT EXISTS life_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  timezone text NOT NULL,
  impact jsonb NOT NULL DEFAULT '{}',
  privacy_class text NOT NULL DEFAULT 'private'
);

CREATE TABLE IF NOT EXISTS goal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  parent_goal_id uuid REFERENCES goal(id) ON DELETE SET NULL,
  level text NOT NULL CHECK (level IN ('value','direction','outcome','project','behaviour','habit','action')),
  title text NOT NULL,
  reason text,
  completion_criteria text,
  constraints jsonb NOT NULL DEFAULT '[]',
  demand jsonb NOT NULL DEFAULT '{}',
  minimum_viable_version text,
  fallback_plan text,
  recovery_rule text,
  status text NOT NULL DEFAULT 'active',
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  timezone text NOT NULL,
  operating_mode text NOT NULL CHECK (operating_mode IN ('stability','growth','recovery','survival')),
  feasible boolean NOT NULL,
  model_version text NOT NULL,
  explanation jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, plan_date, model_version)
);

CREATE TABLE IF NOT EXISTS plan_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES goal(id) ON DELETE SET NULL,
  title text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  fixed boolean NOT NULL,
  essential boolean NOT NULL,
  demand jsonb NOT NULL,
  status text NOT NULL DEFAULT 'planned',
  CHECK (ends_at > starts_at)
);
CREATE INDEX IF NOT EXISTS plan_item_timeline_idx ON plan_item(plan_id, starts_at);

CREATE TABLE IF NOT EXISTS capacity_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  observed_at timestamptz NOT NULL,
  timezone text NOT NULL,
  capacity jsonb NOT NULL,
  confidence jsonb NOT NULL,
  source text NOT NULL,
  UNIQUE(user_id, observed_at, source)
);

CREATE TABLE IF NOT EXISTS metric_observation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  metric_code text NOT NULL,
  value numeric NOT NULL,
  unit text NOT NULL,
  observed_at timestamptz NOT NULL,
  timezone text NOT NULL,
  source text NOT NULL,
  confidence numeric CHECK (confidence >= 0 AND confidence <= 1),
  source_event_id text,
  privacy_class text NOT NULL DEFAULT 'private',
  UNIQUE(user_id, metric_code, observed_at, source, source_event_id)
);
CREATE INDEX IF NOT EXISTS metric_observation_trend_idx ON metric_observation(user_id, metric_code, observed_at DESC);

CREATE TABLE IF NOT EXISTS wellbeing_assessment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  instrument_code text NOT NULL,
  instrument_version text NOT NULL,
  locale text NOT NULL,
  administered_at timestamptz NOT NULL,
  responses jsonb NOT NULL,
  raw_score numeric NOT NULL,
  normalized_score numeric,
  privacy_class text NOT NULL DEFAULT 'health_related'
);

CREATE TABLE IF NOT EXISTS standard_definition (
  id text NOT NULL,
  version text NOT NULL,
  title text NOT NULL,
  authority text NOT NULL,
  classification text NOT NULL,
  source_url text NOT NULL,
  published_on date NOT NULL,
  effective_from date NOT NULL,
  review_on date,
  last_verified_on date NOT NULL,
  population text NOT NULL,
  jurisdiction text NOT NULL,
  measurement_unit text,
  rule jsonb NOT NULL,
  evidence_strength text NOT NULL,
  limitations text NOT NULL,
  contraindications text,
  license text NOT NULL,
  status text NOT NULL CHECK (status IN ('review','active','retired')),
  supersedes_version text,
  published_by uuid REFERENCES app_user(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);
CREATE INDEX IF NOT EXISTS standard_active_idx ON standard_definition(id, effective_from DESC) WHERE status='active';

CREATE TABLE IF NOT EXISTS recommendation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  standard_id text,
  standard_version text,
  title text NOT NULL,
  explanation jsonb NOT NULL,
  confidence text NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (standard_id, standard_version) REFERENCES standard_definition(id, version)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_user_id uuid REFERENCES app_user(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  request_id text
);
CREATE INDEX IF NOT EXISTS audit_log_resource_idx ON audit_log(resource_type, resource_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS data_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  request_type text NOT NULL CHECK (request_type IN ('export','deletion')),
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS feature_flag (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text NOT NULL,
  conditions jsonb NOT NULL DEFAULT '{}',
  experimental boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES app_user(id)
);
