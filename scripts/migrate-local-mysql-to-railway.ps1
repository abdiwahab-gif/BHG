# Migrates a local MySQL database into Railway MySQL using mysql_config_editor login-paths.
#
# Prereqs:
# - MySQL client tools installed: mysql.exe, mysqldump.exe, mysql_config_editor.exe
# - Login paths configured:
#   - local: points at your local MySQL (e.g. 127.0.0.1:3306)
#   - railway: points at Railway public proxy host/port/user
#
# Usage examples:
#   ./scripts/migrate-local-mysql-to-railway.ps1
#   ./scripts/migrate-local-mysql-to-railway.ps1 -SourceDb academic_db -TargetDb railway
#   ./scripts/migrate-local-mysql-to-railway.ps1 -DumpFile "D:\academic_db_dump.sql"

[CmdletBinding()]
param(
  [string]$SourceDb = "academic_db",
  [string]$TargetDb = "railway",
  [string]$LocalLoginPath = "local",
  [string]$RailwayLoginPath = "railway",
  [string]$DumpFile = "D:\academic_db_dump.sql",
  [switch]$SkipDump
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "Required command not found on PATH: $name"
  }
}

function Test-LoginPath([string]$loginPath, [string]$db, [switch]$RequireSsl) {
  $sslArgs = @()
  if ($RequireSsl) { $sslArgs = @('--ssl-mode=REQUIRED') }

  & mysql "--login-path=$loginPath" @sslArgs $db -e "SELECT 1;" 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

function Invoke-MySqlWithStdinFile(
  [string]$loginPath,
  [string]$database,
  [string]$filePath,
  [switch]$RequireSsl
) {
  if (-not (Test-Path $filePath)) {
    throw "File not found: $filePath"
  }

  $mysqlExe = (Get-Command mysql -ErrorAction Stop).Source
  $sslArg = if ($RequireSsl) { '--ssl-mode=REQUIRED' } else { '' }
  $args = "--login-path=$loginPath $sslArg $database".Trim()

  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $mysqlExe
  $psi.Arguments = $args
  $psi.UseShellExecute = $false
  $psi.RedirectStandardInput = $true
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true

  $process = [System.Diagnostics.Process]::Start($psi)
  $fileStream = [System.IO.File]::OpenRead($filePath)
  try {
    $fileStream.CopyTo($process.StandardInput.BaseStream)
  } finally {
    $fileStream.Dispose()
    $process.StandardInput.Close()
  }

  $stdout = $process.StandardOutput.ReadToEnd()
  $stderr = $process.StandardError.ReadToEnd()
  $process.WaitForExit()

  if ($process.ExitCode -ne 0) {
    throw "mysql import failed (exit code $($process.ExitCode)): $stderr"
  }

  if ($stderr) {
    Write-Host $stderr -ForegroundColor Yellow
  }

  return $stdout
}

Write-Host "== Local -> Railway MySQL migration ==" -ForegroundColor Cyan

Require-Command mysql
Require-Command mysqldump
Require-Command mysql_config_editor

Write-Host "Checking login-path '$LocalLoginPath' (local)..." -ForegroundColor Gray
if (-not (Test-LoginPath -loginPath $LocalLoginPath -db $SourceDb)) {
  throw "Cannot connect using login-path '$LocalLoginPath' to database '$SourceDb'. Run: mysql --login-path=$LocalLoginPath -D $SourceDb -e 'SELECT 1;'"
}

Write-Host "Checking login-path '$RailwayLoginPath' (Railway)..." -ForegroundColor Gray
if (-not (Test-LoginPath -loginPath $RailwayLoginPath -db $TargetDb -RequireSsl)) {
  Write-Host "Cannot connect to Railway with login-path '$RailwayLoginPath'." -ForegroundColor Yellow
  Write-Host "Fix by resetting/confirming Railway credentials, then re-run:" -ForegroundColor Yellow
  Write-Host "  mysql_config_editor remove --login-path=$RailwayLoginPath" -ForegroundColor Yellow
  Write-Host "  mysql_config_editor set --login-path=$RailwayLoginPath --host=<host> --port=<port> --user=<user> --password" -ForegroundColor Yellow
  throw "Railway login-path connection failed (auth or host/port mismatch)."
}

if (-not $SkipDump) {
  Write-Host "Dumping '$SourceDb' to '$DumpFile'..." -ForegroundColor Cyan

  $dumpDir = Split-Path -Parent $DumpFile
  if ($dumpDir -and -not (Test-Path $dumpDir)) {
    New-Item -ItemType Directory -Path $dumpDir | Out-Null
  }

  # Use --result-file to avoid PowerShell redirection issues.
  & mysqldump "--login-path=$LocalLoginPath" `
    --single-transaction --quick --hex-blob `
    --no-tablespaces --column-statistics=0 --set-gtid-purged=OFF `
    --add-drop-table $SourceDb `
    --result-file="$DumpFile"

  if ($LASTEXITCODE -ne 0) {
    throw "mysqldump failed with exit code $LASTEXITCODE"
  }

  if (-not (Test-Path $DumpFile)) {
    throw "Dump file was not created: $DumpFile"
  }
}

Write-Host "Importing into Railway database '$TargetDb'..." -ForegroundColor Cyan
$dumpFilePath = $DumpFile

# Import by streaming the dump file into mysql.exe stdin (PowerShell 5.1 compatible).
Invoke-MySqlWithStdinFile -loginPath $RailwayLoginPath -database $TargetDb -filePath $dumpFilePath -RequireSsl | Out-Null

Write-Host "Running quick verification queries..." -ForegroundColor Cyan
& mysql "--login-path=$RailwayLoginPath" --ssl-mode=REQUIRED $TargetDb -e "SHOW TABLES; SELECT COUNT(*) AS users FROM users; SELECT COUNT(*) AS students FROM students;" 

Write-Host "Done." -ForegroundColor Green
