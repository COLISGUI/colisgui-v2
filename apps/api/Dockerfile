# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
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

# ⚠️ package.json est INDISPENSABLE : sans lui, npx/npm échouent avec ENOENT
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
# Pas de HEALTHCHECK Docker : Railway utilise railway.json (/api/v1/health).
ENTRYPOINT ["./docker-entrypoint.sh"]
