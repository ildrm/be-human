-- A grant must retain the household in which the owner created it. Older grants
-- with no unique shared household at creation time are suspended conservatively.
ALTER TABLE sharing_permission ADD COLUMN IF NOT EXISTS household_id uuid REFERENCES household(id) ON DELETE CASCADE;

WITH candidates AS (
  SELECT s.id, min(owner.household_id::text)::uuid AS household_id, count(DISTINCT owner.household_id) AS household_count
  FROM sharing_permission s
  JOIN household_member owner ON owner.user_id=s.owner_user_id
    AND owner.valid_from<=s.created_at AND (owner.valid_to IS NULL OR owner.valid_to>s.created_at)
  JOIN household_member grantee ON grantee.household_id=owner.household_id AND grantee.user_id=s.grantee_user_id
    AND grantee.valid_from<=s.created_at AND (grantee.valid_to IS NULL OR grantee.valid_to>s.created_at)
  WHERE s.household_id IS NULL
  GROUP BY s.id
)
UPDATE sharing_permission s SET household_id=c.household_id
FROM candidates c WHERE s.id=c.id AND c.household_count=1;

UPDATE sharing_permission SET revoked_at=now() WHERE household_id IS NULL AND revoked_at IS NULL;
ALTER TABLE sharing_permission ADD CONSTRAINT sharing_active_has_household CHECK (revoked_at IS NOT NULL OR household_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS sharing_permission_household_idx ON sharing_permission(household_id) WHERE revoked_at IS NULL;
