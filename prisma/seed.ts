import { PrismaClient, PackCode, ZoneType, MotifCategorie, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // --- Packs (tarifs V2) ---
  const packs = [
    { code: PackCode.EASY,  libelle: 'Pack Easy',  nombreLivraisons: 10,  prix: 360000,   prixParTrajet: 36000, dureeJours: 30 },
    { code: PackCode.BOOST, libelle: 'Pack Boost', nombreLivraisons: 50,  prix: 1775000,  prixParTrajet: 35500, dureeJours: 30 },
    { code: PackCode.MAX,   libelle: 'Pack Max',   nombreLivraisons: 100, prix: 3500000,  prixParTrajet: 35000, dureeJours: 30 },
  ];
  for (const p of packs) {
    await prisma.pack.upsert({ where: { code: p.code }, update: p, create: p });
  }

  // --- Zones ---
  const zones = [
    { nom: 'Conakry (jusqu\u2019\u00e0 T8 Cimenterie)', type: ZoneType.STANDARD },
    { nom: 'Dubr\u00e9ka', type: ZoneType.ETENDUE },
    { nom: 'Coyah', type: ZoneType.ETENDUE },
  ];
  for (const z of zones) {
    await prisma.zone.upsert({ where: { nom: z.nom }, update: z, create: z });
  }

  // --- Motifs ---
  const motifs = [
    { code: 'CLIENT_INJOIGNABLE', libelle: 'Client injoignable', categorie: MotifCategorie.ECHEC_LIVRAISON },
    { code: 'REFUS_CLIENT',       libelle: 'Refus du client',    categorie: MotifCategorie.REFUS },
    { code: 'ADRESSE_INTROUVABLE',libelle: 'Adresse introuvable',categorie: MotifCategorie.ECHEC_LIVRAISON },
    { code: 'ANNULE_PARTENAIRE',  libelle: 'Annul\u00e9 par le partenaire', categorie: MotifCategorie.ANNULATION },
    { code: 'PRODUIT_DEFECTUEUX', libelle: 'Produit d\u00e9fectueux', categorie: MotifCategorie.RETOUR },
  ];
  for (const m of motifs) {
    await prisma.motif.upsert({ where: { code: m.code }, update: m, create: m });
  }

  // --- Comptes ---
  await prisma.compte.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: { id: '00000000-0000-0000-0000-000000000001', nom: 'Caisse principale', type: 'CAISSE' },
  });

  // --- Admin ---
  const telephone = process.env.ADMIN_TELEPHONE ?? '627159898';
  const password = process.env.ADMIN_PASSWORD ?? 'Admin@2026';
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { telephone },
    update: {},
    create: { nom: 'Admin', prenom: 'ColisGui', telephone, email: 'admin@colisgui.gn', passwordHash, role: UserRole.DIRECTEUR },
  });

  // --- Paramètres ---
  const params = [
    { cle: 'alerte_forfait_seuil', valeur: 3, categorie: 'ABONNEMENT', description: 'Seuil de livraisons restantes d\u00e9clenchant une alerte' },
    { cle: 'commission_taux_defaut', valeur: 1, categorie: 'FINANCE', description: 'Commission = frais de livraison (100%)' },
    { cle: 'tentatives_login_max', valeur: 5, categorie: 'SECURITE', description: 'Tentatives avant blocage' },
  ];
  for (const pa of params) {
    await prisma.parametre.upsert({ where: { cle: pa.cle }, update: {}, create: pa });
  }

  console.log('Seed termin\u00e9. Admin:', telephone, '/ mot de passe:', password);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
