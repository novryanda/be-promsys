#!/bin/sh
set -e


echo "=== Starting BE-Fintech ==="
echo "DATABASE_URL=$DATABASE_URL"
export DATABASE_URL


# 1. DB_RESET (Destructive, runs first)
if [ "$DB_RESET" = "true" ]; then
  echo ">> [DANGER] Running prisma migrate reset --force..."
  # --skip-seed because we want to control seeding via DB_SEED
  npx prisma migrate reset --force
  echo ">> Reset completed."
fi

# 2. DB_PUSH (Schema sync without migration history)
if [ "$DB_PUSH" = "true" ]; then
  echo ">> Running prisma db push..."
  npx prisma db push --accept-data-loss
  echo ">> DB Push completed."
fi

# 3. DB_MIGRATE (Production migration)
if [ "$DB_MIGRATE" = "true" ]; then
  echo ">> Running prisma migrate deploy..."
  npx prisma migrate deploy
  echo ">> Migration completed."
fi

# 4. DB_SEED (Seeding)
if [ "$DB_SEED" = "true" ]; then
  echo ">> Running seed..."
  # Executing the compiled seed script
  node dist/scripts/seed-admin.js
  echo ">> Seed completed."
fi

echo "=== Starting application ==="
exec node dist/main
