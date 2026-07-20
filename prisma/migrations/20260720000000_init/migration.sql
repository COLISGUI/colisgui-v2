-- Baseline ColisGui V2 — dérivée du schéma Prisma (à valider, voir README).

CREATE TYPE "UserRole" AS ENUM ('DIRECTEUR', 'ADMIN', 'COMMERCIAL', 'AGENT_CALL_CENTER', 'DISPATCHER', 'LIVREUR', 'COMPTABLE');
CREATE TYPE "StatutActif" AS ENUM ('ACTIF', 'INACTIF', 'SUSPENDU');
CREATE TYPE "PartnerType" AS ENUM ('ABONNE', 'NON_ABONNE');
CREATE TYPE "PackCode" AS ENUM ('EASY', 'BOOST', 'MAX');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDUE', 'EXPIREE', 'EPUISEE');
CREATE TYPE "SubscriptionAction" AS ENUM ('CREATION', 'RENOUVELLEMENT', 'SUSPENSION', 'REACTIVATION');
CREATE TYPE "ZoneType" AS ENUM ('STANDARD', 'ETENDUE');
CREATE TYPE "OrderStatus" AS ENUM ('CREEE', 'CONFIRMEE', 'ASSIGNEE', 'EN_COURS', 'LIVREE', 'REFUSEE', 'ANNULEE', 'RETOUR');
CREATE TYPE "BillingMode" AS ENUM ('ABONNEMENT', 'GRILLE');
CREATE TYPE "MotifCategorie" AS ENUM ('REFUS', 'ANNULATION', 'RETOUR', 'ECHEC_LIVRAISON');
CREATE TYPE "CallResult" AS ENUM ('CONFIRMEE', 'INJOIGNABLE', 'REFUSEE', 'REPORTEE');
CREATE TYPE "PaymentMode" AS ENUM ('ESPECES', 'ORANGE_MONEY', 'WAVE', 'CODE_MARCHAND', 'VIREMENT', 'MIXTE');
CREATE TYPE "PaymentStatus" AS ENUM ('EN_ATTENTE', 'PARTIEL', 'PAYE');
CREATE TYPE "TransactionType" AS ENUM ('COLLECTE', 'REVERSEMENT', 'COMMISSION', 'DETTE', 'DEPENSE', 'RECETTE');
CREATE TYPE "SensFlux" AS ENUM ('ENTREE', 'SORTIE');
CREATE TYPE "CompteType" AS ENUM ('CAISSE', 'BANQUE');
CREATE TYPE "EcritureSens" AS ENUM ('DEBIT', 'CREDIT');
CREATE TYPE "DetteType" AS ENUM ('DETTE', 'CREANCE');
CREATE TYPE "NotifCanal" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'IN_APP');
CREATE TYPE "NotifStatut" AS ENUM ('EN_ATTENTE', 'ENVOYE', 'ECHEC');
CREATE TYPE "EvenementType" AS ENUM ('CREATION', 'CONFIRMATION', 'AFFECTATION', 'PRISE_EN_CHARGE', 'LIVRAISON', 'PAIEMENT', 'ECRITURE_COMPTABLE', 'COMMISSION', 'REVERSEMENT', 'DECREMENT_ABONNEMENT', 'NOTIFICATION', 'REFUS', 'ANNULATION', 'RETOUR');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "statut" "StatutActif" DEFAULT 'ACTIF'::"StatutActif" NOT NULL,
    "derniereConnexion" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
    "role" "UserRole" NOT NULL,
    "permissionId" TEXT NOT NULL,
    PRIMARY KEY ("role", "permissionId")
);

CREATE TABLE "partenaires" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "adresse" TEXT,
    "gpsLat" DECIMAL(10,7),
    "gpsLng" DECIMAL(10,7),
    "type" "PartnerType" DEFAULT 'NON_ABONNE'::"PartnerType" NOT NULL,
    "commercialId" TEXT,
    "statut" "StatutActif" DEFAULT 'ACTIF'::"StatutActif" NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "packs" (
    "id" TEXT NOT NULL,
    "code" "PackCode" NOT NULL,
    "libelle" TEXT NOT NULL,
    "nombreLivraisons" INTEGER NOT NULL,
    "prix" DECIMAL(14,2) NOT NULL,
    "prixParTrajet" DECIMAL(14,2) NOT NULL,
    "dureeJours" INTEGER,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "abonnements" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "packId" TEXT NOT NULL,
    "dateDebut" DATE NOT NULL,
    "dateFin" DATE,
    "livraisonsIncluses" INTEGER NOT NULL,
    "livraisonsConsommees" INTEGER DEFAULT 0 NOT NULL,
    "livraisonsRestantes" INTEGER NOT NULL,
    "prixPaye" DECIMAL(14,2) NOT NULL,
    "statut" "SubscriptionStatus" DEFAULT 'ACTIVE'::"SubscriptionStatus" NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "abonnement_historique" (
    "id" TEXT NOT NULL,
    "abonnementId" TEXT NOT NULL,
    "action" "SubscriptionAction" NOT NULL,
    "ancienStatut" "SubscriptionStatus",
    "nouveauStatut" "SubscriptionStatus",
    "commentaire" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "ZoneType" DEFAULT 'STANDARD'::"ZoneType" NOT NULL,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "grille_tarifs" (
    "id" TEXT NOT NULL,
    "pointDepart" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "zoneDepartId" TEXT,
    "zoneDestinationId" TEXT,
    "prix" DECIMAL(14,2) NOT NULL,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "grille_tarifs_historique" (
    "id" TEXT NOT NULL,
    "grilleId" TEXT,
    "pointDepart" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "ancienPrix" DECIMAL(14,2),
    "nouveauPrix" DECIMAL(14,2) NOT NULL,
    "motif" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "motifs" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "categorie" "MotifCategorie" NOT NULL,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "commandes" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "partenaireId" TEXT NOT NULL,
    "clientNom" TEXT NOT NULL,
    "clientTelephone" TEXT NOT NULL,
    "clientAdresse" TEXT NOT NULL,
    "gpsLat" DECIMAL(10,7),
    "gpsLng" DECIMAL(10,7),
    "zoneId" TEXT,
    "prixProduit" DECIMAL(14,2) DEFAULT 0 NOT NULL,
    "fraisLivraison" DECIMAL(14,2) DEFAULT 0 NOT NULL,
    "modeFacturation" "BillingMode" NOT NULL,
    "abonnementId" TEXT,
    "grilleTarifId" TEXT,
    "statut" "OrderStatus" DEFAULT 'CREEE'::"OrderStatus" NOT NULL,
    "observations" TEXT,
    "livreurId" TEXT,
    "confirmedById" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "commande_statut_historique" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "ancienStatut" "OrderStatus",
    "nouveauStatut" "OrderStatus" NOT NULL,
    "motifId" TEXT,
    "commentaire" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "scripts" (
    "id" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "call_center_logs" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "resultat" "CallResult" NOT NULL,
    "motifId" TEXT,
    "scriptId" TEXT,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "livreurs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "motoImmatriculation" TEXT,
    "motoModele" TEXT,
    "permisNumero" TEXT,
    "cniNumero" TEXT,
    "primeBase" DECIMAL(14,2) DEFAULT 0 NOT NULL,
    "statut" "StatutActif" DEFAULT 'ACTIF'::"StatutActif" NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "livreur_documents" (
    "id" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "typeDocument" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "dateExpiration" DATE,
    "valide" BOOLEAN DEFAULT true NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "affectations" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "livreurId" TEXT NOT NULL,
    "dispatcherId" TEXT NOT NULL,
    "priorite" SMALLINT DEFAULT 0 NOT NULL,
    "statut" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "paiements" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "statut" "PaymentStatus" DEFAULT 'EN_ATTENTE'::"PaymentStatus" NOT NULL,
    "referenceExterne" TEXT,
    "collecteParId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "paiement_lignes" (
    "id" TEXT NOT NULL,
    "paiementId" TEXT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "comptes" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" "CompteType" NOT NULL,
    "solde" DECIMAL(14,2) DEFAULT 0 NOT NULL,
    "devise" TEXT DEFAULT 'GNF' NOT NULL,
    "actif" BOOLEAN DEFAULT true NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "sens" "SensFlux" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "commandeId" TEXT,
    "partenaireId" TEXT,
    "compteId" TEXT,
    "reference" TEXT,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "ecritures_comptables" (
    "id" TEXT NOT NULL,
    "journal" TEXT NOT NULL,
    "dateEcriture" DATE NOT NULL,
    "compteId" TEXT NOT NULL,
    "sens" "EcritureSens" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "commandeId" TEXT,
    "transactionId" TEXT,
    "libelle" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "depenses" (
    "id" TEXT NOT NULL,
    "categorie" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "modePaiement" "PaymentMode" NOT NULL,
    "compteId" TEXT NOT NULL,
    "justificatifUrl" TEXT,
    "description" TEXT,
    "valideParId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "dettes_creances" (
    "id" TEXT NOT NULL,
    "partenaireId" TEXT,
    "type" "DetteType" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "statut" TEXT NOT NULL,
    "echeance" DATE,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "rapports" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "cibleType" TEXT,
    "cibleId" TEXT,
    "periodeDebut" DATE NOT NULL,
    "periodeFin" DATE NOT NULL,
    "donnees" JSONB NOT NULL,
    "genereParId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "raison" TEXT,
    "ipAdresse" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "destinataireType" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "canal" "NotifCanal" NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "statut" "NotifStatut" DEFAULT 'EN_ATTENTE'::"NotifStatut" NOT NULL,
    "lu" BOOLEAN DEFAULT false NOT NULL,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "parametres" (
    "id" TEXT NOT NULL,
    "cle" TEXT NOT NULL,
    "valeur" JSONB NOT NULL,
    "categorie" TEXT NOT NULL,
    "description" TEXT,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    PRIMARY KEY ("id")
);

CREATE TABLE "commande_evenements" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "type" "EvenementType" NOT NULL,
    "libelle" TEXT NOT NULL,
    "meta" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_telephone_key" ON "users" ("telephone");
CREATE UNIQUE INDEX "users_email_key" ON "users" ("email");
CREATE INDEX "users_role_idx" ON "users" ("role");
CREATE INDEX "users_statut_idx" ON "users" ("statut");
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens" ("userId");
CREATE INDEX "password_resets_userId_idx" ON "password_resets" ("userId");
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions" ("code");
CREATE INDEX "permissions_module_idx" ON "permissions" ("module");
CREATE UNIQUE INDEX "partenaires_code_key" ON "partenaires" ("code");
CREATE UNIQUE INDEX "partenaires_telephone_key" ON "partenaires" ("telephone");
CREATE INDEX "partenaires_commercialId_idx" ON "partenaires" ("commercialId");
CREATE INDEX "partenaires_type_idx" ON "partenaires" ("type");
CREATE INDEX "partenaires_statut_idx" ON "partenaires" ("statut");
CREATE UNIQUE INDEX "packs_code_key" ON "packs" ("code");
CREATE INDEX "abonnements_partenaireId_idx" ON "abonnements" ("partenaireId");
CREATE INDEX "abonnements_statut_idx" ON "abonnements" ("statut");
CREATE INDEX "abonnements_dateFin_idx" ON "abonnements" ("dateFin");
CREATE INDEX "abonnement_historique_abonnementId_idx" ON "abonnement_historique" ("abonnementId");
CREATE UNIQUE INDEX "zones_nom_key" ON "zones" ("nom");
CREATE INDEX "grille_tarifs_pointDepart_destination_idx" ON "grille_tarifs" ("pointDepart", "destination");
CREATE INDEX "grille_tarifs_zoneDestinationId_idx" ON "grille_tarifs" ("zoneDestinationId");
CREATE INDEX "grille_tarifs_historique_grilleId_idx" ON "grille_tarifs_historique" ("grilleId");
CREATE INDEX "grille_tarifs_historique_createdAt_idx" ON "grille_tarifs_historique" ("createdAt");
CREATE UNIQUE INDEX "motifs_code_key" ON "motifs" ("code");
CREATE INDEX "motifs_categorie_idx" ON "motifs" ("categorie");
CREATE UNIQUE INDEX "commandes_reference_key" ON "commandes" ("reference");
CREATE INDEX "commandes_partenaireId_idx" ON "commandes" ("partenaireId");
CREATE INDEX "commandes_statut_idx" ON "commandes" ("statut");
CREATE INDEX "commandes_livreurId_idx" ON "commandes" ("livreurId");
CREATE INDEX "commandes_createdAt_idx" ON "commandes" ("createdAt");
CREATE INDEX "commandes_updatedAt_idx" ON "commandes" ("updatedAt");
CREATE INDEX "commandes_partenaireId_statut_idx" ON "commandes" ("partenaireId", "statut");
CREATE INDEX "commandes_livreurId_statut_idx" ON "commandes" ("livreurId", "statut");
CREATE INDEX "commandes_clientTelephone_idx" ON "commandes" ("clientTelephone");
CREATE INDEX "commande_statut_historique_commandeId_idx" ON "commande_statut_historique" ("commandeId");
CREATE INDEX "commande_statut_historique_createdAt_idx" ON "commande_statut_historique" ("createdAt");
CREATE INDEX "call_center_logs_commandeId_idx" ON "call_center_logs" ("commandeId");
CREATE INDEX "call_center_logs_agentId_idx" ON "call_center_logs" ("agentId");
CREATE INDEX "call_center_logs_createdAt_idx" ON "call_center_logs" ("createdAt");
CREATE UNIQUE INDEX "livreurs_telephone_key" ON "livreurs" ("telephone");
CREATE INDEX "livreurs_statut_idx" ON "livreurs" ("statut");
CREATE INDEX "livreur_documents_livreurId_idx" ON "livreur_documents" ("livreurId");
CREATE INDEX "livreur_documents_dateExpiration_idx" ON "livreur_documents" ("dateExpiration");
CREATE INDEX "affectations_commandeId_idx" ON "affectations" ("commandeId");
CREATE INDEX "affectations_livreurId_idx" ON "affectations" ("livreurId");
CREATE INDEX "affectations_statut_idx" ON "affectations" ("statut");
CREATE INDEX "paiements_commandeId_idx" ON "paiements" ("commandeId");
CREATE INDEX "paiements_mode_idx" ON "paiements" ("mode");
CREATE INDEX "paiements_statut_idx" ON "paiements" ("statut");
CREATE INDEX "paiement_lignes_paiementId_idx" ON "paiement_lignes" ("paiementId");
CREATE INDEX "transactions_type_idx" ON "transactions" ("type");
CREATE INDEX "transactions_partenaireId_idx" ON "transactions" ("partenaireId");
CREATE INDEX "transactions_commandeId_idx" ON "transactions" ("commandeId");
CREATE INDEX "transactions_createdAt_idx" ON "transactions" ("createdAt");
CREATE INDEX "ecritures_comptables_journal_idx" ON "ecritures_comptables" ("journal");
CREATE INDEX "ecritures_comptables_dateEcriture_idx" ON "ecritures_comptables" ("dateEcriture");
CREATE INDEX "ecritures_comptables_compteId_idx" ON "ecritures_comptables" ("compteId");
CREATE INDEX "dettes_creances_partenaireId_idx" ON "dettes_creances" ("partenaireId");
CREATE INDEX "dettes_creances_type_idx" ON "dettes_creances" ("type");
CREATE INDEX "dettes_creances_statut_idx" ON "dettes_creances" ("statut");
CREATE INDEX "rapports_type_idx" ON "rapports" ("type");
CREATE INDEX "rapports_cibleType_cibleId_idx" ON "rapports" ("cibleType", "cibleId");
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs" ("userId");
CREATE INDEX "audit_logs_entite_entiteId_idx" ON "audit_logs" ("entite", "entiteId");
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs" ("createdAt");
CREATE INDEX "notifications_destinataireType_destinataireId_idx" ON "notifications" ("destinataireType", "destinataireId");
CREATE INDEX "notifications_statut_idx" ON "notifications" ("statut");
CREATE UNIQUE INDEX "parametres_cle_key" ON "parametres" ("cle");
CREATE INDEX "commande_evenements_commandeId_idx" ON "commande_evenements" ("commandeId");
CREATE INDEX "commande_evenements_createdAt_idx" ON "commande_evenements" ("createdAt");

ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "partenaires" ADD CONSTRAINT "partenaires_commercialId_fkey" FOREIGN KEY ("commercialId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_packId_fkey" FOREIGN KEY ("packId") REFERENCES "packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "abonnement_historique" ADD CONSTRAINT "abonnement_historique_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "grille_tarifs_historique" ADD CONSTRAINT "grille_tarifs_historique_grilleId_fkey" FOREIGN KEY ("grilleId") REFERENCES "grille_tarifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_abonnementId_fkey" FOREIGN KEY ("abonnementId") REFERENCES "abonnements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_grilleTarifId_fkey" FOREIGN KEY ("grilleTarifId") REFERENCES "grille_tarifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commandes" ADD CONSTRAINT "commandes_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "livreurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commande_statut_historique" ADD CONSTRAINT "commande_statut_historique_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commande_statut_historique" ADD CONSTRAINT "commande_statut_historique_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "motifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_center_logs" ADD CONSTRAINT "call_center_logs_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "call_center_logs" ADD CONSTRAINT "call_center_logs_motifId_fkey" FOREIGN KEY ("motifId") REFERENCES "motifs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "call_center_logs" ADD CONSTRAINT "call_center_logs_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "scripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "livreur_documents" ADD CONSTRAINT "livreur_documents_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "livreurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "affectations" ADD CONSTRAINT "affectations_livreurId_fkey" FOREIGN KEY ("livreurId") REFERENCES "livreurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "paiement_lignes" ADD CONSTRAINT "paiement_lignes_paiementId_fkey" FOREIGN KEY ("paiementId") REFERENCES "paiements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ecritures_comptables" ADD CONSTRAINT "ecritures_comptables_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "depenses" ADD CONSTRAINT "depenses_compteId_fkey" FOREIGN KEY ("compteId") REFERENCES "comptes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "dettes_creances" ADD CONSTRAINT "dettes_creances_partenaireId_fkey" FOREIGN KEY ("partenaireId") REFERENCES "partenaires"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "commande_evenements" ADD CONSTRAINT "commande_evenements_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "commandes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
