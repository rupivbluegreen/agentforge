# Build + run image for agentforge backend services (api, web, and the db migrate runner).
# Build context is the repository root: `docker build -f deploy/docker/Dockerfile .`
FROM node:20-bookworm-slim

# Apply OS security updates (the base image lags on patched system libraries), enable
# pnpm via corepack (root), then hand the app dir to the unprivileged `node` user so both
# build and runtime run non-root (defense in depth; no container runs as root).
RUN apt-get update \
  && apt-get upgrade -y \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && mkdir -p /app && chown node:node /app
WORKDIR /app
USER node

# Next.js bakes rewrite() destinations at build time, so the web app's /api proxy
# target must be set before `pnpm build`. In the compose network the API is `api:3000`.
ENV API_PROXY_TARGET=http://api:3000

# Copy the whole monorepo (node_modules/dist excluded via .dockerignore) owned by node,
# and do a clean, reproducible install + build inside the image.
COPY --chown=node:node . .
RUN pnpm install --frozen-lockfile \
  && pnpm build

WORKDIR /app/apps/api

# Default command runs the API. The migrate service overrides this to run the database
# migration CLI, and the web service overrides it to run `next start`.
CMD ["node", "dist/main.js"]
