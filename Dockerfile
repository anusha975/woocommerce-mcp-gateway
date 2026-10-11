# syntax=docker/dockerfile:1

# ==============================================================================
# Stage 1: Build & Compilation (Builder)
# ==============================================================================
FROM node:22.16.0-alpine3.21 AS builder

WORKDIR /usr/src/app

# Install build prerequisites and full dependencies
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# Copy TypeScript configs and source code
COPY tsconfig.json tsconfig.build.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# ==============================================================================
# Stage 2: Production Runtime (Runner)
# ==============================================================================
FROM node:22.16.0-alpine3.21 AS runner

WORKDIR /usr/src/app

# Set production environment flags
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/usr/src/app/data

# Install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled JavaScript output from builder stage with unprivileged ownership
COPY --from=builder --chown=node:node /usr/src/app/dist ./dist

# Create runtime data directory with ownership for unprivileged 'node' user
RUN mkdir -p /usr/src/app/data && chown -R node:node /usr/src/app

# Create non-root runtime permissions (use built-in 'node' user: uid 1000, gid 1000)
USER node

# Expose default HTTP Gateway port
EXPOSE 3000

# Container liveness check using built-in busybox wget matching /healthz
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT}/healthz || exit 1

# Launch compiled application directly so PID 1 receives SIGTERM/SIGINT signals
ENTRYPOINT ["node", "dist/index.js"]
