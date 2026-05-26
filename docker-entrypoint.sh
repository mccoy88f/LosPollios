#!/bin/sh
set -e

# Default al DB server Postgres preconfigurato nello stack docker-compose
export DATABASE_URL="${DATABASE_URL:-postgresql://lospollios:lospollios_change_me@db:5432/lospollios?schema=public}"

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Migrazioni Prisma (migrate deploy)..."
set +e
prisma migrate deploy
MIG_EXIT=$?
set -e
if [ "$MIG_EXIT" -ne 0 ]; then
  echo "[lospollios] migrate deploy non riuscita (exit $MIG_EXIT) — fallback prisma db push (DB legacy o prima installazione)"
  set +e
  prisma db push --accept-data-loss
  PUSH_EXIT=$?
  set -e
  if [ "$PUSH_EXIT" -ne 0 ]; then
    echo "[lospollios] db push non riuscita (exit $PUSH_EXIT)"
    exit 1
  fi
fi

echo "[lospollios] Bootstrap admin iniziale..."
node ./scripts/bootstrap-admin.cjs

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec node server.js
