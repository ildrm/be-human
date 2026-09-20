# Be Human — a life-fit operating system

Be Human is an evidence-governed planning application that fits plans to a person's actual capacity, commitments, accessibility needs, resources, and values. It does not compute a universal “life score.” Its primary output is a multidimensional Life Fit view and an explainable, editable plan.

This repository contains a deployable product slice: a Next.js 16 web app, NestJS 11 API, PostgreSQL database, durable background worker, versioned evidence registry, deterministic constraint planner, authentication and authorization, explicit household sharing, privacy workflows, and hardened multi-stage containers.

## Run with Docker

Prerequisite: Docker Desktop or Docker Engine with Compose.

1. Copy `.env.example` to `.env`.
2. Set `SESSION_SECRET` to at least 32 random characters and replace the database/object-storage development credentials before any public deployment.
3. Start the stack:

```bash
docker compose up --build
```

Open `http://localhost:3000`. Health and readiness are available at `http://localhost:3001/health` and `http://localhost:3001/ready`. OpenAPI is disabled in production by default; set `ENABLE_API_DOCS=true` only where exposing `http://localhost:3001/docs` is appropriate.

Migrations and the idempotent fictional seed run before the API becomes healthy. Demo sign-in: `alex@example.test` / `Demo-Only-Change-Me!`.

## Local development

Node 24 LTS+, pnpm 11+, and PostgreSQL 17+ are expected.

```bash
pnpm install --frozen-lockfile
pnpm db:migrate
pnpm db:seed
pnpm dev
```

For host-side development, point `DATABASE_URL` at `localhost` rather than the Compose service name `postgres`. Never reuse the demo credentials or local secrets in a deployed environment.

## Verification

```bash
pnpm verify
pnpm test:e2e
pnpm test:smoke
pnpm audit --audit-level high
docker compose config --quiet
docker compose up -d --build
```

The automated coverage includes 36 domain and scenario checks, API unit and PostgreSQL integration coverage, six browser journeys with automated accessibility checks, and an end-to-end HTTP smoke journey covering registration, CSRF enforcement, owned data, household creation, asynchronous export, logout, and session revocation. See `docs/testing/strategy.md` and `docs/implementation-status.md`.

## Architecture

The system is a modular monolith with separate web, API, and worker processes. The browser talks to a same-origin Next.js gateway, which keeps API topology and session cookies out of client configuration. The API owns policy, evidence applicability, authentication, authorization, recommendations, and persistence. PostgreSQL is the source of truth and also backs a transactional outbox; the worker claims jobs with `SKIP LOCKED`, retries with backoff, and records terminal failures. Redis is provisioned for future high-throughput coordination but is not the authoritative job store.

## Security and privacy

Sessions use opaque random tokens, keyed HMAC hashes at rest, secure/HTTP-only cookie controls, a separate CSRF cookie and header, expiry/revocation, global rate limiting, schema validation, log redaction, and production secret validation. Household membership never grants resource visibility: sharing is an explicit per-resource permission evaluated server-side. Exports expire after seven days; deletion uses a seven-day cancellation window and emits an audit receipt.

Terminate TLS at a trusted ingress, set `COOKIE_SECURE=true`, configure the exact `WEB_ORIGIN`, use managed encrypted stores, rotate secrets, and run backup/restore drills. See `docs/security/threat-model.md` and `docs/privacy/data-classification.md`.

## Safety and evidence limits

Be Human is planning software, not emergency, diagnostic, medical, legal, or financial advice. Population guidance never overrides a recorded professional restriction. Estimates are labelled, inputs carry confidence, and recommendations cite versioned sources. Licensed screeners are adapters only and are not bundled. Scientific, legal, accessibility, and security specialists must approve a regulated or clinical release; software tests cannot substitute for those reviews.

## Operations

SQL migrations under `database/migrations` are deterministic and transactional. Production should run them as a one-shot release job before rolling out the API. Backup and restore helpers are in `scripts/`; deployment-specific retention, encryption keys, observability, mail/object-storage credentials, and incident response remain operator responsibilities.

Troubleshooting:

- API not ready: inspect `docker compose logs migrate seed api postgres`.
- Web cannot reach API: verify `API_INTERNAL_URL=http://api:3001/api/v1` in Compose.
- Port conflict: change `WEB_PORT` or `API_PORT`, and update `WEB_ORIGIN` to match.
- Browser tests on a fresh CI host: install engines with `pnpm exec playwright install --with-deps`.

The precise shipped scope and remaining release gates are maintained in `docs/implementation-status.md`.
