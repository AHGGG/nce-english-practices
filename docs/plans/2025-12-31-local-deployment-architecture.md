# Design Document: Local/Intranet Deployment Architecture

## Date: 2025-12-31

## Context

This project is a comprehensive English learning platform with multiple features:
- Tense practice with LLM generation
- Multi-dictionary support (MDX format)
- Scenario roleplay and voice practice (requires HTTPS)
- Reading mode with EPUB support
- Real-time voice conversation using Gemini Native Audio API

**Deployment Requirements**:
- Target: Local/Intranet server
- Protocol: HTTPS (required for voice features)
- Database: PostgreSQL (containerized)
- Reverse Proxy: Nginx
- Operational Features: Automated backup, health checks, log management

---

## Architecture Overview

### Directory Structure

```
nce-english-practices/
├── Dockerfile                    # Multi-stage build (React + FastAPI)
├── deploy/
│   ├── docker-compose.yml       # Service orchestration
│   ├── .env.example             # Environment variable template
│   ├── nginx/
│   │   ├── nginx.conf           # Reverse proxy configuration
│   │   └── ssl/                 # Certificate directory (.gitignore)
│   │       ├── cert.pem         # User-provided SSL certificate
│   │       └── key.pem          # User-provided private key
│   ├── postgres/
│   │   └── init.sql             # Optional initialization script
│   ├── scripts/
│   │   ├── deploy.sh            # One-command deployment
│   │   ├── backup.sh            # Database backup
│   │   ├── restore.sh           # Restore from backup
│   │   ├── logs.sh              # Log viewer
│   │   └── health-check.sh      # Health diagnostics
│   └── backups/                 # Backup storage (.gitignore)
└── resources/                    # **External mount (user-managed)**
    ├── dictionaries/             # MDX/MDD dictionary files
    └── epub/                     # EPUB e-book files
```

### Service Composition

**4 Docker Containers**:

1. **nginx** - HTTPS reverse proxy (443 → 8000)
2. **app** - FastAPI application (main service)
3. **postgres** - Database server
4. **backup-cron** - Scheduled backup tasks

### Data Persistence Strategy

| Volume/Mount | Type | Purpose | Backup |
|-------------|------|---------|--------|
| `postgres-data` | Named volume | PostgreSQL data | ✅ Daily |
| `app-backups` | Named volume | Backup files | Manual |
| `app-logs` | Named volume | Application logs | Rotation |
| `resources/` | Bind mount (ro) | Dictionaries + EPUB | User-managed |

**Key Decisions**:
- **resources/ mounted read-only**: Prevents containers from modifying static assets
- **Certificates not in image**: Users generate self-signed certs using existing `scripts/generate_cert.py`
- **No dictionary bundling**: Keeps Docker image lightweight (<500MB)

---

## Service Configuration

### 1. PostgreSQL Database

```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: ${DB_USER}
    POSTGRES_PASSWORD: ${DB_PASSWORD}
    POSTGRES_DB: ${DB_NAME}
  volumes:
    - postgres-data:/var/lib/postgresql/data
    - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

**Features**:
- Health check ensures database is ready before app starts
- Auto-restart on failure
- Initialization script for custom schema setup (optional)

### 2. FastAPI Application

```yaml
app:
  build:
    context: ..
    dockerfile: Dockerfile
  environment:
    DATABASE_URL: postgresql+asyncpg://${DB_USER}:${DB_PASSWORD}@postgres:5432/${DB_NAME}
    DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
    GEMINI_API_KEY: ${GEMINI_API_KEY}
    DASHSCOPE_API_KEY: ${DASHSCOPE_API_KEY}
  volumes:
    - ../resources:/app/resources:ro  # Read-only mount
    - app-logs:/app/logs
  depends_on:
    postgres:
      condition: service_healthy
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
  restart: unless-stopped
```

**Features**:
- Waits for PostgreSQL health check before starting
- Read-only access to dictionaries/EPUB files
- Persistent log storage

### 3. Nginx Reverse Proxy

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "443:443"
    - "80:80"  # Redirects to HTTPS
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    - ./nginx/ssl:/etc/nginx/ssl:ro
  depends_on:
    - app
  restart: unless-stopped
```

**nginx.conf Highlights**:

**HTTPS & Certificate**:
```nginx
server {
    listen 443 ssl http2;
    server_name _;  # Accept all domains/IPs (intranet)

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
}
```

**WebSocket Support** (critical for voice features):
```nginx
location /ws/ {
    proxy_pass http://app:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Long timeout for voice sessions
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

**API & Static Assets**:
```nginx
location /api/ {
    proxy_pass http://app:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # File upload limit (for audio files)
    client_max_body_size 50M;
}

location /dict-assets/ {
    proxy_pass http://app:8000;
    proxy_set_header Host $host;
}

location / {
    proxy_pass http://app:8000;
    proxy_set_header Host $host;
}
```

**HTTP → HTTPS Redirect**:
```nginx
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

**Security Headers**:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
```

### 4. Backup Cron Container

```yaml
backup-cron:
  image: postgres:16-alpine
  volumes:
    - ./backups:/backups
    - ./scripts/backup.sh:/backup.sh:ro
  environment:
    PGHOST: postgres
    PGUSER: ${DB_USER}
    PGPASSWORD: ${DB_PASSWORD}
    PGDATABASE: ${DB_NAME}
  entrypoint: |
    sh -c 'echo "0 2 * * * /backup.sh" | crontab - && crond -f'
  depends_on:
    - postgres
```

**Schedule**: Daily at 2:00 AM

---

## Deployment Scripts

### 1. deploy.sh - One-Command Deployment

**Workflow**:
```bash
1. Check prerequisites (Docker, certs, resources/, .env)
2. Build Docker image (multi-stage: React + FastAPI)
3. Start all services (docker compose up -d)
4. Wait for database readiness (pg_isready)
5. Run Alembic migrations (uv run alembic upgrade head)
6. Display service status and access URL
```

**Usage**:
```bash
cd deploy
./scripts/deploy.sh
# Output: ✅ Deployment complete! Visit https://192.168.1.100
```

### 2. backup.sh - Database Backup

**Features**:
- Uses `pg_dump` for hot backup (zero downtime)
- Compresses with gzip
- Automatic cleanup (keeps last 7 days)

**Implementation**:
```bash
#!/bin/bash
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="nce_backup_${TIMESTAMP}.sql.gz"

# Execute backup
pg_dump -h postgres -U ${PGUSER} ${PGDATABASE} | gzip > ${BACKUP_DIR}/${FILENAME}

# Cleanup old backups (7 days retention)
find ${BACKUP_DIR} -name "nce_backup_*.sql.gz" -mtime +7 -delete

echo "✅ Backup complete: ${FILENAME}"
```

**Automated via cron**: Daily at 2:00 AM via `backup-cron` container

### 3. restore.sh - Restore from Backup

**Usage**:
```bash
# List available backups
./scripts/restore.sh list

# Restore specific backup
./scripts/restore.sh nce_backup_20250101_020000.sql.gz
```

**Workflow**:
1. Stop app container (keep database running)
2. Drop existing database (with confirmation)
3. Restore from backup file
4. Restart app container
5. Verify restoration

### 4. logs.sh - Log Viewer

**Features**:
- Colorized output
- Filter by service
- Real-time follow mode

**Usage**:
```bash
# View all logs (last 50 lines)
./scripts/logs.sh

# Follow app logs in real-time
./scripts/logs.sh app -f

# View Nginx errors
./scripts/logs.sh nginx --tail=100
```

### 5. health-check.sh - System Diagnostics

**Checks**:
```
1. ✅ Docker container status (4/4 running)
2. ✅ PostgreSQL connection (latency: 2ms)
3. ✅ FastAPI health endpoint (200 OK)
4. ✅ HTTPS access (certificate valid: 365 days)
5. ⚠️  WebSocket (requires browser test)
6. ℹ️  Disk usage: 78% (warning threshold: 80%)
```

**Output**:
```bash
./scripts/health-check.sh

=== System Health Report ===
✅ All containers running
✅ Database responding (2ms)
✅ App responding (https://192.168.1.100)
⚠️  Disk usage: 78% (consider cleanup)
```

---

## Backup & Monitoring Strategy

### Automated Backup Schedule

| Retention | Frequency | Cleanup |
|-----------|-----------|---------|
| Last 7 days | Daily at 2:00 AM | Auto-delete after 7 days |

**Backup Contents**:
- ✅ PostgreSQL database (user data, sessions, progress)
- ✅ `.env` file (manual backup, contains API keys)
- ❌ Dictionaries (static, user-managed)
- ❌ EPUB files (static, user-managed)
- ❌ Docker images (rebuildable)

**Backup Verification**:
- Weekly integrity check (Sundays at 3:00 AM)
- Verifies gzip file can be decompressed
- Logs verification results

### Log Management

**Log Files**:
```
deploy/logs/
├── unified.log          # Frontend + Backend (via LogBridge)
├── app.log             # FastAPI application logs
├── nginx-access.log    # Nginx access logs
└── nginx-error.log     # Nginx error logs
```

**Log Rotation** (Docker native):
```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

**Persistence**:
- Logs persisted via volume to `deploy/logs/`
- Accessible via `logs.sh` script
- Ready for remote log aggregation (rsyslog, if needed)

### Health Monitoring

**1. Docker Native Health Checks**:
- **Postgres**: `pg_isready` every 10s
- **App**: `curl /health` every 30s
- **Nginx**: TCP port check

**2. Manual Diagnostics**:
- `health-check.sh` provides full system status
- Recommended: Run daily via cron
- Can integrate with alerting (email, webhook)

**3. Alerting (Optional Extension)**:
- `health-check.sh` output can pipe to enterprise chat (WeChat/DingTalk)
- Cron can email reports on failure
- Prometheus `/metrics` endpoint reserved for future integration

### Disaster Recovery

**Recovery Time Objective (RTO)**:
- Full outage → Service restored: **< 10 minutes**
- Data corruption → Latest backup restored: **< 5 minutes**

**Recovery Procedure**:
```bash
# Step 1: Stop services
docker compose down

# Step 2: Restore backup
./scripts/restore.sh nce_backup_20250101_020000.sql.gz

# Step 3: Redeploy
./scripts/deploy.sh

# Total time: ~5-10 minutes
```

**Data Loss Prevention**:
- Daily backups (maximum 24-hour data loss)
- PostgreSQL WAL logs (point-in-time recovery, manual config)
- Resource files safe via bind mount (never lost)

---

## Pre-Deployment Checklist

Before running `./scripts/deploy.sh`, ensure:

1. ✅ **SSL Certificates Generated**:
   ```bash
   cd scripts
   uv run python generate_cert.py
   cp cert.pem key.pem ../deploy/nginx/ssl/
   ```

2. ✅ **Resource Files Placed**:
   ```bash
   # Dictionaries
   ls resources/dictionaries/*.mdx  # Should show files

   # EPUB files
   ls resources/epub/*.epub  # Should show files
   ```

3. ✅ **Environment Variables Configured**:
   ```bash
   cd deploy
   cp .env.example .env
   nano .env  # Fill in API keys
   ```

4. ✅ **Docker & Docker Compose Installed**:
   ```bash
   docker --version  # >= 20.10
   docker compose version  # >= 2.0
   ```

5. ✅ **PostgreSQL Test Database Available** (for local testing):
   ```bash
   # Only needed for running tests locally before deployment
   createdb nce_practice_test
   ```

---

## Post-Deployment Verification

After deployment:

1. **Check Container Status**:
   ```bash
   docker compose ps
   # All services should be "Up (healthy)"
   ```

2. **Test HTTPS Access**:
   ```bash
   curl -k https://localhost/health
   # Should return: {"status": "ok"}
   ```

3. **Verify WebSocket** (requires browser):
   - Open DevTools → Network → WS filter
   - Navigate to Voice Practice page
   - Check for successful WebSocket connection to `wss://your-ip/ws/voice`

4. **Test Database Connection**:
   ```bash
   docker compose exec postgres psql -U ${DB_USER} -d ${DB_NAME} -c "SELECT 1;"
   # Should return: 1
   ```

5. **Verify Backup**:
   ```bash
   ls deploy/backups/
   # Should show initial backup file after first 2:00 AM run
   ```

---

## Maintenance Operations

### Updating Application Code

```bash
# Pull latest code
git pull origin master

# Rebuild and redeploy
cd deploy
docker compose down
docker compose build --no-cache
docker compose up -d

# Run migrations if schema changed
docker compose exec app uv run alembic upgrade head
```

### Adding New Dictionaries

```bash
# Copy new MDX/MDD files to resources/
cp new_dictionary.mdx resources/dictionaries/

# No restart needed - app scans directory on demand
```

### Rotating SSL Certificates

```bash
# Generate new certificate
uv run python scripts/generate_cert.py

# Replace old certificates
cp cert.pem key.pem deploy/nginx/ssl/

# Reload Nginx (zero downtime)
docker compose exec nginx nginx -s reload
```

### Manual Backup

```bash
# Trigger immediate backup
docker compose exec backup-cron /backup.sh

# Verify backup created
ls deploy/backups/
```

---

## Security Considerations

1. **Self-Signed Certificates**: Users must accept browser warning on first visit
2. **API Keys**: Never commit `.env` file to git (already in `.gitignore`)
3. **Database Password**: Use strong passwords in production
4. **Network Isolation**: Containers communicate via internal Docker network
5. **Read-Only Mounts**: Resources directory mounted read-only to prevent tampering
6. **File Upload Limits**: Nginx restricts uploads to 50MB (protects against DoS)

---

## Future Enhancements (Not in Scope)

- **Monitoring Dashboard**: Prometheus + Grafana for metrics visualization
- **Automated Certificate Renewal**: Let's Encrypt integration (requires public domain)
- **Horizontal Scaling**: Load balancing across multiple app instances
- **Remote Backup**: Automatic sync to S3/MinIO
- **Blue-Green Deployment**: Zero-downtime updates with duplicate stacks

---

## References

- **Project Documentation**: `/CLAUDE.md`
- **SSL Certificate Script**: `/scripts/generate_cert.py`
- **Existing Dockerfile**: `/Dockerfile`
- **Database Migrations**: `/alembic/`
- **Log Bridge Architecture**: `app/services/log_collector.py` + `frontend/src/utils/logBridge.js`

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-31 | Claude Code | Initial design document |
