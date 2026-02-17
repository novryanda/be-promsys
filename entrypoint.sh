#!/bin/sh
set -e


echo "=== Starting BE-Fintech ==="
echo "DATABASE_URL=$DATABASE_URL"
export DATABASE_URL

# Run prisma db push if DB_PUSH=true
if [ "$DB_PUSH" = "true" ]; then
  echo ">> Running prisma db push..."
  echo ">> Running prisma db push with DATABASE_URL=$DATABASE_URL"
  npx prisma db push --schema=prisma/schema.prisma
  echo ">> DB push completed."
fi

# Run prisma migrate deploy if DB_MIGRATE=true
if [ "$DB_MIGRATE" = "true" ]; then
  echo ">> Running prisma migrate deploy..."
  echo ">> Running prisma migrate deploy with DATABASE_URL=$DATABASE_URL"
  npx prisma migrate deploy --schema=prisma/schema.prisma
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
