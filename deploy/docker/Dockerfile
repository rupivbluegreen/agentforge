# Build + run image for agentforge backend services (api, and the db migrate runner).
# Build context is the repository root: `docker build -f deploy/docker/Dockerfile .`
FROM node:20-bookworm-slim

WORKDIR /app

# pnpm via corepack (version pinned by the root package.json "packageManager").
RUN corepack enable

# Copy the whole monorepo (node_modules/dist excluded via .dockerignore) and do a
# clean, reproducible install + build inside the image.
COPY . .
RUN pnpm install --frozen-lockfile \
  && pnpm build

WORKDIR /app/apps/api

# Default command runs the API. The migrate service overrides this to run the
# database migration CLI (node ../../packages/db/dist/migrate.js).
CMD ["node", "dist/main.js"]
