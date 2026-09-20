# Troubleshooting

- Migration failure: inspect the first failing SQL statement; do not mark the migration applied manually.
- API readiness failure: verify PostgreSQL health and `DATABASE_URL`, then run `SELECT version FROM schema_migration`.
- Browser login failure: confirm API origin, TLS/cookie `Secure` setting, CORS exact origin, and host clock.
- Redis or object storage outage: core persisted planning must remain readable; pause optional jobs and report degraded integrations.
- Conflicting plan: this is a valid result. Show named constraints and alternatives; never force a schedule by deleting a hard constraint.
