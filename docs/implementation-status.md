# Implementation status

## Shipped and verified

- Responsive Next.js application with public landing and onboarding, sign-in/registration, authenticated Today, persistent goals, privacy/export/deletion controls, and household invitation/sharing screens.
- NestJS/Fastify API with validation, readiness, controlled OpenAPI exposure, correlation IDs, redacted logs, security headers, rate limiting, Argon2id credentials, opaque sessions, keyed session hashes, CSRF protection, revocation, and strict production configuration checks.
- PostgreSQL persistence for identity, consent, profile/context, goals, plans, capacity, wellbeing, evidence, recommendations, audit, privacy requests, households, invitations, explicit resource grants, and a durable job outbox.
- Transactional plan persistence, optimistic goal concurrency, owner isolation, append-only audit records, seven-day deletion grace, expiring exports, deletion receipts, idempotent worker claims, retry backoff, and dead-job handling.
- Versioned evidence registry and deterministic, non-compensatory planner with timezone/DST-safe calculations and required high-stress, shift-work, disability, faith, financial, co-parenting, recovery, and impossible-schedule scenarios.
- Multi-stage non-root containers, ordered migration/seed dependencies, health checks, persistent services, same-origin API gateway, CI, backup/restore helpers, and governance/architecture/security/privacy documentation.
- Automated verification: 36 domain/scenario tests, 12 API tests including live PostgreSQL authorization boundaries, 6 Playwright journeys with axe accessibility scans and keyboard/mobile coverage, a full HTTP smoke journey including the worker, production builds, dependency audit, and a successful complete Compose boot.

## Intentionally not claimed

The 118-section source vision is a multi-release sensitive-data program, not a single feature checklist that code alone can certify. The repository does not claim clinical, medical-device, legal, financial, child-safety, or jurisdictional approval. Those releases require qualified human review, current evidence adjudication, policy decisions, deployment-specific threat modeling, and operational exercises.

Product areas still outside this slice include MFA/passkeys and account recovery, full calendar drag/drop and conflict UI, file uploads and malware scanning, live external calendar/wearable/finance integrations, outbound email/push delivery, a scientific-review administration console, licensed assessment content, advanced sleep/SRI and ergonomics models, Monte Carlo and N-of-1 analysis, AI/RAG, offline synchronization, full localization/RTL coverage, and jurisdiction-specific child/custody flows.

## Release gates for a public deployment

- Independent security review, container/SBOM scanning, penetration testing, secret rotation, and abuse/rate-limit tuning.
- Measured load and soak tests against the chosen infrastructure, plus alerts/SLOs and capacity budgets.
- Encrypted backup restore and disaster-recovery drills with evidence of RPO/RTO.
- WCAG audit with assistive-technology users and representative disability testing.
- Legal/privacy review for each operating jurisdiction and scientific review of every evidence record and safety rule.
- Production infrastructure configuration for TLS, managed stores, mail/object storage, monitoring, incident response, retention, and support ownership.
