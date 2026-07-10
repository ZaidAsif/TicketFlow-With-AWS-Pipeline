# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json ./
RUN npm ci --frozen-lockfile

COPY src/ src/
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install curl for health check
RUN apk add --no-cache curl

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

COPY package.json ./
RUN npm ci --frozen-lockfile --production

COPY --from=builder /app/dist ./dist
COPY migrations/ ./migrations/
COPY seed/ ./seed/

USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

CMD ["node", "dist/index.js"]
