# syntax=docker/dockerfile:1
# Immagine di produzione dell'API (contesto di build: apps/api).
# Stadi: deps (npm ci) → build (prisma generate + tsc) → runtime (solo dipendenze di produzione).

FROM node:22-slim AS base
WORKDIR /app
# openssl serve allo Schema Engine di Prisma (migrate deploy all'avvio)
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  # scarica ora lo Schema Engine, così l'avvio non dipende dalla rete
  && npx prisma --version

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    STORAGE_LOCAL_DIR=/app/storage
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json prisma.config.ts ./
COPY --chown=node:node prisma ./prisma
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# migration (idempotenti) all'avvio, poi il server
CMD ["sh", "-c", "npx prisma migrate deploy && exec node dist/src/server.js"]
