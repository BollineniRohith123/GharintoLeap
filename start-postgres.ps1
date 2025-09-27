#!/usr/bin/env pwsh

# PostgreSQL Service Starter
# Run this as Administrator to start PostgreSQL service

Write-Host "🐘 POSTGRESQL SERVICE STARTER" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "💡 Right-click PowerShell and 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "Then run: .\start-postgres.ps1" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Running as Administrator" -ForegroundColor Green

# Try different PostgreSQL service names
$serviceNames = @(
    "postgresql-x64-16",
    "postgresql-16", 
    "PostgreSQL",
    "postgres"
)

$serviceStarted = $false

foreach ($serviceName in $serviceNames) {
    Write-Host "🔍 Checking service: $serviceName" -ForegroundColor Yellow
    
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    
    if ($service) {
        Write-Host "✅ Found service: $serviceName" -ForegroundColor Green
        Write-Host "📊 Current status: $($service.Status)" -ForegroundColor Cyan
        
        if ($service.Status -eq "Running") {
            Write-Host "🎉 PostgreSQL is already running!" -ForegroundColor Green
            $serviceStarted = $true
            break
        } else {
            Write-Host "🚀 Starting PostgreSQL service..." -ForegroundColor Yellow
            try {
                Start-Service -Name $serviceName
                Start-Sleep -Seconds 3
                
                $service = Get-Service -Name $serviceName
                if ($service.Status -eq "Running") {
                    Write-Host "✅ PostgreSQL started successfully!" -ForegroundColor Green
                    $serviceStarted = $true
                    break
                } else {
                    Write-Host "❌ Failed to start service: $serviceName" -ForegroundColor Red
                }
            } catch {
                Write-Host "❌ Error starting service: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Service not found: $serviceName" -ForegroundColor Yellow
    }
}

if ($serviceStarted) {
    Write-Host "`n🎯 PostgreSQL Connection Test" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    
    # Test connection
    Write-Host "🔌 Testing connection to PostgreSQL..." -ForegroundColor Yellow
    
    # Add PostgreSQL to PATH temporarily
    $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"
    
    try {
        $output = & psql -h localhost -U postgres -d postgres -c "SELECT version();" 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ PostgreSQL connection successful!" -ForegroundColor Green
            Write-Host "📊 Database server is ready" -ForegroundColor Cyan
            
            Write-Host "`n🗄️  Checking gharinto_db database..." -ForegroundColor Yellow
            $dbOutput = & psql -h localhost -U postgres -l 2>&1
            
            if ($dbOutput -match "gharinto_db") {
                Write-Host "✅ gharinto_db database exists" -ForegroundColor Green
            } else {
                Write-Host "⚠️  gharinto_db database not found" -ForegroundColor Yellow
                Write-Host "💡 Creating gharinto_db database..." -ForegroundColor Cyan
                
                $createDb = & createdb -h localhost -U postgres gharinto_db 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ gharinto_db database created successfully!" -ForegroundColor Green
                } else {
                    Write-Host "❌ Failed to create database: $createDb" -ForegroundColor Red
                }
            }
            
        } else {
            Write-Host "❌ PostgreSQL connection failed!" -ForegroundColor Red
            Write-Host "🔍 Output: $output" -ForegroundColor Yellow
            Write-Host "💡 Check if password is 'postgres' or needs to be reset" -ForegroundColor Cyan
        }
        
    } catch {
        Write-Host "❌ Error testing connection: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    Write-Host "`n🎯 Next Steps:" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "1️⃣  Test connection: node postgres-reset.js --test-connection" -ForegroundColor White
    Write-Host "2️⃣  Create users: node postgres-reset.js --create-users" -ForegroundColor White
    Write-Host "3️⃣  Start server: cd backend && npm start" -ForegroundColor White
    
} else {
    Write-Host "`n❌ Unable to start PostgreSQL service!" -ForegroundColor Red
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check if PostgreSQL is installed" -ForegroundColor White
    Write-Host "   2. Verify installation path: C:\Program Files\PostgreSQL\16\" -ForegroundColor White
    Write-Host "   3. Try manual start: services.msc -> PostgreSQL" -ForegroundColor White
    Write-Host "   4. Check Windows Event Viewer for errors" -ForegroundColor White
}

Write-Host "`n📱 Press Enter to continue..." -ForegroundColor Cyan
Read-Host