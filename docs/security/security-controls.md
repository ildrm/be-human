# Security controls

- Fastify request-size limit and structured validation errors.
- Exact CORS origin with credentials; no wildcard credentials.
- Helmet headers, explicit frame denial, referrer and permissions policies.
- Parameterized PostgreSQL operations and constrained enums/checks.
- Opaque sessions, hashed at rest; cookies are not available to browser JavaScript.
- Correlation IDs accepted only with a conservative character/length allowlist.
- Non-root containers, minimal Alpine runtime, health checks, graceful Nest shutdown.
- Secrets and sensitive response values are excluded from logs and Git.
- CI includes audit, SBOM generation, and high/critical filesystem container scanning.

Before public deployment, add a nonce-based CSP, CSRF token for state changes, distributed rate limiting, secret rotation, KMS-backed encryption, dependency allowlisting, SAST/DAST, and an independent penetration test.
