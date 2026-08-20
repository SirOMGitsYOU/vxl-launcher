$ErrorActionPreference = "Stop"

if (-not $env:VOXEL_NPM_TOKEN) {
  Write-Error "VOXEL_NPM_TOKEN is not set. Example: `$env:VOXEL_NPM_TOKEN = 'your-token'"
}

$npmrc = Join-Path $env:USERPROFILE ".npmrc"
$authLine = "//npm.voxelstudios.co.uk/:_authToken=$($env:VOXEL_NPM_TOKEN)"
$pattern = "^//npm\.voxelstudios\.co\.uk/:_authToken="

if (Test-Path $npmrc) {
  $lines = Get-Content $npmrc
  $updated = $false
  $lines = $lines | ForEach-Object {
    if ($_ -match $pattern) {
      $updated = $true
      $authLine
    } else {
      $_
    }
  }
  if (-not $updated) {
    $lines += $authLine
  }
  Set-Content -Path $npmrc -Value $lines
} else {
  Set-Content -Path $npmrc -Value $authLine
}

Write-Host "Configured Voxel npm auth in $npmrc"
