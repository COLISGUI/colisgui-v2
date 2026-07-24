#!/bin/sh
# ColisGui API — démarrage Railway.
# Se placer dans le dossier du script (/app) : le demarrage fonctionne
# quel que soit le repertoire depuis lequel Railway invoque la commande.
cd "$(dirname "$0")" || exit 1

# Le serveur HTTP démarre IMMEDIATEMENT ; le schema et le seed tournent en arriere-plan.
# Les binaires sont appeles DIRECTEMENT (pas via npx) pour eviter toute erreur ENOENT.

PRISMA="./node_modules/.bin/prisma"
TSNODE="./node_modules/.bin/ts-node"

echo "=================================================="
echo " ColisGui API — demarrage"
echo " NODE_ENV=${NODE_ENV:-non defini}  PORT=${PORT:-3000}"
echo "=================================================="

[ -f package.json ] || echo "!! package.json ABSENT dans l'image."
[ -x "$PRISMA" ]    || echo "!! Binaire prisma introuvable ($PRISMA)."
[ -z "$DATABASE_URL" ]       && echo "!! DATABASE_URL VIDE — liez le plugin PostgreSQL."
[ -z "$JWT_SECRET" ]         && echo "!! JWT_SECRET VIDE — l'API refusera de demarrer."
[ -z "$JWT_REFRESH_SECRET" ] && echo "!! JWT_REFRESH_SECRET VIDE — l'API refusera de demarrer."

# --- Preparation de la base, en arriere-plan ---
(
  if [ ! -x "$PRISMA" ]; then
    echo "[bg] !! prisma indisponible — schema NON applique."
  else
    echo "[bg] --- Application du schema ---"
    if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
      "$PRISMA" migrate deploy \
        || { echo "[bg] migrate deploy KO -> repli db push"; "$PRISMA" db push --skip-generate --accept-data-loss; }
    else
      "$PRISMA" db push --skip-generate
    fi
    echo "[bg] --- Schema termine ---"

    if [ "${RUN_SEED:-true}" = "true" ]; then
      echo "[bg] --- Seed (packs, zones, motifs, compte administrateur) ---"
      if [ -x "$TSNODE" ]; then
        if "$TSNODE" --transpile-only prisma/seed.ts; then
          echo "[bg] Seed OK — compte administrateur cree."
        else
          echo "[bg] !! Seed EN ECHEC — connexion impossible."
        fi
      else
        echo "[bg] !! ts-node introuvable — seed ignore."
      fi
    fi
  fi
  echo "[bg] --- Preparation terminee ---"
) &

echo "--- Lancement du serveur HTTP ---"
exec node dist/main.js
