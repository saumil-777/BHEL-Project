# SMIMP Database Setup Script for Windows
# Run this AFTER PostgreSQL is installed

$pgPath = "C:\Program Files\PostgreSQL\17\bin"
$env:PGPASSWORD = "postgres"

Write-Host "=== SMIMP Database Setup ===" -ForegroundColor Cyan

# Check if psql exists
if (-not (Test-Path "$pgPath\psql.exe")) {
    # Try version 16
    $pgPath = "C:\Program Files\PostgreSQL\16\bin"
    if (-not (Test-Path "$pgPath\psql.exe")) {
        Write-Host "ERROR: PostgreSQL not found at expected paths." -ForegroundColor Red
        Write-Host "Please ensure PostgreSQL is installed." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Found PostgreSQL at: $pgPath" -ForegroundColor Green

# Create the database user
Write-Host "`nCreating database user 'smimp_user'..." -ForegroundColor Yellow
& "$pgPath\psql.exe" -U postgres -c "CREATE USER smimp_user WITH PASSWORD 'smimp_pass';" 2>&1
Write-Host "  (Ignore 'already exists' errors - that's fine)" -ForegroundColor DarkGray

# Create the database
Write-Host "Creating database 'smimp_db'..." -ForegroundColor Yellow
& "$pgPath\psql.exe" -U postgres -c "CREATE DATABASE smimp_db OWNER smimp_user;" 2>&1
Write-Host "  (Ignore 'already exists' errors - that's fine)" -ForegroundColor DarkGray

# Grant privileges
Write-Host "Granting privileges..." -ForegroundColor Yellow
& "$pgPath\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE smimp_db TO smimp_user;" 2>&1
& "$pgPath\psql.exe" -U postgres -c "ALTER USER smimp_user CREATEDB;" 2>&1

# Test connection
Write-Host "`nTesting connection with smimp_user..." -ForegroundColor Yellow
$env:PGPASSWORD = "smimp_pass"
$result = & "$pgPath\psql.exe" -U smimp_user -d smimp_db -c "SELECT 'Connection OK' as status;" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database setup complete!" -ForegroundColor Green
    Write-Host "`nYou can now start the server with:" -ForegroundColor Cyan
    Write-Host "  cd server" -ForegroundColor White
    Write-Host "  npm run dev" -ForegroundColor White
} else {
    Write-Host "❌ Connection test failed. Output: $result" -ForegroundColor Red
    Write-Host "You may need to set a password for the postgres superuser." -ForegroundColor Yellow
    Write-Host "Run: & '$pgPath\psql.exe' -U postgres" -ForegroundColor White
}
