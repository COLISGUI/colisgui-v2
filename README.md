# ColisGui V2

Plateforme de gestion de livraison (last-mile e-commerce) — Guinée.
Backend **NestJS + Prisma + PostgreSQL**, frontend **Vue 3 + TypeScript** (à venir), déploiement **Docker / Railway**.

## Ce qui est livré (backend – COMPLET)

- Base de données complète : `prisma/schema.prisma` (31 tables) + seed (`prisma/seed.ts`).
- Authentification **JWT** (access + refresh, révocation, changement de mot de passe).
- **Sécurité par rôle** (guards globaux + décorateurs `@Roles`).
- Modules : **Utilisateurs, Partenaires, Packs, Abonnements, Grille tarifaire, Commandes**.
- **Règle métier pivot « commande livrée »** : décrément du forfait, circuit de l'argent
  (collecte → commission → reversement), écriture comptable, notifications et audit —
  le tout en transaction atomique (`orders.service.ts`).
- **Grille tarifaire** avec historique obligatoire à chaque modification (réservée au Directeur).

## Prérequis

- Node.js 20+
- Docker (pour PostgreSQL) ou une base PostgreSQL existante

## Démarrage

```bash
# 1. Cloner puis installer
npm install

# 2. Configurer l'environnement
cp .env.example .env      # ajuster DATABASE_URL et les secrets JWT

# 3. Lancer PostgreSQL (via Docker)
docker compose up -d db

# 4. Générer le client Prisma + créer le schéma
npm run prisma:generate
npm run prisma:migrate    # crée la migration initiale

# 5. Injecter les données de base (packs V2, zones, motifs, admin)
npm run db:seed

# 6. Démarrer l'API
npm run api:dev
```

L'API écoute sur `http://localhost:3000/api/v1`.
Compte initial (Directeur) : téléphone `627159898` / mot de passe `Admin@2026` (modifiable via `.env`).

## Tester rapidement

```bash
# Connexion
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifiant":"627159898","password":"Admin@2026"}'

# Récupérer le accessToken renvoyé, puis :
curl http://localhost:3000/api/v1/packs -H "Authorization: Bearer <accessToken>"
```

## Tout en conteneurs

```bash
docker compose up --build
```

## Roadmap (prochaines itérations)

- ~~Modules backend restants~~ : **tous livrés** (Call Center, Dispatch, Livreurs, Paiements, Comptabilité, Rapports, Audit, Paramètres).
- Frontend Vue 3 + TypeScript (Pinia, Vue Router) : écrans listés au §7 du cahier des charges.
- Notifications WhatsApp/SMS réelles, intégrations Orange Money / Wave.
- Tests (unitaires + e2e) et pipeline CI.

## Packs (tarifs V2)

| Pack | Commandes | Prix (GNF) | Prix/trajet |
|------|----------:|-----------:|------------:|
| Easy | 10 | 360 000 | 36 000 |
| Boost | 50 | 1 775 000 | 35 500 |
| Max | 100 | 3 500 000 | 35 000 |

Zone standard : Conakry jusqu'à T8 Cimenterie. Zones étendues : Dubréka, Coyah.

## Couverture backend (tous les modules du cahier des charges)

| Module | Endpoints principaux |
|---|---|
| Authentification | login, refresh, logout, change-password, me |
| Utilisateurs | CRUD, activate/deactivate, reset-password |
| Partenaires | CRUD, commandes, relevé |
| Packs | list, update (Directeur) |
| Abonnements | create, renew, suspend, reactivate, history |
| Grille tarifaire | CRUD, quote, history (modif. Directeur) |
| Commandes | CRUD, confirm, assign, status, history, flow |
| Call Center | queue, call-logs, scripts |
| Dispatch | queue, assign, reassign, drivers-load |
| Livreurs | CRUD, documents, performance |
| Paiements | create (dont mixte), status |
| Comptabilité | accounts, transactions, expenses, debts, entries |
| Rapports | daily/weekly/monthly/annual, driver/commercial/partner/financial |
| Audit | journal filtrable (qui/quand/avant/après) |
| Paramètres | settings, permissions, zones, motifs |

**~92 routes REST** au total, sécurisées par rôle.

## Frontend (Vue 3 + TypeScript)

Interface opérateur complète : connexion, tableau de bord, commandes, call center, dispatch,
partenaires, abonnements, grille tarifaire, livreurs, comptabilité, rapports, audit, paramètres.
Stack : Vite + Vue 3 (`<script setup>`) + Pinia + Vue Router + Axios (client avec refresh token).
Design dérivé de l'identité ColisGui (encre + orange), références/téléphones/montants en mono,
système de pastilles de statut, navigation filtrée par rôle.

### Lancer le frontend

```bash
# à la racine (les workspaces installent aussi le web)
npm install

# copier la config front (optionnel : le proxy Vite pointe déjà vers l'API)
cp apps/web/.env.example apps/web/.env

# démarrer l'API (dans un terminal) puis le web (dans un autre)
npm run api:dev
npm run web:dev
```

Le frontend tourne sur `http://localhost:5173` et proxifie `/api` vers l'API (port 3000).
Connectez-vous avec le compte seed : `627159898` / `Admin@2026`.

### Écrans livrés

| Écran | Fonctions |
|---|---|
| Connexion | Auth JWT réelle contre l'API |
| Tableau de bord | KPIs du jour, files Call Center & Dispatch |
| Commandes | Liste, création (mode abonnement/grille auto), confirmer, livrer, statuts |
| Call Center | File à confirmer, confirmation / injoignable / refus |
| Dispatch | File à affecter, choix du livreur, charge par livreur |
| Partenaires | Liste + création |
| Abonnements | Liste, création, renouveler, suspendre, réactiver |
| Grille tarifaire | Liste, ajout, modification de prix (Directeur, avec motif) |
| Livreurs | Liste + création |
| Comptabilité | Soldes, transactions, dépenses, dettes/créances |
| Rapports | Journalier / hebdo / mensuel / annuel |
| Audit | Journal des actions sensibles |
| Paramètres | Zones, motifs, réglages |

## Intégrations & industrialisation (dernière itération)

### Notifications WhatsApp / SMS
Module `notifications` avec abstraction par canal et **repli automatique** : si aucun identifiant
n'est configuré, les envois sont journalisés (aucun crash).
- WhatsApp : Meta Cloud API (`WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`).
- SMS : Twilio (`TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`).
- Déclenché automatiquement après une livraison (forfait épuisé / bientôt épuisé).
- Endpoints : `GET /notifications`, `POST /notifications/dispatch`, `POST /notifications/send`.

### Paiements — espèces & Orange Money uniquement
- **Espèces** : encaissement immédiat, statut `PAYE`.
- **Orange Money** : connecteur Orange Money Web Payment (`OM_CLIENT_ID`, `OM_CLIENT_SECRET`,
  `OM_MERCHANT_KEY`). Initiation → `EN_ATTENTE` + lien de paiement ; confirmation via le
  webhook `POST /payments/orange-money/callback`. Sans identifiants → mode simulé (`PAYE`).
- Front : bouton **Encaisser** sur les commandes livrées (choix espèces / Orange Money).

### Frontend conteneurisé
`apps/web/Dockerfile` (build Node → Nginx). Nginx sert le SPA et proxifie `/api` vers le service `api`.
Lancement complet en conteneurs :

```bash
docker compose up --build
# API : http://localhost:3000  ·  Web : http://localhost:8080
```

### Tests
Jest configuré côté API avec tests unitaires de la logique critique :
transitions de commande (refus des transitions invalides, motif obligatoire),
encaissement espèces/Orange Money (réel, simulé, en attente).

```bash
npm --workspace apps/api run test
npm --workspace apps/api run test:cov
```

## Lot 1 — Architecture & pilotage

Améliorations livrées :

- **#2 Moteur de règles** (`rules/rules-engine.service.ts`) : toutes les actions automatiques
  d'une livraison (décrément abonnement, commission, reversement, écriture comptable, audit,
  notifications) sont centralisées dans un seul moteur, appelé par le module Commandes. Fini la
  logique dispersée.
- **#1 Timeline de commande** : chaque étape (création, confirmation, affectation, prise en charge,
  livraison, paiement, écriture comptable, reversement, notifications…) est journalisée dans
  `commande_evenements`. Endpoint `GET /orders/:id/timeline` + bouton **Suivi** dans l'interface.
- **#3 Dashboard opérationnel** : `GET /dashboard/pipeline` (compte par étape) + bandeau pipeline
  cliquable sur le tableau de bord.
- **#11 Dashboard Directeur** : `GET /dashboard/director` (bénéfice net, coût moyen/livraison,
  temps moyen de livraison, taux de réussite, commandes/heure, marge par partenaire et par livreur) +
  page **Direction**.
- **#4 / #5 Scores** partenaires et livreurs calculés automatiquement
  (`GET /partners/:id/score`, `GET /drivers/:id/score`, tops sur le dashboard Directeur).
- **#6 Livre de caisse** : `GET /accounting/ledger` avec solde courant après chaque mouvement +
  onglet **Livre de caisse** en Comptabilité.
- **#10 Recherche globale** : `GET /search?q=` (commande, partenaire, client, livreur, téléphone,
  référence) + barre de recherche dans l'en-tête.
- **#14 Santé du système** : `GET /health` (public) et `GET /system/status` + page **Système**.
- **#13 Mode maintenance** : `PUT /system/maintenance` + garde globale qui bloque les non-admins ;
  bascule depuis la page Système.

> Note migration : le schéma ajoute la table `commande_evenements` et l'enum `EvenementType`.
> Lancez `npm run prisma:migrate` après mise à jour pour créer la migration correspondante.

### Reste à venir (Lot 2 — gouvernance des données)
#8 historique détaillé des modifications · #9 corbeille (soft delete) · #7 centre de notifications ·
#12 sauvegarde / restauration.

## Cycle de stabilisation (production-ready)

### Bugs corrigés
- **Refus au Call Center** : une commande au statut `CREEE` ne pouvait pas être refusée
  (transition non autorisée). Les transitions `CREEE→REFUSEE` et `CONFIRMEE→REFUSEE` sont désormais permises.
- **Menu de statut** (interface) : l'option « Retour » n'apparaît plus sur une commande seulement
  assignée (transition invalide) ; les options reflètent le statut réel.
- **Refresh tokens** : l'ancien jeton n'était pas révoqué au rafraîchissement (accumulation +
  jetons toujours valides). Rotation stricte : révocation de l'ancien à chaque renouvellement.

### Sécurité
- **Helmet** (en-têtes HTTP sécurisés) et `x-powered-by` désactivé.
- **Rate limiting** (`@nestjs/throttler`) : 120 req/min global, **8/min sur `login`**, 5/min sur `forgot-password`.
- **CORS** restreint par `CORS_ORIGINS` (plus de `*` en production).
- **Validation stricte** des entrées : `forbidNonWhitelisted` (rejette les champs inconnus).
- **Validation de configuration au démarrage** : en production, l'absence de `DATABASE_URL`/secrets
  ou l'usage de secrets par défaut fait échouer le boot (fail-fast).
- **Filtre d'exceptions global** : réponses d'erreur cohérentes, pile masquée en production.
- **Mot de passe oublié / réinitialisation** : jeton à usage unique (30 min), réponse anti-énumération,
  révocation des sessions après changement.

### Performance
- Scores « top partenaires / livreurs » : passage de dizaines de requêtes (N+1) à **2 agrégations groupées**.
- **Index** ajoutés : `commandes(updatedAt)`, `commandes(partenaireId, statut)`, `commandes(livreurId, statut)`.

### Tests
Tests unitaires (Jest) : transitions de commande, encaissement (espèces / Orange Money réel & simulé),
livre de caisse (solde courant), recherche (garde-fou), authentification (échecs, anti-énumération).
```bash
npm --workspace apps/api run test
```

### Mise en production
- **Migrations automatiques** au démarrage du conteneur API (`prisma migrate deploy` via l'entrypoint).
- **Healthchecks** Docker : Postgres (`pg_isready`) et API (`/api/v1/health`).
- **Arrêt propre** : `enableShutdownHooks` + déconnexion Prisma.
- **`docker-compose`** exige des secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`) et démarre l'API
  seulement quand la base est saine.
- Modèle `.env.production.example` fourni (secrets, CORS, comptes).

```bash
# Production
cp .env.production.example .env   # puis renseigner les secrets
docker compose --env-file .env up --build -d
```

> Après toute mise à jour du schéma, les migrations s'appliquent automatiquement au démarrage
> du conteneur ; en local, lancez `npm run prisma:migrate`.

## Audit strict (contrôle d'accès)

Un audit statique complet a été mené (voir `AUDIT.md`). Principales corrections de sécurité :
- **Recherche globale** (`/search`) restreinte aux rôles bureau — un livreur ne peut plus lister
  tous les partenaires/clients ; la barre est masquée pour ce rôle.
- **Rapports périodiques** (journalier/hebdo/mensuel/annuel), qui exposaient les finances,
  restreints à `DIRECTEUR / ADMIN / COMPTABLE` ; navigation et cartes financières du dashboard
  ajustées en conséquence.
- **Notifications**, **tops** et **scores** partenaires/livreurs restreints aux rôles concernés.

Détail complet, sévérités et points vérifiés dans `AUDIT.md`.

## Authentification (mise à jour sécurité)

Le **refresh token** est stocké dans un cookie **`httpOnly` / `SameSite=Strict` / `Secure`**
(scope `/api/v1/auth`), inaccessible au JavaScript — protection contre le vol de session par XSS.
L'access token (courte durée) est envoyé via l'en-tête `Authorization`. Le client utilise
`withCredentials`. En développement, laissez `VITE_API_URL` vide pour passer par le proxy Vite
(cookies same-origin). En production, `CORS_ORIGINS` doit lister les domaines autorisés (pas de `*`).
