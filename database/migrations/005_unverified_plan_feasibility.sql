-- Manual plans and plans changed after generation have no current constraint result.
ALTER TABLE plan ALTER COLUMN feasible DROP NOT NULL;
UPDATE plan SET feasible=NULL,
  explanation=explanation||'{"constraintCheck":"not_assessed"}'::jsonb
WHERE model_version='manual-v1';
UPDATE plan SET feasible=NULL,
  explanation=explanation||'{"constraintCheck":"stale_after_upgrade"}'::jsonb
WHERE model_version='deterministic-v1';
UPDATE plan SET feasible=NULL,
  explanation=explanation||'{"constraintCheck":"not_assessed"}'::jsonb
WHERE model_version='demo-v1';
