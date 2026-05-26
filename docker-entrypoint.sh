#!/bin/sh
set -e

# CLI Prisma globale (installata in immagine come root, dipendenze complete)
PRISMA() {
  prisma "$@"
}

# Default al DB server Postgres preconfigurato nello stack docker-compose
export DATABASE_URL="${DATABASE_URL:-postgresql://lospollios:lospollios_change_me@db:5432/lospollios?schema=public}"

baseline_all_migrations() {
  echo "[lospollios] Baseline migrazioni (DB già popolato senza _prisma_migrations)..."
  for dir in prisma/migrations/*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    echo "[lospollios]   migrate resolve --applied ${name}"
    PRISMA migrate resolve --applied "$name"
  done
}

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Migrazioni Prisma (migrate deploy)..."
set +e
MIG_OUT=$(PRISMA migrate deploy 2>&1)
MIG_EXIT=$?
set -e
printf '%s\n' "$MIG_OUT"

if [ "$MIG_EXIT" -ne 0 ]; then
  if printf '%s' "$MIG_OUT" | grep -q 'P3005'; then
    echo "[lospollios] P3005: allineo schema e registro lo storico migrazioni..."
    set +e
    PUSH_OUT=$(PRISMA db push --accept-data-loss --skip-generate 2>&1)
    PUSH_EXIT=$?
    set -e
    printf '%s\n' "$PUSH_OUT"
    if [ "$PUSH_EXIT" -ne 0 ]; then
      echo "[lospollios] db push non riuscita (exit $PUSH_EXIT)"
      exit 1
    fi
    baseline_all_migrations
    set +e
    MIG_OUT2=$(PRISMA migrate deploy 2>&1)
    MIG_EXIT=$?
    set -e
    printf '%s\n' "$MIG_OUT2"
    if [ "$MIG_EXIT" -ne 0 ]; then
      echo "[lospollios] migrate deploy dopo baseline non riuscita (exit $MIG_EXIT)"
      exit 1
    fi
  else
    echo "[lospollios] migrate deploy non riuscita (exit $MIG_EXIT) — fallback prisma db push"
    set +e
    PUSH_OUT=$(PRISMA db push --accept-data-loss --skip-generate 2>&1)
    PUSH_EXIT=$?
    set -e
    printf '%s\n' "$PUSH_OUT"
    if [ "$PUSH_EXIT" -ne 0 ]; then
      echo "[lospollios] db push non riuscita (exit $PUSH_EXIT)"
      exit 1
    fi
  fi
fi

echo "[lospollios] Bootstrap admin iniziale..."
node ./scripts/bootstrap-admin.cjs

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec su-exec nextjs node server.js
