#!/bin/bash

# PostgreSQL Setup Script for Gharinto Leap
# This script sets up the PostgreSQL database with all necessary tables and data

set -e  # Exit on error

echo "🚀 Starting PostgreSQL Setup for Gharinto Leap"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="gharinto_dev"
DB_USER="postgres"
DB_PASSWORD="postgres"

echo -e "${BLUE}📊 Step 1: Creating database...${NC}"

# Create database if it doesn't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"

echo -e "${GREEN}✅ Database '$DB_NAME' ready${NC}"

echo -e "${BLUE}📊 Step 2: Setting up password for postgres user...${NC}"

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD '$DB_PASSWORD';"

echo -e "${GREEN}✅ Password set${NC}"

echo -e "${BLUE}📊 Step 3: Testing connection...${NC}"

# Test connection
PGPASSWORD=$DB_PASSWORD psql -h localhost -U $DB_USER -d $DB_NAME -c "SELECT version();" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Connection successful${NC}"
else
    echo -e "${RED}❌ Connection failed${NC}"
    exit 1
fi

echo ""
echo "================================================"
echo -e "${GREEN}🎉 PostgreSQL setup completed successfully!${NC}"
echo ""
echo "Database Details:"
echo "  Host: localhost"
echo "  Port: 5432"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo "Next steps:"
echo "  1. Run migrations: node run-migrations.cjs"
echo "  2. Seed data: node seed-postgres.cjs"
echo "  3. Start backend: cd backend && npm start"
echo ""

