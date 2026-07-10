# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json tsconfig.json next.config.js ./
RUN npm ci --frozen-lockfile

COPY src/ src/
COPY public/ public/

ENV NEXT_PUBLIC_API_URL=http://localhost:4000
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy standalone output from next build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
