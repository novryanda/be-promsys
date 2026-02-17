#!/bin/sh
set -e


echo "=== Starting BE-Fintech ==="
echo "DATABASE_URL=$DATABASE_URL"
export DATABASE_URL


# Run prisma migrate deploy if DB_MIGRATE=true
if [ "$DB_MIGRATE" = "true" ]; then
  echo ">> Running prisma migrate deploy..."
  echo ">> Running prisma migrate deploy with DATABASE_URL=$DATABASE_URL"
  echo ">> Listing prisma.config.ts:"
  ls -l prisma.config.ts
  echo ">> Contents of prisma.config.ts:"
  cat prisma.config.ts
  npx prisma migrate deploy --config=prisma.config.ts
  echo ">> Migration completed."
fi

# Run seed if DB_SEED=true
if [ "$DB_SEED" = "true" ]; then
  echo ">> Running seed..."
  node dist/scripts/seed-admin.js
  echo ">> Seed completed."
fi

echo "=== Starting application ==="
exec node dist/main
