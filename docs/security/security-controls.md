# Security controls

- Fastify request-size limit and structured validation errors.
- Exact CORS origin with credentials; no wildcard credentials.
- Helmet headers, explicit frame denial, referrer and permissions policies.
- Parameterized PostgreSQL operations and constrained enums/checks.
- Opaque sessions, HMAC-hashed at rest. The session cookie is HttpOnly; the CSRF cookie is intentionally readable by browser JavaScript for the double-submit check.
- Correlation IDs accepted only with a conservative character/length allowlist.
- API responses use `Cache-Control: no-store`; the same-origin web gateway forwards that header.
- Non-root containers, minimal Alpine runtime, health checks, graceful Nest shutdown.
- Secrets and sensitive response values are excluded from logs and Git.
- CI includes audit, SBOM generation, and high/critical filesystem container scanning.

Authenticated state changes have a CSRF cookie/header check. Before public deployment, add a nonce-based CSP, distributed rate limiting, token-key rotation, KMS-backed encryption, dependency allowlisting, SAST/DAST, and an independent penetration test. Pending-deletion sessions permit only account and privacy review, cancellation, and logout during the grace period.
