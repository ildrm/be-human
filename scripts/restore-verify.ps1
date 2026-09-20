param(
  [Parameter(Mandatory = $true)][string]$Backup
)
$ErrorActionPreference = 'Stop'
$resolved = Resolve-Path -LiteralPath $Backup
docker compose exec -T postgres dropdb --if-exists --username=be_human be_human_restore_verify
docker compose exec -T postgres createdb --username=be_human be_human_restore_verify
Get-Content -AsByteStream -Raw -LiteralPath $resolved | docker compose exec -T postgres pg_restore --no-owner --username=be_human --dbname=be_human_restore_verify
docker compose exec -T postgres psql --username=be_human --dbname=be_human_restore_verify --command "SELECT count(*) AS migration_count FROM schema_migration;"
docker compose exec -T postgres dropdb --username=be_human be_human_restore_verify
Write-Output 'Restore verification completed in an isolated temporary database.'
