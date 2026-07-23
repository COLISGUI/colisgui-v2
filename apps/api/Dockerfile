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
# Pas de HEALTHCHECK Docker : Railway effectue le sien via railway.json
# (healthcheckPath = /api/v1/health). Deux healthchecks concurrents provoquent des faux echecs.
ENTRYPOINT ["./docker-entrypoint.sh"]
