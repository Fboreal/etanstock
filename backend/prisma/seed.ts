import { hash } from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

async function main() {
  await prisma.mouvementStock.deleteMany();
  await prisma.allocationPicking.deleteMany();
  await prisma.ligneCommande.deleteMany();
  await prisma.commande.deleteMany();
  await prisma.stock.deleteMany();
  await prisma.article.deleteMany();
  await prisma.chantier.deleteMany();
  await prisma.agence.deleteMany();
  await prisma.emplacement.deleteMany();
  await prisma.categorie.deleteMany();
  await prisma.fournisseur.deleteMany();
  await prisma.user.deleteMany();

  const f1 = await prisma.fournisseur.create({ data: { nom: 'Bosch', actif: true } });
  const f2 = await prisma.fournisseur.create({ data: { nom: 'Hilti', actif: true } });
  const c1 = await prisma.categorie.create({ data: { nom: 'Outillage', actif: true } });
  const c2 = await prisma.categorie.create({ data: { nom: 'Consommables', actif: true } });
  const agence = await prisma.agence.create({ data: { code: 'AG01', nom: 'Agence Lyon', actif: true } });
  await prisma.chantier.create({ data: { code: 'CH01', nom: 'Chantier Alpha', agenceId: agence.id, actif: true } });
  const e1 = await prisma.emplacement.create({ data: { code: 'A-000-001', allee: 'A', niveau: 0, travee: 1, actif: true } });
  const e2 = await prisma.emplacement.create({ data: { code: 'A-001-002', allee: 'A', niveau: 1, travee: 2, actif: true } });

  const a1 = await prisma.article.create({ data: { code: 'ART-001', designation: 'Perceuse', fournisseurId: f1.id, categorieId: c1.id, uniteGestion: 'pièce', multipleCommande: 1, prixHt: 120, actif: true } });
  const a2 = await prisma.article.create({ data: { code: 'ART-002', designation: 'Gants', fournisseurId: f2.id, categorieId: c2.id, uniteGestion: 'paire', multipleCommande: 10, prixHt: 5.5, actif: true } });

  await prisma.stock.create({ data: { articleId: a1.id, emplacementId: e1.id, quantite: 20 } });
  await prisma.stock.create({ data: { articleId: a2.id, emplacementId: e2.id, quantite: 100 } });

  const passwordHash = await hash('admin123', 10);
  await prisma.user.create({ data: { email: 'admin@local.dev', nom: 'Admin', role: 'ADMIN', passwordHash, actif: true } });
  await prisma.user.create({ data: { email: 'gest@local.dev', nom: 'Gestionnaire', role: 'GESTIONNAIRE', passwordHash, actif: true } });
  await prisma.user.create({ data: { email: 'dem@local.dev', nom: 'Demandeur', role: 'DEMANDEUR', passwordHash, actif: true } });
}

main();
