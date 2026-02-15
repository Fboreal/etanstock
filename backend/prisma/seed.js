import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const prisma = new PrismaClient();
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
    const [f1, f2] = await Promise.all([
        prisma.fournisseur.create({ data: { nom: 'Bosch' } }),
        prisma.fournisseur.create({ data: { nom: 'Hilti' } }),
    ]);
    const [c1, c2] = await Promise.all([
        prisma.categorie.create({ data: { nom: 'Outillage' } }),
        prisma.categorie.create({ data: { nom: 'Consommables' } }),
    ]);
    const agence = await prisma.agence.create({ data: { code: 'AG01', nom: 'Agence Lyon' } });
    await prisma.chantier.create({ data: { code: 'CH01', nom: 'Chantier Alpha', agenceId: agence.id } });
    const emplacements = await Promise.all([
        prisma.emplacement.create({ data: { code: 'A-000-001', allee: 'A', niveau: 0, travee: 1 } }),
        prisma.emplacement.create({ data: { code: 'A-001-002', allee: 'A', niveau: 1, travee: 2 } }),
        prisma.emplacement.create({ data: { code: 'B-000-005', allee: 'B', niveau: 0, travee: 5 } }),
    ]);
    const articles = await Promise.all([
        prisma.article.create({ data: { code: 'ART-001', designation: 'Perceuse', fournisseurId: f1.id, categorieId: c1.id, uniteGestion: 'pièce', multipleCommande: 1, prixHt: 120 } }),
        prisma.article.create({ data: { code: 'ART-002', designation: 'Gants', fournisseurId: f2.id, categorieId: c2.id, uniteGestion: 'paire', multipleCommande: 10, prixHt: 5.5 } }),
    ]);
    await prisma.stock.create({ data: { articleId: articles[0].id, emplacementId: emplacements[0].id, quantite: 20 } });
    await prisma.stock.create({ data: { articleId: articles[1].id, emplacementId: emplacements[1].id, quantite: 100 } });
    const passwordHash = await hash('admin123', 10);
    await prisma.user.create({ data: { email: 'admin@local.dev', nom: 'Admin', role: 'ADMIN', passwordHash } });
    await prisma.user.create({ data: { email: 'gest@local.dev', nom: 'Gestionnaire', role: 'GESTIONNAIRE', passwordHash } });
    await prisma.user.create({ data: { email: 'dem@local.dev', nom: 'Demandeur', role: 'DEMANDEUR', passwordHash } });
}
main().finally(async () => prisma.$disconnect());
