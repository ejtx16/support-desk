# QueueDesk API image. Build from the repo root (the npm lockfile lives there):
#   docker build -f server/Dockerfile -t queuedesk-api .
# or simply: docker compose up --build

FROM node:22-bookworm-slim AS base
# Prisma's engines need OpenSSL.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV PRISMA_HIDE_UPDATE_MESSAGE=1
WORKDIR /app

FROM base AS build
# Workspace manifests first so the dependency layer is cached between code changes.
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
# --ignore-scripts skips the root postinstall (it would create a dev DB inside the image).
# prisma and tsx stay installed: the container runs migrations and the seed on start.
RUN npm ci -w server --ignore-scripts
COPY server/ server/
WORKDIR /app/server
RUN npx prisma generate \
  && npm run build \
  # Pull the schema engine now so `migrate deploy` works offline as a non-root user.
  && DATABASE_URL="file:/tmp/build.db" npx prisma migrate deploy \
  && rm -f /tmp/build.db

FROM base AS runtime
# CORS_ORIGIN="*": the GitHub Pages site calls this API cross-origin. Auth is a bearer token
# (no cookies), so any origin is acceptable for a local test server. Restrict with -e CORS_ORIGIN=...
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL="file:/data/queuedesk.db" \
    CORS_ORIGIN="*"
COPY --from=build /app /app
RUN mkdir -p /data && chown node:node /data
USER node
WORKDIR /app/server
EXPOSE 4000
VOLUME ["/data"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
# Migrate + seed (both idempotent) on every start, then run the compiled API.
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && exec node dist/server.js"]
