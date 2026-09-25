# Be Human

Be Human is a life-planning application built around constraints, user choice, and uncertainty. It does not compute a universal life score or offer medical, legal, or financial advice.

This repository contains a Next.js web app, NestJS/Fastify API, PostgreSQL migrations, an outbox worker, and a deterministic domain package. The current web app supports manual plan items, goals, self-rated capacity check-ins, privacy requests, and household membership. The Life Fit map stays unknown until a real assessment exists. The standalone planner API can search alternate slots for flexible items under recorded constraints; the web app does not yet regenerate manual plans.

## Run locally

Requires Node 24+, pnpm 11+, and PostgreSQL 17+, or Docker Compose. Copy `.env.example` to `.env` and set a unique `SESSION_SECRET` of at least 32 characters.

```bash
docker compose up --build
```

Open `http://localhost:3000`. `http://localhost:3001/health` and `/ready` expose health and database readiness. API docs are disabled in the production container unless `ENABLE_API_DOCS=true`.

The default stack runs migrations and creates **no demo account**. For an explicitly fictional local demo, run `docker compose --profile demo up --build`; the demo login is `alex@example.test` / `Demo-Only-Change-Me!`. Never use that profile on a public deployment. MinIO and Mailpit have separate `storage` and `development` profiles and are not required by the application.

For host-side development, point `DATABASE_URL` at localhost and run:

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm dev
```

Run `pnpm db:seed` only when you explicitly want fictional data.

## Verification

```bash
pnpm verify
pnpm test:e2e
pnpm test:smoke
pnpm audit --audit-level high
docker compose config --quiet
```

PostgreSQL integration tests run when `DATABASE_URL` is set; CI supplies it. Browser tests require installed Playwright engines and a database with the demo seed. The [verification report](docs/verification-report.md) records what actually ran in this workspace.

## Current boundaries

- Manual plan edits and mode-label changes do not re-run hard-constraint checks. They mark feasibility unknown in Today. Recovery and Survival affect the standalone generator only.
- The four Today capacity values are optional 0–100 self-ratings. They do not automatically populate the generator's eight-dimensional demand/capacity input.
- Goal viewing is the only implemented shared-resource read. Household membership alone never grants it; an explicit grant bound to that household and current membership are required. Migration 004 suspends legacy grants whose source household is ambiguous.
- Exports are expiring JSON held in PostgreSQL, not private S3 objects. The deletion grace period restricts sessions; account removal then removes dependent rows.
- The TypeScript evidence registry is the only runtime evidence source. The SQL evidence and recommendation tables do not provide a review or recommendation workflow.

Read the [implementation status](docs/implementation-status.md), [truth matrix](docs/audit-truth-matrix.md), and [architecture overview](docs/architecture/overview.md) before a public release. Scientific, legal, security, privacy, and accessibility review remain necessary.
