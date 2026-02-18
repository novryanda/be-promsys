#!/bin/sh
set -e

echo "============================================"
echo "🚀 Booting BE-Fintech Container"
echo "============================================"
echo "📝 Environment: NODE_ENV=${NODE_ENV:-production}"
echo "📝 DB Reset Mode: ${DB_RESET_MODE:-migrate}"
echo "📝 Skip Prisma Generate: ${SKIP_PRISMA_GENERATE:-false}"
echo "📝 Skip DB Migration: ${SKIP_DB_MIGRATION:-false}"
echo "📝 Skip DB Seed: ${SKIP_DB_SEED:-false}"
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is not set."
  exit 1
fi

echo "✅ DATABASE_URL is configured"
echo ""

if [ "$DB_RESET_MODE" = "reset" ]; then
  echo "============================================"
  echo "💥 DATABASE RESET MODE (DESTRUCTIVE)"
  echo "============================================"
  echo "⚠️  WARNING: This will DROP all data and reset the database!"
  echo "🔄 Running prisma migrate reset --force..."
  echo ""
  npx prisma migrate reset --force
  echo "✅ Database reset, migrations applied, and seeded successfully!"
  echo ""
else
  if [ "$SKIP_PRISMA_GENERATE" != "true" ]; then
    echo "============================================"
    echo "🛠️ Stage 1: Generating Prisma Client..."
    echo "============================================"
    npx prisma generate
    echo "✅ Prisma Client generated successfully!"
    echo ""
  else
    echo "⏭️  Skipping Prisma Client generation (SKIP_PRISMA_GENERATE=true)"
    echo ""
  fi

  if [ "$SKIP_DB_MIGRATION" != "true" ]; then
    echo "============================================"
    echo "📦 Stage 2: Syncing Database Schema..."
    echo "============================================"
    # Check if migrations exist
    if [ -d "./prisma/migrations" ] && [ "$(ls -A ./prisma/migrations 2>/dev/null | grep -v migration_lock.toml)" ]; then
      echo "📂 Migrations found. Running prisma migrate deploy..."
      npx prisma migrate deploy
      echo "✅ Migrations applied successfully!"
    else
      echo "📂 No migrations found. Running prisma db push..."
      npx prisma db push --accept-data-loss
      echo "✅ Database schema pushed successfully!"
    fi
    echo ""
  else
    echo "⏭️  Skipping database migration (SKIP_DB_MIGRATION=true)"
    echo ""
  fi

  if [ "$SKIP_DB_SEED" != "true" ]; then
    echo "============================================"
    echo "🌱 Stage 3: Seeding Database..."
    echo "============================================"
    if npm run | grep -q "db:seed"; then
      echo "🌱 Running seed via npm run db:seed..."
      (npm run db:seed || echo "⚠️  Seed failed (this is OK if data already exists)")
    else
      echo "ℹ️  No seed script configured in package.json. Skipping seeding."
    fi
    echo ""
  else
    echo "⏭️  Skipping database seeding (SKIP_DB_SEED=true)"
    echo ""
  fi
fi

echo "============================================"
echo "🚀 Stage 4: Starting Application..."
echo "============================================"
if npm run | grep -q "start:docker"; then
  echo "🎯 Starting with: npm run start:docker"
  exec npm run start:docker
else
  echo "🎯 Starting with default: node dist/main"
  exec node dist/main
fi
