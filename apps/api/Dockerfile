# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
# openssl + libc6-compat : requis par les moteurs Prisma sur Alpine (musl)
RUN apk add --no-cache openssl libc6-compat
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
RUN npm install
COPY apps/api apps/api
RUN npx prisma generate
RUN npm --workspace apps/api run build

# --- Run stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget openssl libc6-compat
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh
EXPOSE 3000
# ⚠️ Le port doit suivre la variable PORT (Railway en impose un dynamique).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-3000}/api/v1/health" >/dev/null 2>&1 || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
