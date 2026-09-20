param(
  [Parameter(Mandatory = $true)][string]$Destination
)
$ErrorActionPreference = 'Stop'
$resolvedParent = Resolve-Path -LiteralPath (Split-Path -Parent $Destination)
$safeName = [IO.Path]::GetFileName($Destination)
if ([string]::IsNullOrWhiteSpace($safeName)) { throw 'Destination must include a filename.' }
docker compose exec -T postgres pg_dump --format=custom --no-owner --username=be_human be_human | Set-Content -AsByteStream -LiteralPath (Join-Path $resolvedParent $safeName)
Write-Output "Encrypted storage and off-site retention must be configured by the deployment platform: $Destination"
