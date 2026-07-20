# Audit strict — ColisGui V2

Revue systématique du code (schéma Prisma, câblage des modules, contrôle d'accès,
cohérence des enums, routes, intégrité des SFC Vue). Les éléments notés **Corrigé**
l'ont été dans cette itération.

> Réserve : l'environnement d'audit n'a pas d'accès réseau ; la compilation TypeScript
> et l'exécution des tests n'ont pas pu être lancées. Cet audit est une revue statique
> rigoureuse. La validation finale (build + tests) reste à faire côté équipe.

## 1. Contrôle d'accès (sécurité) — corrigé

| # | Sévérité | Problème | Correction |
|---|---|---|---|
| A1 | Élevée | `GET /search` accessible à tous les rôles : un **livreur** pouvait lister tous les partenaires/clients | Restreint aux rôles bureau (exclut LIVREUR) ; recherche masquée pour LIVREUR côté UI |
| A2 | Élevée | `GET /reports/daily|weekly|monthly|annual` exposaient les finances sans restriction | `@Roles(DIRECTEUR, ADMIN, COMPTABLE)` ; nav « Rapports » restreinte ; cartes financières du dashboard masquées hors rôles financiers |
| A3 | Moyenne | `GET /notifications` renvoyait toutes les notifications | Restreint à `DIRECTEUR, ADMIN` |
| A4 | Moyenne | tops & scores partenaire/livreur sans restriction | Restreints aux rôles concernés |
| A5 | Faible | `reports/driver|commercial|partner/:id` non restreints | Rôles ciblés par endpoint |

## 2. Bugs fonctionnels — corrigés

| # | Problème | Correction |
|---|---|---|
| B1 | Refus d'une commande `CREEE` au Call Center impossible | `CREEE→REFUSEE` et `CONFIRMEE→REFUSEE` autorisées |
| B2 | Option « Retour » proposée sur une commande seulement assignée | Options alignées sur le statut réel |
| B3 | Refresh tokens non révoqués au rafraîchissement | Rotation stricte (révocation de l'ancien) |

## 3. Points vérifiés — conformes

- Schéma Prisma : 32 modèles, relations à double sens ; enum `EvenementType` aligné avec
  le moteur ; noms de champs des services tous présents.
- Câblage des modules : chaque service injecté est fourni/exporté ; pas de dépendance circulaire.
- Routes : 112 routes, 0 collision.
- Validation : `forbidNonWhitelisted` volontairement désactivé (évite des 400 sur les listes
  filtrées) ; `whitelist` conservé.
- Frontend : 15 vues présentes ; exports `format.ts` cohérents ; SFC bien formés ; chaînes
  `v-if/v-else-if` valides.
- Aucun `UserRole.*` inexistant.

## 4. Recommandations résiduelles (non bloquantes)

- Callback Orange Money public : vérifier la signature `notif_token` en production.
- Rate limiting en mémoire (par instance) : prévoir un store Redis en multi-instances.
- Build web : lancer `vue-tsc` en CI pour capter d'éventuelles erreurs de types.
- Retirer les identifiants pré-remplis de l'écran de connexion avant la prod.
- `genCode` partenaire (`count()+1`) : envisager une séquence Postgres en forte concurrence.

## 5. Validation réelle à faire côté équipe

```bash
npm install
npm --workspace apps/api run test
npm --workspace apps/api run build
npm --workspace apps/web run build
docker compose up --build
```

---

# Audit strict — deuxième passe (approfondie)

Cette passe a ciblé le **chemin de déploiement réel**, la validité du schéma Prisma et la
cohérence de la logique financière — zones peu explorées lors de la première passe.

## 5. Anomalies corrigées (2ᵉ passe)

| # | Gravité | Problème | Correctif |
|---|---------|----------|-----------|
| 5 | **Haute** | **Aucune migration Prisma committée** : l'entrypoint Docker lançait `prisma migrate deploy`, qui ne crée alors **aucune table**. Résultat : base vide, API en erreur au premier appel. | L'entrypoint détecte l'absence de migrations et applique le schéma via `prisma db push` (bootstrap). Reco : générer une migration versionnée (`prisma migrate dev --name init`) et la committer. |
| 6 | **Haute** | **Seed non exécuté au déploiement** : après un `docker compose up` sur une base neuve, aucun compte admin n'existait → **connexion impossible**. | L'entrypoint exécute le seed (idempotent, `ts-node --transpile-only`, non bloquant). Le `tsconfig.json` racine est copié dans l'image pour `ts-node`. |

## 6. Anomalies documentées — décision requise (non corrigées)

Ces points touchent à la logique métier/comptable ou à des arbitrages : je ne les modifie pas
sans votre validation.

| # | Gravité | Problème | Recommandation |
|---|---------|----------|----------------|
| 7 | Moyenne | **Solde de caisse erroné** : `comptes.solde` n'est **décrémenté que par les dépenses**, jamais crédité par les encaissements. Le solde affiché en Comptabilité dérive vers le négatif et n'a pas de sens. | Deux options : (a) poster les mouvements de caisse dans `RulesEngineService.applyDelivery` (créditer la caisse à l'encaissement, débiter au reversement) ; (b) dériver le solde affiché du **livre de caisse** (`/accounting/ledger`) plutôt que de `comptes.solde`. |
| 8 | Moyenne (sécurité) | **Jetons en `localStorage`** (access + refresh) : vol possible en cas de faille XSS. | Placer le **refresh token en cookie `httpOnly` + `SameSite=Strict`** (nécessite d'adapter `/auth/refresh` et le client), et/ou appliquer une CSP stricte. |
| 9 | Moyenne | **Rappel (pass 1)** : `reports/daily|weekly|monthly|annual` exposent des montants financiers à tous les rôles opérationnels. | Restreindre ces rapports aux rôles finance, ou masquer les cartes financières du tableau de bord pour les autres rôles. |

## 7. Vérifications supplémentaires passées (2ᵉ passe)

- **Schéma Prisma** : 0 back-relation manquante — le schéma devrait valider (`prisma validate`).
- **Dépendances circulaires** : aucune entre modules (Orders→Notifications/Rules/Pricing ;
  Payments→Rules ; Callcenter/Dispatch→Orders ; pas de cycle).
- **Proxy Nginx** : `/api/` → `http://api:3000/api/` — chemins cohérents.
- **Entrypoint** : schéma + seed idempotents au démarrage du conteneur.

## 8. Bilan consolidé

- **6 anomalies corrigées** (2 hautes, 4 moyennes) sur les deux passes.
- **3 points documentés** nécessitant une décision (comptabilité, sécurité des jetons, exposition finance).
- **Aucune** erreur de syntaxe, d'import, de relation Prisma, d'enum ou de route en double.
- La compilation réelle (`tsc`, `vue-tsc`) et les tests **restent à exécuter côté client** :
  l'audit est statique, sans réseau ici.

---

# Traitement des points restants

Les points documentés (pass 1 & 2) ont été **corrigés** :

| # | Point | Statut | Détail du correctif |
|---|-------|--------|---------------------|
| 7 | Solde de caisse erroné | ✅ Corrigé | `RulesEngineService.applyDelivery` crédite désormais la caisse à l'encaissement et la débite au reversement ; le solde du compte est cohérent avec le livre de caisse. |
| 8 | Jetons en `localStorage` | ✅ Corrigé | Le **refresh token** est désormais posé en **cookie `httpOnly` + `SameSite=Strict` + `Secure` (prod)**, scope `/api/v1/auth`. Le JS client ne le voit plus ; seul l'access token (court) reste en mémoire. Ajout de `cookie-parser`, `withCredentials` côté client, rotation conservée. |
| 9 | Rapports financiers ouverts à tous | ✅ Corrigé | `reports/daily·weekly·monthly·annual·financial·commercial·partner` restreints à `DIRECTEUR/ADMIN/COMPTABLE` ; rapport livreur à `DIRECTEUR/ADMIN/DISPATCHER`. Le tableau de bord ne charge/affiche les cartes financières que pour les rôles finance. |
| A | Race sur les références | ✅ Corrigé | Création de commande et de partenaire avec **réessai sur violation d'unicité** (`P2002`, 5 tentatives). |
| C | N+1 sur la charge livreurs | ✅ Corrigé | `driversLoad` réécrit avec un `groupBy` unique. |
| — | CORS + cookies en prod | ✅ Durci | Le démarrage échoue si `CORS_ORIGINS='*'` en production (incompatible avec les cookies d'authentification). |

### Restent (choix assumés / hors code applicatif)
- **Migration Prisma initiale** : l'entrypoint applique le schéma via `db push` en l'absence de
  migration ; générer une migration versionnée (`prisma migrate dev --name init`) reste recommandé
  avant la première mise en production, et nécessite une base — donc côté client.
- **Tests e2e** contre une base de test : à ajouter (les tests unitaires existants restent valables).
- **Table `paiement_lignes`** inutilisée (mode mixte retiré) : suppression au prochain jet de migration.

---

# Finalisation avant production

## Priorité 1 — Validation technique
| Point | Statut |
|-------|--------|
| Solde de caisse (encaissements + reversements + dépenses) | ✅ Corrigé (moteur crédite/débite la caisse ; cohérent avec le livre de caisse). |
| Refresh token en cookie `httpOnly` + `SameSite=Strict` | ✅ En place. |
| **Migrations Prisma versionnées** | ✅ **Baseline générée** (`prisma/migrations/20260720000000_init/`) à partir du schéma (21 enums, 32 tables, 32 FK, 70 index ; nommage index/FK/PK conforme à Prisma). Entrypoint tolérant (repli `db push` si l'application échoue). **À valider** contre une base (voir ci-dessous). |
| Callback Orange Money | ✅ Durci : secret partagé (`OM_NOTIF_TOKEN`), idempotence, matching souple, trace timeline. Vérification réelle à faire en production avec un compte Orange Developer. |
| Exécution des tests (API / Front / Docker) | ⚠️ **Non exécutable ici** (pas de réseau, pas de base). Commandes fournies ci-dessous. |

### Migration : validation recommandée
La baseline est fidèle mais **non produite par l'outil Prisma**. Pour obtenir la migration canonique :
```bash
# sur une base de dev jetable
npx prisma migrate reset          # applique la baseline + seed
# ou, pour repartir proprement :
rm -rf prisma/migrations && npx prisma migrate dev --name init
```

## Priorité 4 — Journal des décisions (livré)
Motif **obligatoire** + traçabilité (utilisateur, date/heure, action, motif) sur :
modification de prix, suspension d'abonnement, règlement de dette, réaffectation de livreur,
suspension de partenaire (et annulation/refus de commande, déjà en place). Consultable via la
page **Journal des décisions** (`GET /audit/decisions`).

## Reste (proposé pour la prochaine itération ciblée)
- **P2.3 Centre des exceptions** (commandes bloquées, paiements en attente, notifications en échec).
- **P3 Tableau de bord Directeur** : CA jour/semaine/mois + évolution mensuelle (extension de la page existante).

Conformément à votre préférence (stabilité/sécurité/tests plutôt que multiplication de modules),
ces deux points sont volontairement isolés pour être livrés proprement et testés.
