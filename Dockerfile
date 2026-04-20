# syntax=docker/dockerfile:1
# Build: docker build -t lospollios .
# SQLite su volume /data — configurare JWT_SECRET in Portainer o compose.

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build
# Script seed eseguibile con `node` nel container (no tsx): stesso contenuto di prisma/seed.ts
RUN npx --yes esbuild@0.24.2 prisma/seed.ts --bundle --platform=node --target=node20 --format=cjs \
  --outfile=prisma/seed.cjs --external:@prisma/client

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
# Next standalone usa HOSTNAME (default già 0.0.0.0 in server.js)
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

RUN mkdir -p /data && chown nextjs:nodejs /data

# Output standalone Next.js
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Schema DB e CLI Prisma (non inclusi nello standalone)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma

COPY --chown=nextjs:nodejs docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

# CLI Prisma completa (dipendenze transitive) per `db push` all'avvio — la copia parziale di node_modules non basta
RUN npm install -g prisma@6.19.3

RUN apk add --no-cache wget

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ > /dev/null || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
