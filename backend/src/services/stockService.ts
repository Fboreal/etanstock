type PrismaClient = any;

export async function applyMovement(
  prisma: PrismaClient,
  params: {
    type: 'ENTREE' | 'SORTIE' | 'TRANSFERT' | 'AJUSTEMENT';
    articleId: number;
    quantite: number;
    sourceId?: number | null;
    destId?: number | null;
    userId: number;
    commentaire?: string;
    refType?: string;
    refId?: number;
  },
) {
  const { articleId, quantite, sourceId, destId } = params;
  if (quantite <= 0) throw new Error('Quantité invalide');

  return prisma.$transaction(async (tx: any) => {
    if (sourceId) {
      const src = await tx.stock.findUnique({ where: { articleId_emplacementId: { articleId, emplacementId: sourceId } } });
      if (!src || src.quantite < quantite) throw new Error('Stock insuffisant');
      await tx.stock.update({ where: { id: src.id }, data: { quantite: src.quantite - quantite } });
    }
    if (destId) {
      const dst = await tx.stock.upsert({
        where: { articleId_emplacementId: { articleId, emplacementId: destId } },
        create: { articleId, emplacementId: destId, quantite },
        update: { quantite: { increment: quantite } },
      });
      if (dst.quantite < 0) throw new Error('Stock négatif interdit');
    }
    if (!sourceId && !destId) throw new Error('Mouvement invalide');
    return tx.mouvementStock.create({
      data: {
        type: params.type,
        articleId,
        quantite,
        emplacementSourceId: sourceId,
        emplacementDestId: destId,
        userId: params.userId,
        commentaire: params.commentaire,
        refType: params.refType,
        refId: params.refId,
      },
    });
  });
}


export function pickFromStocks(stocks: Array<{ emplacementId: number; quantite: number; niveau: number; travee: number; code: string }>, quantite: number) {
  const ordered = [...stocks].sort((a, b) => a.niveau - b.niveau || a.travee - b.travee || a.code.localeCompare(b.code));
  const exact = ordered.find((s) => s.quantite >= quantite);
  if (exact) return [{ emplacementId: exact.emplacementId, quantite }];
  const total = ordered.reduce((acc, s) => acc + s.quantite, 0);
  if (total < quantite) throw new Error('Stock insuffisant pour picking');
  let left = quantite;
  const allocations: { emplacementId: number; quantite: number }[] = [];
  for (const stock of ordered) {
    if (left <= 0) break;
    const take = Math.min(left, stock.quantite);
    allocations.push({ emplacementId: stock.emplacementId, quantite: take });
    left -= take;
  }
  return allocations;
}

export async function computePicking(prisma: PrismaClient, articleId: number, quantite: number) {
  const stocks = await prisma.stock.findMany({
    where: { articleId, quantite: { gt: 0 }, emplacement: { actif: true } },
    include: { emplacement: true },
    orderBy: [{ emplacement: { niveau: 'asc' } }, { emplacement: { travee: 'asc' } }, { emplacement: { code: 'asc' } }],
  });

  return pickFromStocks(stocks.map((s: any) => ({ emplacementId: s.emplacementId, quantite: s.quantite, niveau: s.emplacement.niveau, travee: s.emplacement.travee, code: s.emplacement.code })), quantite);
}
