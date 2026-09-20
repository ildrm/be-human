# Deployment

The Compose topology is appropriate for local and production-like validation. Production should use separate immutable web/API images, a one-shot migration job, managed PostgreSQL, managed Redis, private object storage, TLS ingress, secret management, and encrypted backups.

API and web containers run as non-root users and expose health checks. Dependencies are health-gated; no blind readiness sleeps are used. Scale API replicas only after session and rate-limit stores are shared. Worker processes should scale independently by queue and remain idempotent.
