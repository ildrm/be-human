# Implementation status — 2026-09-25

## Implemented in this repository

- Next.js web routes for a public explanation, account sign-in, manual daily items, self-rated capacity check-ins, goals, household membership, goal-view grants, and privacy requests.
- NestJS/Fastify API with Argon2id passwords, opaque sessions, CSRF checks on authenticated mutations, owner-scoped resources, and a restricted grace-period state for pending deletion.
- PostgreSQL migrations, an outbox worker, JSON exports stored temporarily in PostgreSQL, and account deletion after a seven-day grace period.
- A separate deterministic plan generator that tries alternate slots for flexible items and checks recorded hard constraints against the final result. Recovery and Survival affect this generator. Changing the mode on an existing plan changes its label only and clears any stored feasibility result until regeneration.
- Versioned evidence metadata in `packages/domain/src/standards.ts` and descriptive calculations. The SQL `standard_definition` table is not populated or used by the API and is not a second published registry.
- An optional fictional demo seed. Default Compose startup does not create the demo account; use the `demo` profile explicitly. Demo plan feasibility and capacity confidence are unknown.

## Current product limits

- The Today Life Fit cards remain **unknown**. There is no implemented multidimensional assessment and no personalized recommendation engine. Missing capacity stays unknown. A check-in is a self-rating on a personal 0–100 planning scale; it does not feed the eight-dimensional generator automatically.
- Manual add/edit/delete/mode actions do not re-run the generator or validate its hard constraints. They now mark `plan.feasible` unknown (`NULL`), and Today names that uncertainty. The automatic generator is exposed through the planning API; there is no end-user regeneration workflow.
- Goal viewing is the only implemented shared-resource read. Edit/coordinate grants and shared plan/calendar/life-event actions are not available for new grants. Household membership alone provides no access; a grant is bound to the household where it was created and active membership in that household is required. Pending deletion suspends grants while either account is in that state. The sharing list and privacy count show only grants currently effective under that same policy. Migration 004 suspends older grants whose source household cannot be identified uniquely; their owners must grant access again if desired.
- The onboarding page explains the product but collects no personal context. A legacy localStorage draft is cleared when onboarding or Today opens.
- WHO-5 numeric scoring exists. The API accepts only an explicitly declared English administration for persistence. There is no instrument administration UI, translated instrument workflow, diagnostic interpretation, or commercial-license clearance.
- Evidence has no draft/review/approval console or immutable database publishing lifecycle. Registry metadata requires qualified scientific and license review before public release.
- Exports are JSON in a PostgreSQL row for seven days, not objects in S3. The worker recovers stale export claims. A basic isolated PostgreSQL dump/restore succeeded; a full backup/restore drill and retention-policy verification remain open. Deletion deletes the account and dependent rows; session revocation occurs on deletion, while the grace period uses restricted sessions.
- Redis and MinIO are provisioned in Compose but not used by application code. Email verification/recovery, MFA/passkeys, external integrations, child/custody workflows, localization, offline sync, advanced analytics, and AI are absent.

## Public release gates

Independent security and privacy review, scientific and licensing approval of evidence records, jurisdictional review, manual assistive-technology testing, a tested backup restore, deployment-specific monitoring and load tests, and production secret/TLS/retention configuration remain required. See [audit truth matrix](audit-truth-matrix.md) and [verification report](verification-report.md).
