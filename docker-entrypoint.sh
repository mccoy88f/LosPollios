#!/bin/sh
set -e

# Default al DB server Postgres preconfigurato nello stack docker-compose
export DATABASE_URL="${DATABASE_URL:-postgresql://lospollios:lospollios_change_me@db:5432/lospollios?schema=public}"

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Migrazioni Prisma (migrate deploy)..."
set +e
prisma migrate deploy --skip-generate
MIG_EXIT=$?
set -e
if [ "$MIG_EXIT" -ne 0 ]; then
  echo "[lospollios] migrate deploy non riuscita (exit $MIG_EXIT) — fallback prisma db push (DB legacy o prima installazione)"
  prisma db push --skip-generate
fi

echo "[lospollios] Bootstrap admin iniziale..."
node ./scripts/bootstrap-admin.cjs

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec node server.js
