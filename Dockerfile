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

# Copy .env for Prisma generate
COPY .env .env

# Generate Prisma client
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

# Copy entrypoint script
COPY --from=builder /app/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

# Default: all DB operations disabled
ENV DB_PUSH=false
ENV DB_MIGRATE=false
ENV DB_SEED=false

EXPOSE 3001

ENTRYPOINT ["./entrypoint.sh"]
