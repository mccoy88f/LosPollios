#!/bin/sh
set -e

# Default al DB server Postgres preconfigurato nello stack docker-compose
export DATABASE_URL="${DATABASE_URL:-postgresql://lospollios:lospollios_change_me@db:5432/lospollios?schema=public}"

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Applicazione schema Prisma..."
prisma db push --skip-generate

echo "[lospollios] Bootstrap admin iniziale..."
node ./scripts/bootstrap-admin.cjs

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec node server.js
