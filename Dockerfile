# Phase 2.7 — runtime Dockerfile.
# Multi-stage: build with full deps, run with a slim Node 20 image.

FROM node:20-alpine AS build
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace manifests first for better Docker cache reuse.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages/protocol/package.json packages/protocol/
COPY packages/runtime/package.json packages/runtime/
COPY packages/web-shell/package.json packages/web-shell/
COPY packages/sdk-ts/package.json packages/sdk-ts/
COPY packages/cli/package.json packages/cli/
COPY apps/demo-host/package.json apps/demo-host/

RUN pnpm install --frozen-lockfile

# Copy sources + build
COPY packages packages
COPY apps apps
COPY tsconfig.base.json ./
RUN pnpm --filter @saasagent/protocol --filter @saasagent/runtime build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache wget

# Bring in node_modules + built dist directories from the build stage.
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages/protocol/dist ./packages/protocol/dist
COPY --from=build /app/packages/protocol/package.json ./packages/protocol/
COPY --from=build /app/packages/runtime/dist ./packages/runtime/dist
COPY --from=build /app/packages/runtime/package.json ./packages/runtime/
COPY --from=build /app/package.json ./

# Phase 2.7: dedicated entry that reads SAAS_AGENT_* env vars and wires up
# auth + rate limiting + Postgres memory.
COPY .docker/runtime-entrypoint.mjs /app/runtime-entrypoint.mjs

EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "/app/runtime-entrypoint.mjs"]
