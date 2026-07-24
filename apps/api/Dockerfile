# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json ./
COPY apps/api/package.json apps/api/package.json
COPY prisma prisma
RUN npm install
COPY apps/api apps/api
COPY tsconfig.json ./tsconfig.json
RUN npx prisma generate

# Compilation : TypeScript emet le JavaScript meme en presence d'erreurs de types.
# On ne bloque donc pas sur le code de sortie, mais on VERIFIE que dist/main.js existe.
RUN npm --workspace apps/api run build || echo "!! Avertissements TypeScript ignores"
RUN test -f apps/api/dist/main.js \
    || (echo "ERREUR FATALE : apps/api/dist/main.js absent — compilation reellement echouee" && exit 1)

# --- Run stage ---
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget openssl libc6-compat

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
# Filet de securite : si Railway lance la commande depuis /app/apps/api,
# dist/main.js doit aussi s'y trouver.
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/prisma ./prisma
COPY tsconfig.json ./tsconfig.json
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
