# ---- Stage 1: Install dependencies ----
FROM node:22-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

RUN \
  if [ -f pnpm-lock.yaml ]; then \
  corepack enable pnpm && pnpm install --frozen-lockfile; \
  elif [ -f yarn.lock ]; then \
  yarn install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
  npm ci; \
  else \
  npm install; \
  fi

# ---- Stage 2: Build ----
FROM node:22-alpine AS builder

WORKDIR /app


# Copy node_modules and source
COPY --from=deps /app/node_modules ./node_modules
COPY . .


# Generate Prisma client
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# Build NestJS
RUN npm run build

# ---- Stage 3: Production ----
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Copy built output and necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

# Copy entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Default: Control flags with default values
ENV SKIP_PRISMA_GENERATE=false
ENV SKIP_DB_MIGRATION=false
ENV SKIP_DB_SEED=false
# Database reset mode: "reset" (migrate reset + seed), "migrate" (default), "skip"
ENV DB_RESET_MODE=migrate


EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
