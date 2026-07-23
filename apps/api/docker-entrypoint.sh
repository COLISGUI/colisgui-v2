#!/bin/sh
# ColisGui API — démarrage optimisé pour Railway.
# Le serveur HTTP démarre IMMÉDIATEMENT (pour que le healthcheck réponde),
# le schéma de base et le seed sont appliqués en arrière-plan.

echo "=================================================="
echo " ColisGui API — démarrage"
echo " NODE_ENV=${NODE_ENV:-non defini}  PORT=${PORT:-3000}"
echo "=================================================="

[ -z "$DATABASE_URL" ]       && echo "!! DATABASE_URL VIDE — liez le plugin PostgreSQL au service."
[ -z "$JWT_SECRET" ]         && echo "!! JWT_SECRET VIDE — l'API refusera de demarrer."
[ -z "$JWT_REFRESH_SECRET" ] && echo "!! JWT_REFRESH_SECRET VIDE — l'API refusera de demarrer."

# --- Préparation de la base en arrière-plan ---
(
  echo "[bg] --- Application du schema ---"
  if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
    npx prisma migrate deploy \
      || { echo "[bg] migrate deploy KO -> repli db push"; npx prisma db push --skip-generate --accept-data-loss; }
  else
    npx prisma db push --skip-generate
  fi
  echo "[bg] --- Schema termine ---"

  if [ "${RUN_SEED:-true}" = "true" ]; then
    echo "[bg] --- Seed (packs, zones, motifs, compte administrateur) ---"
    if npx ts-node --transpile-only prisma/seed.ts; then
      echo "[bg] Seed OK — compte administrateur disponible."
    else
      echo "[bg] !! Seed EN ECHEC — aucun compte administrateur, connexion impossible."
    fi
  fi
  echo "[bg] --- Preparation terminee ---"
) &

# --- Serveur HTTP : démarre tout de suite ---
echo "--- Lancement du serveur HTTP ---"
exec node dist/main.js
