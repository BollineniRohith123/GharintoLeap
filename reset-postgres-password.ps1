<#
PostgreSQL Password Reset Script (ASCII-only)
Run this as Administrator.

This script will:
 - backup pg_hba.conf
 - set local connections to trust temporarily
 - restart PostgreSQL
 - set the postgres user password to '1234'
 - restore pg_hba.conf to scram-sha-256
 - restart PostgreSQL and test connection
#>

Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  PostgreSQL Password Reset for Gharinto Leap" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[WARNING] This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Navigate to this directory" -ForegroundColor Yellow
    Write-Host "4. Run: .\reset-postgres-password.ps1" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green
Write-Host ""

# PostgreSQL paths
$pgBinPath = "C:\Program Files\PostgreSQL\16\bin"
$pgDataPath = "C:\Program Files\PostgreSQL\16\data"
$pgHbaPath = "$pgDataPath\pg_hba.conf"

# Check if PostgreSQL is installed
if (-not (Test-Path $pgBinPath)) {
    Write-Host "PostgreSQL not found at $pgBinPath" -ForegroundColor Red
    Write-Host "Please install PostgreSQL 16 or update the path in this script" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "PostgreSQL found at: $pgBinPath" -ForegroundColor Green
Write-Host ""

# Add PostgreSQL to PATH for this session
$env:PATH += ";$pgBinPath"

Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 1: Backup pg_hba.conf" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pgHbaPath) {
    $backupPath = "$pgHbaPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $pgHbaPath $backupPath
    Write-Host "Backed up to: $backupPath" -ForegroundColor Green
} else {
    Write-Host "pg_hba.conf not found at $pgHbaPath" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 2: Modify pg_hba.conf for Trust Authentication" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pgHbaPath) {
    $content = Get-Content $pgHbaPath
    $newContent = $content -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+\w+', 'host    all             all             127.0.0.1/32            trust'
    $newContent = $newContent -replace 'host\s+all\s+all\s+::1/128\s+\w+', 'host    all             all             ::1/128                 trust'
    $newContent | Set-Content $pgHbaPath
    Write-Host "Modified pg_hba.conf to use trust authentication" -ForegroundColor Green
} else {
    Write-Host "Could not modify pg_hba.conf" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 3: Restart PostgreSQL Service" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Stopping PostgreSQL..." -ForegroundColor Yellow
    Stop-Service -Name "postgresql-x64-16" -Force
    Start-Sleep -Seconds 2
    
    Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
    Start-Service -Name "postgresql-x64-16"
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name "postgresql-x64-16"
    if ($service.Status -eq "Running") {
        Write-Host "PostgreSQL restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "Warning: PostgreSQL may not have started correctly" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error restarting PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 4: Set PostgreSQL Password" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setting password to '1234'..." -ForegroundColor Yellow
$sqlCommand = "ALTER USER postgres WITH PASSWORD '1234';"

try {
    $result = & psql -U postgres -h localhost -d postgres -c $sqlCommand 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Password set successfully!" -ForegroundColor Green
    } else {
        Write-Host "Password command executed with warnings: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error setting password: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 5: Restore pg_hba.conf Security" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $pgHbaPath) {
    $content = Get-Content $pgHbaPath
    $newContent = $content -replace 'host\s+all\s+all\s+127\.0\.0\.1/32\s+trust', 'host    all             all             127.0.0.1/32            scram-sha-256'
    $newContent = $newContent -replace 'host\s+all\s+all\s+::1/128\s+trust', 'host    all             all             ::1/128                 scram-sha-256'
    $newContent | Set-Content $pgHbaPath
    Write-Host "Restored pg_hba.conf to use scram-sha-256 authentication" -ForegroundColor Green
} else {
    Write-Host "Could not restore pg_hba.conf" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Step 6: Final Restart" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "Restarting PostgreSQL with new configuration..." -ForegroundColor Yellow
    Restart-Service -Name "postgresql-x64-16" -Force
    Start-Sleep -Seconds 3
    
    $service = Get-Service -Name "postgresql-x64-16"
    if ($service.Status -eq "Running") {
        Write-Host "PostgreSQL is running" -ForegroundColor Green
    }
} catch {
    Write-Host "Error restarting PostgreSQL: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Testing Connection" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = "1234"
try {
    $result = & psql -U postgres -h localhost -d postgres -c "SELECT version();" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Connection test successful!" -ForegroundColor Green
        Write-Host ""
        Write-Host "PostgreSQL is now configured with:" -ForegroundColor Green
        Write-Host "  User: postgres" -ForegroundColor White
        Write-Host "  Password: 1234" -ForegroundColor White
        Write-Host "  Host: localhost" -ForegroundColor White
        Write-Host "  Port: 5432" -ForegroundColor White
    } else {
        Write-Host "Connection test failed: $result" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Connection test error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  Next Steps" -ForegroundColor Cyan
Write-Host "-----------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Run database setup:" -ForegroundColor Yellow
Write-Host "   node setup-postgres-complete.cjs" -ForegroundColor White
Write-Host ""
Write-Host "2. Start the backend server:" -ForegroundColor Yellow
Write-Host "   cd backend" -ForegroundColor White
Write-Host "   node server.js" -ForegroundColor White
Write-Host ""
Write-Host "3. Start the frontend:" -ForegroundColor Yellow
Write-Host "   cd frontend" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"

