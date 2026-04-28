#!/bin/sh
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "[lospollios] ERRORE: DATABASE_URL non impostata"
  exit 1
fi

echo "[lospollios] DATABASE_URL=${DATABASE_URL}"
echo "[lospollios] Applicazione schema Prisma..."
prisma db push --skip-generate

echo "[lospollios] Avvio Next.js su 0.0.0.0:${PORT:-3000}..."
exec node server.js
