import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { applyMovement, computePicking } from '../services/stockService.js';
import { parseEmplacementCode, validateMultiple } from '../lib/validators.js';

import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

const refRoles = ['ADMIN', 'GESTIONNAIRE'] as const;

const articleSchema = z.object({
  code: z.string().min(1),
  designation: z.string().min(1),
  fournisseurId: z.number().int(),
  uniteGestion: z.string().min(1),
  multipleCommande: z.number().int().positive(),
  categorieId: z.number().int(),
  prixHt: z.number().nonnegative(),
  actif: z.boolean().optional(),
});


export async function registerApi(app: FastifyInstance) {
  if ((await prisma.user.count()) === 0) {
    const passwordHash = await hash('admin123', 10);
    await prisma.user.create({ data: { email: 'admin@local.dev', nom: 'Admin', role: 'ADMIN', passwordHash, actif: true } });
    await prisma.user.create({ data: { email: 'gest@local.dev', nom: 'Gestionnaire', role: 'GESTIONNAIRE', passwordHash, actif: true } });
    await prisma.user.create({ data: { email: 'dem@local.dev', nom: 'Demandeur', role: 'DEMANDEUR', passwordHash, actif: true } });
    const f = await prisma.fournisseur.create({ data: { nom: 'Bosch', actif: true } });
    const c = await prisma.categorie.create({ data: { nom: 'Outillage', actif: true } });
    const a = await prisma.article.create({ data: { code: 'ART-001', designation: 'Perceuse', fournisseurId: f.id, uniteGestion: 'pièce', multipleCommande: 1, categorieId: c.id, prixHt: 100, actif: true } });
    const e = await prisma.emplacement.create({ data: { code: 'A-000-001', allee: 'A', niveau: 0, travee: 1, actif: true } });
    await prisma.stock.create({ data: { articleId: a.id, emplacementId: e.id, quantite: 10 } });
    await prisma.agence.create({ data: { code: 'AG01', nom: 'Agence Lyon', actif: true } });
    await prisma.chantier.create({ data: { code: 'CH01', nom: 'Chantier Alpha', actif: true } });
  }

  app.post('/auth/login', async (request, reply) => {
    const body = z.object({ email: z.string().email(), password: z.string() }).parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !user.actif || !(await compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ message: 'Identifiants invalides' });
    }
    const token = app.jwt.sign({ id: user.id, role: user.role, email: user.email });
    return { token, user: { id: user.id, nom: user.nom, role: user.role, email: user.email } };
  });
  app.post('/auth/logout', { preHandler: app.requireAuth }, async () => ({ ok: true }));
  app.get('/auth/me', { preHandler: app.requireAuth }, async (req) => {
    return prisma.user.findUnique({ where: { id: req.userCtx!.id }, select: { id: true, email: true, nom: true, role: true } });
  });

  const makeCrud = (base: string, model: any) => {
    app.get(`/${base}`, { preHandler: app.requireAuth }, async () => model.findMany());
    app.post(`/${base}`, { preHandler: app.requireRole([...refRoles]) }, async (req) => model.create({ data: req.body as any }));
    app.put(`/${base}/:id`, { preHandler: app.requireRole([...refRoles]) }, async (req) =>
      model.update({ where: { id: Number((req.params as any).id) }, data: req.body as any }),
    );
    app.delete(`/${base}/:id`, { preHandler: app.requireRole(['ADMIN']) }, async (req) =>
      model.update({ where: { id: Number((req.params as any).id) }, data: { actif: false } }),
    );
  };

  makeCrud('fournisseurs', prisma.fournisseur);
  makeCrud('categories', prisma.categorie);
  makeCrud('agences', prisma.agence);
  makeCrud('chantiers', prisma.chantier);

  app.get('/articles', { preHandler: app.requireAuth }, async (req) => {
    const q = req.query as any;
    return prisma.article.findMany({
      where: {
        AND: [
          q.search ? { OR: [{ code: { contains: q.search } }, { designation: { contains: q.search } }] } : {},
          q.categorieId ? { categorieId: Number(q.categorieId) } : {},
          q.fournisseurId ? { fournisseurId: Number(q.fournisseurId) } : {},
        ],
      },
      include: { categorie: true, fournisseur: true },
      orderBy: { id: 'desc' },
    });
  });
  app.post('/articles', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const body = articleSchema.parse(req.body);
    return prisma.article.create({ data: { ...body, prixHt: body.prixHt } });
  });
  app.put('/articles/:id', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const body = articleSchema.partial().parse(req.body);
    const data: any = { ...body };
    if (body.prixHt !== undefined) data.prixHt = body.prixHt;
    return prisma.article.update({ where: { id: Number((req.params as any).id) }, data });
  });

  app.post('/articles/:id/photo', { preHandler: app.requireRole([...refRoles]) }, async (req, reply) => {
    const part = await req.file();
    if (!part) return reply.code(400).send({ message: 'Fichier requis' });
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(part.mimetype)) return reply.code(400).send({ message: 'MIME invalide' });
    const chunks: Buffer[] = [];
    for await (const chunk of part.file) chunks.push(chunk as Buffer);
    const buffer = Buffer.concat(chunks);
    if (buffer.byteLength > 3 * 1024 * 1024) return reply.code(400).send({ message: 'Taille max 3MB' });
    const ext = part.mimetype === 'image/png' ? 'png' : part.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const id = Number((req.params as any).id);
    const dir = path.join(process.cwd(), '..', 'uploads', 'articles', String(id));
    await fs.mkdir(dir, { recursive: true });
    const filename = `${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(dir, filename), buffer);
    const photoPath = `articles/${id}/${filename}`;
    await prisma.article.update({ where: { id }, data: { photoPath } });
    return { photoPath };
  });

  app.get('/emplacements', { preHandler: app.requireAuth }, async () => prisma.emplacement.findMany({ orderBy: [{ niveau: 'asc' }, { travee: 'asc' }] }));
  app.post('/emplacements', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const body = z.object({ code: z.string(), actif: z.boolean().optional() }).parse(req.body);
    const parsed = parseEmplacementCode(body.code);
    return prisma.emplacement.create({ data: { ...parsed, code: body.code, actif: body.actif ?? true } });
  });

  app.get('/stocks', { preHandler: app.requireAuth }, async (req) => {
    const q = req.query as any;
    return prisma.stock.findMany({
      where: { articleId: q.articleId ? Number(q.articleId) : undefined, emplacementId: q.emplacementId ? Number(q.emplacementId) : undefined },
      include: { article: true, emplacement: true },
    });
  });

  app.post('/stocks/ajustement', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const b = z.object({ articleId: z.number(), emplacementId: z.number(), quantite: z.number().int().positive(), sens: z.enum(['PLUS', 'MOINS']), commentaire: z.string().optional() }).parse(req.body);
    if (b.sens === 'PLUS') {
      return applyMovement(prisma, { type: 'AJUSTEMENT', articleId: b.articleId, quantite: b.quantite, destId: b.emplacementId, userId: req.userCtx!.id, commentaire: b.commentaire });
    }
    return applyMovement(prisma, { type: 'AJUSTEMENT', articleId: b.articleId, quantite: b.quantite, sourceId: b.emplacementId, userId: req.userCtx!.id, commentaire: b.commentaire });
  });

  app.post('/stocks/transfert', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const b = z.object({ articleId: z.number(), sourceId: z.number(), destId: z.number(), quantite: z.number().int().positive(), commentaire: z.string().optional() }).parse(req.body);
    return applyMovement(prisma, { type: 'TRANSFERT', articleId: b.articleId, quantite: b.quantite, sourceId: b.sourceId, destId: b.destId, userId: req.userCtx!.id, commentaire: b.commentaire });
  });

  app.get('/commandes', { preHandler: app.requireAuth }, async (req) => {
    const where = req.userCtx!.role === 'DEMANDEUR' ? { demandeurUserId: req.userCtx!.id } : {};
    return prisma.commande.findMany({ where, include: { lignes: { include: { article: true } }, allocations: true }, orderBy: { id: 'desc' } });
  });
  app.post('/commandes', { preHandler: app.requireAuth }, async (req) => {
    const b = z.object({ destinationType: z.enum(['AGENCE', 'CHANTIER']), destinationId: z.number(), commentaire: z.string().optional() }).parse(req.body);
    const count = await prisma.commande.count();
    return prisma.commande.create({ data: { ...b, numero: `CMD-${String(count + 1).padStart(5, '0')}`, demandeurUserId: req.userCtx!.id } });
  });
  app.post('/commandes/:id/lignes', { preHandler: app.requireAuth }, async (req, reply) => {
    const id = Number((req.params as any).id);
    const b = z.object({ articleId: z.number(), quantiteDemandee: z.number().int().positive(), commentaire: z.string().optional() }).parse(req.body);
    const article = await prisma.article.findUnique({ where: { id: b.articleId } });
    if (!article?.actif) return reply.code(400).send({ message: 'Article inactif non commandable' });
    if (!validateMultiple(b.quantiteDemandee, article.multipleCommande)) return reply.code(400).send({ message: 'Quantité non multiple' });
    return prisma.ligneCommande.create({ data: { commandeId: id, ...b } });
  });

  app.post('/commandes/:id/picking', { preHandler: app.requireAuth }, async (req) => {
    const id = Number((req.params as any).id);
    const commande = await prisma.commande.findUnique({ where: { id }, include: { lignes: true } });
    if (!commande) throw new Error('Commande introuvable');
    await prisma.allocationPicking.deleteMany({ where: { commandeId: id } });
    for (const line of commande.lignes) {
      const allocs = await computePicking(prisma, line.articleId, line.quantiteDemandee);
      for (const a of allocs) {
        await prisma.allocationPicking.create({ data: { commandeId: id, articleId: line.articleId, emplacementId: a.emplacementId, quantite: a.quantite } });
      }
    }
    return prisma.allocationPicking.findMany({ where: { commandeId: id }, include: { emplacement: true, article: true } });
  });
  app.post('/commandes/:id/soumettre', { preHandler: app.requireAuth }, async (req) =>
    prisma.commande.update({ where: { id: Number((req.params as any).id) }, data: { statut: 'SOUMISE' } }),
  );
  app.post('/commandes/:id/sortie', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const id = Number((req.params as any).id);
    const allocs = await prisma.allocationPicking.findMany({ where: { commandeId: id } });
    for (const a of allocs) {
      await applyMovement(prisma, {
        type: 'SORTIE',
        articleId: a.articleId,
        quantite: a.quantite,
        sourceId: a.emplacementId,
        userId: req.userCtx!.id,
        refType: 'COMMANDE',
        refId: id,
      });
    }
    return prisma.commande.update({ where: { id }, data: { statut: 'SORTIE', dateSortie: new Date(), sortieParUserId: req.userCtx!.id } });
  });
  app.post('/commandes/:id/cloturer', { preHandler: app.requireRole([...refRoles]) }, async (req) =>
    prisma.commande.update({ where: { id: Number((req.params as any).id) }, data: { statut: 'CLOTUREE' } }),
  );

  app.get('/mouvements', { preHandler: app.requireRole([...refRoles]) }, async (req) => {
    const q = req.query as any;
    return prisma.mouvementStock.findMany({
      where: {
        articleId: q.articleId ? Number(q.articleId) : undefined,
        type: q.type,
      },
      include: { article: true, emplacementSource: true, emplacementDest: true, user: true },
      orderBy: { timestamp: 'desc' },
    });
  });

  app.setErrorHandler((error, _, reply) => {
    reply.code(400).send({ message: (error as Error).message });
  });

  app.post('/setup/register-admin', async (req) => {
    const b = z.object({ email: z.string().email(), password: z.string().min(6), nom: z.string() }).parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: b.email } });
    if (existing) return existing;
    return prisma.user.create({ data: { email: b.email, nom: b.nom, role: 'ADMIN', passwordHash: await hash(b.password, 10) } });
  });
}
