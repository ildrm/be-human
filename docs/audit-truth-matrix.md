# Audit truth matrix — 2026-09-25

Status describes the runtime implementation, not the presence of a schema or a UI label. Local verification is recorded separately in `verification-report.md`.

| Claim | Code | Database | Test / runtime evidence | Actual status |
|---|---|---|---|---|
| Personalized Life Fit | `apps/web/app/ui/life-os.tsx` | `recommendation` exists without a producer | Static personal claims were removed | Unknown state only; no assessment engine |
| Capacity estimate | Today check-in API and web form | `capacity_snapshot` | Typecheck and build | Optional four-value self-rating; separate from planner input |
| Recovery / Survival | `packages/domain/src/planner.ts` | `plan.operating_mode`, nullable `feasible` | Domain and PostgreSQL tests | Generator policy works; editing a saved mode changes its label and marks feasibility unknown |
| Flexible scheduling and hard constraints | `generatePlan` | Saved items in `plan_item` | Planner and PostgreSQL tests for movement, sleep, accessibility, finite input, and edit invalidation | Generator checks final schedule; manual mutations are marked unverified |
| Onboarding | `/onboarding` explanation | None | Web build | No personal data collected; legacy draft cleared on entry |
| Evidence governance | `packages/domain/src/standards.ts` | `standard_definition` is unused | Provenance and applicability tests | TypeScript metadata is runtime source; no scientific approval workflow |
| WHO-5 | Numerical scoring and English-only persistence DTO | `wellbeing_assessment` | Calculation tests | No instrument UI, diagnostic inference, or commercial licensing approval |
| Sessions and account state | `auth.ts` | `user_session`, `app_user.status` | Auth and live PostgreSQL integration tests passed | Pending deletion restricted; recovery/MFA/rotation absent |
| Household sharing | `households.ts`, goal shared-read route, privacy summary | `household_member`, `sharing_permission.household_id` | PostgreSQL tests for expiry, departure, rejoin, pending deletion, cross-household isolation; migration backfill probe | Goal view only; list and count reflect effective grants; ambiguous legacy grants suspended |
| Export / deletion | `resources.ts`, `scripts/worker.ts` | `data_request`, `job_outbox` | Live HTTP/worker smoke passed; basic isolated database restore passed | Expiring PostgreSQL JSON export and grace-period deletion; full recovery drill absent |
| Demo data | `scripts/seed.ts`, Compose `demo` profile | Seed account/plan/capacity | Seed and browser checks | Explicit local fixture; Today labels fictional sources and plan feasibility is unknown |
| Redis / S3 | No runtime client | None | Source inspection | Provisioned only; not application capabilities |
| Request IDs | `request-context.ts`, Fastify `genReqId` | `audit_log.request_id` | Unit tests and live log/header probe | Fastify access logs, response, and request audit use the same validated ID; distributed tracing absent |
| Browser accessibility | Semantic UI, Playwright axe suite | None | 7/7 Chromium-profile E2E tests passed, including suite axe checks | Limited automated coverage; manual assistive testing required |
