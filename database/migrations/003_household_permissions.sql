CREATE TABLE IF NOT EXISTS household_invitation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL REFERENCES household(id) ON DELETE CASCADE,
  created_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  invited_email text,
  token_hash text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role IN ('member','guardian','dependent','administrator')),
  expires_at timestamptz NOT NULL,
  accepted_by uuid REFERENCES app_user(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS household_invitation_active_idx ON household_invitation(token_hash,expires_at)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS household_member_one_active
  ON household_member(household_id,user_id) WHERE valid_to IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sharing_permission_active_unique
  ON sharing_permission(owner_user_id,grantee_user_id,resource_type)
  WHERE revoked_at IS NULL;
