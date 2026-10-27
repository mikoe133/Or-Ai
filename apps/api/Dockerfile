# syntax=docker/dockerfile:1.7
# Prisma's generator uses WASM. Build JavaScript on the builder's native CPU
# rather than running that compiler under amd64 emulation on an ARM workstation.
# Runtime dependencies are JavaScript/WASM; cloud-container-smoke.mjs checks that
# a native addon has not silently made the deployed dependency tree CPU-specific.
FROM --platform=$BUILDPLATFORM node:24.21.0-bookworm-slim AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
RUN npm install --global pnpm@10.33.2
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json ./
COPY packages/contracts packages/contracts
COPY apps/api apps/api
RUN pnpm --filter @orai/api... build \
    && pnpm --filter @orai/api deploy --prod /deploy/api \
    # pnpm can retain Prisma's optional build peer. Prisma 7's runtime uses
    # portable query-compiler WASM; schema migration binaries stay in the builder.
    && find /deploy/api/node_modules -type f -name 'schema-engine-*' -delete

FROM node:24.21.0-bookworm-slim AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production APP_ENV=production DATABASE_SSL_MODE=verify-full API_PORT=4100 API_HOST=0.0.0.0
COPY --from=build --chown=node:node /deploy/api ./
RUN mkdir -p /app/.local/assets \
    && chown -R node:node /app/.local \
    && chmod 700 /app/.local /app/.local/assets
USER node
EXPOSE 4100
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:4100/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
