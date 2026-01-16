#!/bin/bash
set -e

BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="nce_backup_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p ${BACKUP_DIR}

echo "Starting backup: ${FILENAME}..."

# Execute backup
pg_dump -h postgres -U ${PGUSER} ${PGDATABASE} | gzip > ${BACKUP_DIR}/${FILENAME}

if [ -f "${BACKUP_DIR}/${FILENAME}" ]; then
    echo "✅ Backup created successfully: ${FILENAME}"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Cleanup old backups (7 days retention)
echo "Cleaning up backups older than 7 days..."
find ${BACKUP_DIR} -name "nce_backup_*.sql.gz" -mtime +7 -delete
echo "Cleanup complete."
