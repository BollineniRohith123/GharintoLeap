#!/usr/bin/env pwsh

# PostgreSQL Service Starter (PowerShell v5 compatible)
# Run this as Administrator to start PostgreSQL service

Write-Host "POSTGRESQL SERVICE STARTER"
Write-Host "========================================="

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script requires Administrator privileges!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and 'Run as Administrator'"
    Write-Host "Then run: .\start-postgres.ps1"
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Running as Administrator" -ForegroundColor Green

# Try different PostgreSQL service names
$serviceNames = @(
    "postgresql-x64-16",
    "postgresql-16",
    "PostgreSQL",
    "postgres"
)

$serviceStarted = $false

foreach ($serviceName in $serviceNames) {
    Write-Host "Checking service: $serviceName"
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue

    if ($service) {
        Write-Host "Found service: $serviceName"
        Write-Host "Current status: $($service.Status)"

        if ($service.Status -eq "Running") {
            Write-Host "PostgreSQL is already running"
            $serviceStarted = $true
            break
        } else {
            Write-Host "Starting PostgreSQL service..."
            try {
                Start-Service -Name $serviceName
                Start-Sleep -Seconds 3

                $service = Get-Service -Name $serviceName
                if ($service.Status -eq "Running") {
                    Write-Host "PostgreSQL started successfully"
                    $serviceStarted = $true
                    break
                } else {
                    Write-Host "Failed to start service: $serviceName" -ForegroundColor Red
                }
            } catch {
                Write-Host "Error starting service: $($_.Exception.Message)" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "Service not found: $serviceName"
    }
}

if ($serviceStarted) {
    Write-Host "`nPostgreSQL Connection Test"
    Write-Host "========================================="

    # Test connection
    Write-Host "Testing connection to PostgreSQL..."

    # Add PostgreSQL to PATH temporarily (common install path)
    $env:PATH += ";C:\Program Files\PostgreSQL\16\bin"

    try {
        $output = & psql -h localhost -U postgres -d postgres -c "SELECT version();" 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "PostgreSQL connection successful" -ForegroundColor Green
            Write-Host "Database server is ready"

            Write-Host "`nChecking gharinto_db database..."
            $dbOutput = & psql -h localhost -U postgres -l 2>&1

            # Ensure both gharinto_db and gharinto_dev exist (some components expect one or the other)
            $neededDbs = @('gharinto_db','gharinto_dev')
            foreach ($dbName in $neededDbs) {
                if ($dbOutput -match $dbName) {
                    Write-Host "$dbName database exists" -ForegroundColor Green
                } else {
                    Write-Host "$dbName database not found"
                    Write-Host "Creating $dbName database..."

                    $createDb = & createdb -h localhost -U postgres $dbName 2>&1
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "$dbName database created successfully" -ForegroundColor Green
                    } else {
                        Write-Host "Failed to create database $dbName: $createDb" -ForegroundColor Red
                    }
                }
            }

        } else {
            Write-Host "PostgreSQL connection failed" -ForegroundColor Red
            Write-Host "Output: $output"
            Write-Host "Check if the postgres user/password is set or needs to be reset"
        }

    } catch {
        Write-Host "Error testing connection: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host "`nNext Steps:"
    Write-Host "1) Test connection: node postgres-reset.js --test-connection"
    Write-Host "2) Create users: node postgres-reset.js --create-users"
    Write-Host "3) Start server: cd backend && npm start"

} else {
    Write-Host "`nUnable to start PostgreSQL service" -ForegroundColor Red
    Write-Host "Troubleshooting:"
    Write-Host "  1) Check if PostgreSQL is installed"
    Write-Host "  2) Verify installation path: C:\\Program Files\\PostgreSQL\\16\\"
    Write-Host "  3) Try manual start: services.msc -> PostgreSQL"
    Write-Host "  4) Check Windows Event Viewer for errors"
}

Write-Host "`nPress Enter to continue..."
Read-Host