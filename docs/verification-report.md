# Verification report — 2026-09-25

This report records checks run in this workspace. They exercise a local development configuration and do not certify a public deployment.

## Passed

| Check | Observed result |
|---|---|
| `pnpm verify` with an isolated PostgreSQL 17 database and `SESSION_SECRET` | Lint, typecheck, 41 domain tests, 20 API tests, and both production builds passed; no tests skipped after migration 005 |
| `pnpm audit --audit-level high` | No known high or critical dependency vulnerabilities reported |
| Migration repeatability | All five migrations applied on a fresh database; a second run had no pending changes |
| Upgrade probes | `scripts/verify-upgrade-migrations.mjs` passed on a separate temporary database: a unique legacy household was backfilled, an ambiguous grant was suspended, and old manual/generated feasibility became unknown until fresh generation |
| `pnpm db:seed` | Explicit fictional seed completed in the isolated test database |
| `pnpm test:e2e` | 7/7 Playwright tests passed in the configured Chromium profile against seeded API/web processes, including the automated axe checks in the suite |
| `pnpm test:smoke` | Passed against API, web, worker, and PostgreSQL after migration 004; exercised CSRF, owned resources, invitation, explicit sharing, export worker, pending-deletion suspension/cancellation, logout, and session revocation |
| `docker compose config --quiet` | Passed |
| Isolated Compose boot before the last migration 005 data update | Images built; PostgreSQL, Redis, API, web, and worker started with all five migrations; API `/health` and `/ready`, and web `/` returned 200; the database contained zero users without the `demo` profile |
| Request correlation probe | A request with `x-request-id: audit-trace-123` returned that ID and Fastify logged the same `reqId` |
| Isolated database restore | A custom-format dump restored into a separate database and exposed all five migration records |
| `git diff --check` | Passed after the changes |

The clean Compose boot used project `be-human-audit` and separate local ports and volumes. The database-backed suites used a separate temporary PostgreSQL container. Neither check used the existing default Compose database volume.

After the last migration 005 data update, the final Compose rebuild was attempted twice but Docker Hub timed out during the TLS handshake for `docker/dockerfile:1.7`, before project code was built. The same final SQL applied and passed upgrade probes on fresh host-side databases. A final container rebuild remains unverified.

## Limited measurements

One synthetic in-process planner run scheduled 500 identical one-minute flexible items in about 105 ms, with no deferrals. This measures neither production throughput nor user-perceived latency. The restore check established basic dump readability and schema restoration, not recovery time, consistency under concurrent writes, application startup from the restored copy, or recovery of external data.

## Checks still needed

- Image and filesystem vulnerability scanning in CI or a scanner-enabled environment. Trivy was unavailable locally; Docker Scout required a sign-in. The dependency audit above is narrower.
- Repeat the final Compose image build when Docker Hub registry access is available.
- Cross-browser Playwright execution in Firefox and WebKit, manual assistive-technology testing, and broader authenticated accessibility review.
- Representative load and browser performance measurements, security penetration testing, production monitoring validation, and a full backup/restore drill with recovery objectives.
- Qualified scientific, licensing, privacy, and jurisdictional review before a public release.

See [implementation status](implementation-status.md) and the [audit truth matrix](audit-truth-matrix.md) for missing product capabilities. A passing test here is evidence for the exercised path only.
