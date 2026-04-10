# ===================================
# Multi-stage Dockerfile for Production
# ===================================

# Stage 1: Builder - Install dependencies and build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache libc6-compat

# Accept build arguments for NEXT_PUBLIC_* environment variables
# These are needed at build time because Next.js embeds them into the client bundle
ARG NEXT_PUBLIC_SOCKET_URL
ENV NEXT_PUBLIC_SOCKET_URL=$NEXT_PUBLIC_SOCKET_URL
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_PAYPAL_CLIENT_ID
ENV NEXT_PUBLIC_PAYPAL_CLIENT_ID=$NEXT_PUBLIC_PAYPAL_CLIENT_ID

# Copy package files for dependency installation
COPY package.json yarn.lock ./

# Install dependencies (including devDependencies for build)
RUN yarn install --frozen-lockfile

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Build Next.js application
RUN yarn build

# Stage 2: Runner - Production image with minimal footprint
FROM node:20-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Install runtime dependencies for health checks
RUN apk add --no-cache netcat-openbsd wget

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy necessary files from builder
# Next.js standalone output includes node_modules, so we copy the entire standalone directory
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copy Prisma files for migrations (needed at runtime)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# Copy Prisma Client (already generated in build stage)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy scripts directory and source code for cron jobs
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/src ./src
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.server.json ./tsconfig.server.json

# Install Prisma CLI, ts-node, and tsconfig-paths as production dependencies
# These are needed for migrations and cron jobs
USER root
RUN yarn add prisma@6.17.1 ts-node@latest tsconfig-paths@latest --production --no-lockfile && \
    chown -R nextjs:nodejs /app/node_modules

# Create scripts directory and copy entrypoint script
# Copy directly from source (not from builder) to ensure it's not overwritten
# Must be done as root before switching to nextjs user, and AFTER copying standalone
# Convert CRLF to LF to fix line endings for Alpine Linux
RUN mkdir -p /app/scripts
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/scripts/docker-entrypoint.sh && \
    chmod +x /app/scripts/docker-entrypoint.sh

# Create uploads directory (must be done as root)
RUN mkdir -p /app/uploads/avatars /app/uploads/ebooks && \
    chown -R nextjs:nodejs /app/uploads

# Switch to non-root user
USER nextjs

# Expose port (can be overridden by environment variable)
EXPOSE ${PORT:-3000}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-3000}/ || exit 1

# Use entrypoint script to run migrations and start server
# Use absolute path to ensure script is found
CMD ["/app/scripts/docker-entrypoint.sh"]

