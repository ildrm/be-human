# Docker operations

`docker compose up --build` starts PostgreSQL and Redis, runs migrations, then starts API, worker, and web after health gates. Fictional data is opt-in: use `docker compose --profile demo up --build` for a local demo. Add `--profile storage` for MinIO and `--profile development` for Mailpit. Never enable the demo profile on a public deployment.

Local defaults are convenience credentials only. Production must provide unique passwords, session secrets, TLS, managed storage, resource limits, log shipping, and encrypted volumes/backups. Images run as non-root users. Database ports are not published by default.
