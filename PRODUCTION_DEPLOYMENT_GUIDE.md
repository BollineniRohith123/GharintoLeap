# Production Deployment Guide - Gharinto Leap

This guide provides step-by-step instructions for deploying the Gharinto Leap interior design platform to production.

## Prerequisites

### System Requirements
- **Server**: Ubuntu 20.04 LTS or higher
- **Node.js**: 18.x or higher
- **PostgreSQL**: 12.x or higher
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 50GB SSD
- **Network**: SSL certificate for HTTPS

### Required Services
- **Email Service**: SendGrid, AWS SES, or similar
- **File Storage**: AWS S3, Google Cloud Storage, or local storage
- **Monitoring**: Optional but recommended (DataDog, New Relic)

## Step 1: Server Setup

### 1.1 Update System
```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git build-essential
```

### 1.2 Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 1.3 Install PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 1.4 Install PM2 (Process Manager)
```bash
npm install -g pm2
```

## Step 2: Database Setup

### 2.1 Create Database User
```bash
sudo -u postgres psql
```

```sql
CREATE USER gharinto_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE gharinto_db OWNER gharinto_user;
GRANT ALL PRIVILEGES ON DATABASE gharinto_db TO gharinto_user;
\\q
```

### 2.2 Configure PostgreSQL
Edit `/etc/postgresql/12/main/postgresql.conf`:
```
listen_addresses = 'localhost'
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 1GB
```

Edit `/etc/postgresql/12/main/pg_hba.conf`:
```
local   gharinto_db     gharinto_user                   md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Step 3: Application Deployment

### 3.1 Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-org/gharinto-leap.git
sudo chown -R $USER:$USER gharinto-leap
cd gharinto-leap
```

### 3.2 Install Dependencies
```bash
cd backend
npm install --production
cd ../frontend
npm install
npm run build
```

### 3.3 Environment Configuration
Create `/opt/gharinto-leap/backend/.env`:
```env
# Database Configuration
DATABASE_URL=postgresql://gharinto_user:your_secure_password@localhost:5432/gharinto_db

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here

# Server Configuration
PORT=4000
NODE_ENV=production

# Email Configuration
EMAIL_SERVICE=sendgrid
EMAIL_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@gharinto.com

# File Upload Configuration
FILE_STORAGE_TYPE=local
FILE_STORAGE_PATH=/opt/gharinto-leap/uploads
MAX_FILE_SIZE=10485760

# External Services
REDIS_URL=redis://localhost:6379

# Monitoring
LOG_LEVEL=info
LOG_FILE=/var/log/gharinto-leap/app.log
```

### 3.4 Create Required Directories
```bash
sudo mkdir -p /opt/gharinto-leap/uploads
sudo mkdir -p /var/log/gharinto-leap
sudo chown -R $USER:$USER /opt/gharinto-leap/uploads
sudo chown -R $USER:$USER /var/log/gharinto-leap
```

## Step 4: Database Migration

### 4.1 Run Migrations
```bash
cd /opt/gharinto-leap/backend
# If using Encore.dev migration system
npx encore db migrate

# Or manually run migrations
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/001_create_core_tables.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/002_create_business_tables.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/003_insert_seed_data.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/004_add_missing_features.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/005_seed_menu_system.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/007_create_test_users.up.sql
psql -h localhost -U gharinto_user -d gharinto_db -f db/migrations/008_production_seed_data.up.sql
```

### 4.2 Verify Database Setup
```bash
psql -h localhost -U gharinto_user -d gharinto_db -c \"\\dt\"
```

## Step 5: SSL Configuration

### 5.1 Install Certbot
```bash
sudo apt install -y certbot
```

### 5.2 Obtain SSL Certificate
```bash
sudo certbot certonly --standalone -d your-domain.com -d api.your-domain.com
```

## Step 6: Nginx Configuration

### 6.1 Install Nginx
```bash
sudo apt install -y nginx
```

### 6.2 Configure Nginx
Create `/etc/nginx/sites-available/gharinto-leap`:
```nginx
server {
    listen 80;
    server_name your-domain.com api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection \"1; mode=block\";
    add_header Strict-Transport-Security \"max-age=31536000; includeSubDomains\";
    
    # API Backend
    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # File upload size
        client_max_body_size 10M;
    }
    
    # File uploads
    location /uploads/ {
        alias /opt/gharinto-leap/uploads/;
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    root /opt/gharinto-leap/frontend/dist;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control \"public, immutable\";
    }
}
```

### 6.3 Enable Site
```bash
sudo ln -s /etc/nginx/sites-available/gharinto-leap /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 7: Process Management with PM2

### 7.1 Create PM2 Ecosystem File
Create `/opt/gharinto-leap/ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'gharinto-api',
    script: './backend/dev-server.ts',
    cwd: '/opt/gharinto-leap',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: '/var/log/gharinto-leap/err.log',
    out_file: '/var/log/gharinto-leap/out.log',
    log_file: '/var/log/gharinto-leap/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
```

### 7.2 Start Application
```bash
cd /opt/gharinto-leap
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Step 8: Monitoring and Logging

### 8.1 Log Rotation
Create `/etc/logrotate.d/gharinto-leap`:
```
/var/log/gharinto-leap/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    copytruncate
}
```

### 8.2 Health Check Script
Create `/opt/gharinto-leap/health-check.sh`:
```bash
#!/bin/bash
HEALTH_URL=\"http://localhost:4000/health\"
STATUS=$(curl -s -o /dev/null -w \"%{http_code}\" $HEALTH_URL)

if [ $STATUS -eq 200 ]; then
    echo \"$(date): API is healthy\"
else
    echo \"$(date): API is down (Status: $STATUS)\"
    # Restart the application
    pm2 restart gharinto-api
    # Send alert email
    echo \"API health check failed at $(date)\" | mail -s \"Gharinto API Alert\" admin@your-domain.com
fi
```

Make it executable and add to cron:
```bash
chmod +x /opt/gharinto-leap/health-check.sh
crontab -e
# Add this line:
*/5 * * * * /opt/gharinto-leap/health-check.sh >> /var/log/gharinto-leap/health-check.log 2>&1
```

## Step 9: Backup Strategy

### 9.1 Database Backup Script
Create `/opt/gharinto-leap/backup-db.sh`:
```bash
#!/bin/bash
BACKUP_DIR=\"/opt/backups/gharinto\"
DATE=$(date +\"%Y%m%d_%H%M%S\")
BACKUP_FILE=\"$BACKUP_DIR/gharinto_db_$DATE.sql\"

mkdir -p $BACKUP_DIR

# Create database backup
pg_dump -h localhost -U gharinto_user gharinto_db > $BACKUP_FILE

# Compress backup
gzip $BACKUP_FILE

# Remove backups older than 30 days
find $BACKUP_DIR -name \"*.sql.gz\" -mtime +30 -delete

echo \"$(date): Database backup completed: $BACKUP_FILE.gz\"
```

### 9.2 File Backup Script
Create `/opt/gharinto-leap/backup-files.sh`:
```bash
#!/bin/bash
BACKUP_DIR=\"/opt/backups/gharinto\"
DATE=$(date +\"%Y%m%d_%H%M%S\")
FILE_BACKUP=\"$BACKUP_DIR/uploads_$DATE.tar.gz\"

mkdir -p $BACKUP_DIR

# Backup uploads directory
tar -czf $FILE_BACKUP -C /opt/gharinto-leap uploads/

# Remove file backups older than 7 days
find $BACKUP_DIR -name \"uploads_*.tar.gz\" -mtime +7 -delete

echo \"$(date): File backup completed: $FILE_BACKUP\"
```

### 9.3 Schedule Backups
```bash
crontab -e
# Add these lines:
0 2 * * * /opt/gharinto-leap/backup-db.sh >> /var/log/gharinto-leap/backup.log 2>&1
0 3 * * * /opt/gharinto-leap/backup-files.sh >> /var/log/gharinto-leap/backup.log 2>&1
```

## Step 10: Security Hardening

### 10.1 Firewall Configuration
```bash
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
```

### 10.2 Fail2Ban (Optional)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 10.3 Regular Security Updates
```bash
# Add to crontab
0 4 * * 1 apt update && apt upgrade -y && systemctl reboot
```

## Step 11: Testing Deployment

### 11.1 Run API Tests
```bash
cd /opt/gharinto-leap
node api-test-suite.js
```

### 11.2 Manual Testing
1. Visit `https://your-domain.com` - Should load frontend
2. Visit `https://api.your-domain.com/health` - Should return health status
3. Test login functionality
4. Test API endpoints
5. Test file uploads

## Step 12: Performance Optimization

### 12.1 Database Optimization
```sql
-- Connect to database and run:
ANALYZE;
REINDEX DATABASE gharinto_db;
```

### 12.2 Enable Gzip Compression
Add to Nginx configuration:
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_min_length 1000;
```

### 12.3 Connection Pooling
Update database configuration to use connection pooling in production.

## Maintenance

### Daily Tasks
- Monitor server resources
- Check application logs
- Verify backup completion

### Weekly Tasks
- Review security logs
- Update dependencies
- Performance monitoring

### Monthly Tasks
- Security audit
- Database optimization
- Server updates

## Troubleshooting

### Common Issues

1. **Application Won't Start**
   ```bash
   pm2 logs gharinto-api
   ```

2. **Database Connection Issues**
   ```bash
   sudo systemctl status postgresql
   psql -h localhost -U gharinto_user -d gharinto_db
   ```

3. **Nginx Issues**
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   tail -f /var/log/nginx/error.log
   ```

4. **SSL Certificate Issues**
   ```bash
   sudo certbot renew --dry-run
   ```

### Emergency Contacts
- **System Administrator**: admin@your-domain.com
- **Database Administrator**: dba@your-domain.com
- **Development Team**: dev@your-domain.com

## Rollback Procedure

In case of deployment issues:

1. **Stop Current Application**
   ```bash
   pm2 stop gharinto-api
   ```

2. **Restore Database**
   ```bash
   # Find latest backup
   ls -la /opt/backups/gharinto/
   # Restore
   gunzip -c /opt/backups/gharinto/gharinto_db_YYYYMMDD_HHMMSS.sql.gz | psql -h localhost -U gharinto_user gharinto_db
   ```

3. **Restore Application Code**
   ```bash
   git checkout previous-stable-tag
   npm install
   pm2 start ecosystem.config.js
   ```

This completes the production deployment guide for Gharinto Leap. The system is now ready for production use with proper monitoring, backup, and security measures in place.