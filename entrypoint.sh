#!/bin/sh
set -e

echo "=== Starting BE-Fintech ==="

# Run prisma db push if DB_PUSH=true
if [ "$DB_PUSH" = "true" ]; then
  echo ">> Running prisma db push..."
  npx prisma db push
  echo ">> DB push completed."
fi

# Run prisma migrate deploy if DB_MIGRATE=true
if [ "$DB_MIGRATE" = "true" ]; then
  echo ">> Running prisma migrate deploy..."
  npx prisma migrate deploy
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
