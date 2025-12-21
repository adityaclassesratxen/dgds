#!/bin/bash
# Run migration on Neon DB and then trigger Render redeploy

set -e

echo "🚀 Running tenant migration on Neon DB..."

# Ensure DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not set. Please export it or run from Render environment."
    exit 1
fi

# Run migration
cd backend
python migrate_tenant.py

echo "✅ Migration completed. Triggering Render redeploy..."
# You can trigger Render redeploy via API or just push a dummy commit
# For now, we'll make a tiny change to force redeploy
echo "# Migration completed on $(date)" >> MIGRATION_LOG.md
git add MIGRATION_LOG.md
git commit -m "Log: Tenant migration completed"
git push dgds main

echo "🎉 All done! Render will redeploy with the migration applied."
