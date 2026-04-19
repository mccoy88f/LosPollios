#!/bin/sh
set -e

# Default: SQLite su volume persistente (vedi docker-compose)
export DATABASE_URL="${DATABASE_URL:-file:/data/lospollios.db}"

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Applicazione schema Prisma..."
npx prisma db push

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec node server.js
