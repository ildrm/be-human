# Backup strategy

Run `scripts/backup.ps1 -Destination <absolute-backup-file>` on a trusted operator host. Store the custom-format dump encrypted in immutable off-site storage with tested retention. Back up private object storage using provider versioning/replication. Keep KMS keys, database backups, and application secrets in separate failure domains; document key-loss consequences.

Use `scripts/restore-verify.ps1 -Backup <file>` regularly. It restores into an isolated `be_human_restore_verify` database, validates migrations, then removes the verification database. Production exercises must also check row counts, ownership isolation, object references, RPO/RTO, and application startup against the restored copy.
