#!/bin/sh
# Démarrage ColisGui API — chaque étape est journalisée pour diagnostic Railway.

echo "=================================================="
echo " ColisGui API — démarrage"
echo " NODE_ENV=${NODE_ENV:-non défini}  PORT=${PORT:-3000}"
echo "=================================================="

# --- Contrôles préalables lisibles dans les logs ---
[ -z "$DATABASE_URL" ]       && echo "!! DATABASE_URL est VIDE — ajoutez le plugin PostgreSQL sur Railway."
[ -z "$JWT_SECRET" ]         && echo "!! JWT_SECRET est VIDE — l'API refusera de démarrer."
[ -z "$JWT_REFRESH_SECRET" ] && echo "!! JWT_REFRESH_SECRET est VIDE — l'API refusera de démarrer."

# --- 1. Schéma de base de données ---
echo "--- [1/3] Application du schéma de base de données ---"
if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  echo "  Migrations détectées : prisma migrate deploy"
  if ! npx prisma migrate deploy; then
    echo "  !! migrate deploy a échoué — repli sur db push"
    npx prisma db push --skip-generate --accept-data-loss || echo "  !! db push a échoué également"
  fi
else
  echo "  Aucune migration : prisma db push"
  npx prisma db push --skip-generate || echo "  !! db push a échoué"
fi

# --- 2. Données de base (packs, zones, motifs, compte administrateur) ---
if [ "${RUN_SEED:-true}" = "true" ]; then
  echo "--- [2/3] Données de base (seed) ---"
  if npx ts-node --transpile-only prisma/seed.ts; then
    echo "  Seed OK — compte administrateur disponible."
  else
    echo "  !! Le seed a ÉCHOUÉ : aucun compte administrateur ne sera créé."
    echo "     La connexion sera impossible tant que ce point n'est pas résolu."
  fi
else
  echo "--- [2/3] Seed désactivé (RUN_SEED=false) ---"
fi

# --- 3. Démarrage ---
echo "--- [3/3] Lancement de l'API ---"
exec node dist/main.js
