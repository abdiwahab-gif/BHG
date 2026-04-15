#!/usr/bin/env pwsh

# Integration Test Setup Script
# Validates and sets up MySQL database for local integration testing

param(
    [string]$MySqlUser = "root",
    [string]$MySqlPassword = "",
    [string]$MySqlHost = "localhost",
    [int]$MySqlPort = 3306,
    [string]$DbName = "academic_db"
)

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     MySQL Integration Test Setup                           ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check MySQL CLI availability
Write-Host "[1/6] Checking MySQL CLI..." -ForegroundColor Yellow
$mysqlExists = $null -ne (Get-Command mysql -ErrorAction SilentlyContinue)

if (-not $mysqlExists) {
    Write-Host "❌ ERROR: MySQL CLI not found in PATH" -ForegroundColor Red
    Write-Host "   Download from: https://dev.mysql.com/downloads/mysql/" -ForegroundColor Gray
    Write-Host "   Or install via: choco install mysql" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ MySQL CLI found" -ForegroundColor Green

# Step 2: Test MySQL connection
Write-Host "[2/6] Testing MySQL connection..." -ForegroundColor Yellow

$passwordArg = if ($MySqlPassword) { "-p`"$MySqlPassword`"" } else { "" }

try {
    $cmd = "mysql -h $MySqlHost -P $MySqlPort -u $MySqlUser $passwordArg -e `"SELECT 1`""
    Invoke-Expression $cmd | Out-Null
    Write-Host "✅ MySQL server is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Cannot connect to MySQL" -ForegroundColor Red
    Write-Host "   Make sure MySQL is running: net start MySQL80" -ForegroundColor Gray
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}

# Step 3: Create database
Write-Host "[3/6] Creating database '$DbName'..." -ForegroundColor Yellow

$createDbSql = "CREATE DATABASE IF NOT EXISTS $DbName;"

try {
    $cmd = "mysql -h $MySqlHost -P $MySqlPort -u $MySqlUser $passwordArg -e `"$createDbSql`""
    Invoke-Expression $cmd | Out-Null
    Write-Host "✅ Database created" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to create database" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}

# Step 4: Create users table
Write-Host "[4/6] Creating 'users' table..." -ForegroundColor Yellow

$schemaPath = Join-Path (Get-Location) "schema.sql"

# Create schema.sql file if it doesn't exist
if (-not (Test-Path $schemaPath)) {
    Write-Host "   Creating schema.sql..." -ForegroundColor Gray
    
    $schema = @"
USE $DbName;

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'student',
  isActive BOOLEAN DEFAULT true,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);
"@
    Set-Content -Path $schemaPath -Value $schema
}

try {
    $cmd = "mysql -h $MySqlHost -P $MySqlPort -u $MySqlUser $passwordArg < `"$schemaPath`""
    Invoke-Expression $cmd | Out-Null
    Write-Host "✅ Table schema created" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to create table" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}

# Step 5: Create .env.local if it doesn't exist
Write-Host "[5/6] Setting up environment configuration..." -ForegroundColor Yellow

$envLocalPath = Join-Path (Get-Location) ".env.local"

if (Test-Path $envLocalPath) {
    Write-Host "   .env.local already exists (skipping)" -ForegroundColor Gray
} else {
    Write-Host "   Creating .env.local..." -ForegroundColor Gray
    
    $envContent = @"
# App
NEXT_PUBLIC_API_URL=http://localhost:3000

# JWT Secret (change in production!)
JWT_SECRET=integration-test-secret-change-in-production

# MySQL Connection Details
DB_HOST=$MySqlHost
DB_PORT=$MySqlPort
DB_USER=$MySqlUser
DB_PASSWORD=$MySqlPassword
DB_NAME=$DbName
DB_SSL=false

# Integration Tests
RUN_DB_INTEGRATION_TESTS=true
"@
    Set-Content -Path $envLocalPath -Value $envContent
    Write-Host "✅ .env.local created" -ForegroundColor Green
}

# Step 6: Verify setup
Write-Host "[6/6] Verifying setup..." -ForegroundColor Yellow

try {
    $cmd = "mysql -h $MySqlHost -P $MySqlPort -u $MySqlUser $passwordArg -D $DbName -e `"DESCRIBE users;`""
    Invoke-Expression $cmd | Out-Null
    Write-Host "✅ Database schema verified" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Schema verification failed" -ForegroundColor Red
    Write-Host "   Error: $_" -ForegroundColor Gray
    exit 1
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ Setup Complete!                                         ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. npm run test:integration    # Run integration tests" -ForegroundColor Gray
Write-Host "  2. npm run dev                 # Start dev server" -ForegroundColor Gray
Write-Host "  3. See INTEGRATION_TEST_GUIDE.md for manual testing" -ForegroundColor Gray
Write-Host ""

Write-Host "Configuration:" -ForegroundColor Cyan
Write-Host "  MySQL Host: $MySqlHost" -ForegroundColor Gray
Write-Host "  MySQL Port: $MySqlPort" -ForegroundColor Gray
Write-Host "  MySQL User: $MySqlUser" -ForegroundColor Gray
Write-Host "  Database: $DbName" -ForegroundColor Gray
Write-Host "  Env File: $envLocalPath" -ForegroundColor Gray
Write-Host ""
