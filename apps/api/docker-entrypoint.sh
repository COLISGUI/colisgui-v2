#!/bin/sh
set -e

# 1. Schéma de base de données
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "→ Migrations trouvées : 'prisma migrate deploy'…"
  if ! npx prisma migrate deploy; then
    echo "  ⚠ migrate deploy a échoué — repli sur 'db push' pour ne pas bloquer le démarrage."
    npx prisma db push --skip-generate --accept-data-loss
  fi
else
  echo "→ Aucune migration committée : application du schéma via 'prisma db push' (bootstrap)."
  npx prisma db push --skip-generate
fi

# 2. Données de base (idempotent : upserts). Non bloquant si déjà appliqué.
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "→ Injection des données de base (packs, zones, motifs, admin)…"
  npx ts-node --transpile-only prisma/seed.ts || echo "  ⚠ Seed non appliqué (déjà présent ou erreur non bloquante)."
fi

# 3. Démarrage
echo "→ Démarrage de l'API ColisGui…"
exec node dist/main.js
