# Docker operations

`docker compose up --build` starts PostgreSQL and Redis, runs migration and idempotent fictional seed jobs, then starts API and web after health gates. Add `--profile storage` for MinIO and `--profile development` for Mailpit.

Local defaults are convenience credentials only. Production must provide unique passwords, session secrets, TLS, managed storage, resource limits, log shipping, and encrypted volumes/backups. Images run as non-root users. Database ports are not published by default.
