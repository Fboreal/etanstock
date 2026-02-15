type Row = Record<string, any>;

class Table {
  rows: Row[] = [];
  id = 1;
  findMany(args?: any) {
    let out = [...this.rows];
    if (args?.where) {
      out = out.filter((r) => Object.entries(args.where).every(([k, v]) => (v === undefined ? true : r[k] === v)));
    }
    if (args?.orderBy) {
      const arr = Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy];
      out.sort((a, b) => {
        for (const order of arr) {
          const [k, dir] = Object.entries(order)[0] as [string, any];
          if (typeof dir === 'object') continue;
          if (a[k] === b[k]) continue;
          return dir === 'asc' ? (a[k] > b[k] ? 1 : -1) : a[k] > b[k] ? -1 : 1;
        }
        return 0;
      });
    }
    return out;
  }
  findUnique(args: any) {
    const where = args.where;
    if (where.id !== undefined) return this.rows.find((r) => r.id === where.id) || null;
    const k = Object.keys(where)[0];
    if (typeof where[k] === 'object') {
      return this.rows.find((r) => Object.entries(where[k]).every(([f, v]) => r[f] === v)) || null;
    }
    return this.rows.find((r) => r[k] === where[k]) || null;
  }
  create(args: any) {
    const row = { id: this.id++, ...args.data };
    this.rows.push(row);
    return row;
  }
  update(args: any) {
    const row = this.findUnique({ where: args.where });
    if (!row) throw new Error('Introuvable');
    Object.assign(row, args.data);
    return row;
  }
  upsert(args: any) {
    const found = this.findUnique({ where: args.where });
    if (found) {
      if (args.update.quantite?.increment) found.quantite += args.update.quantite.increment;
      else Object.assign(found, args.update);
      return found;
    }
    return this.create({ data: args.create });
  }
  deleteMany() {
    this.rows = [];
    this.id = 1;
    return { count: 0 };
  }
  count() {
    return this.rows.length;
  }
}

const tables = {
  user: new Table(),
  fournisseur: new Table(),
  categorie: new Table(),
  agence: new Table(),
  chantier: new Table(),
  article: new Table(),
  emplacement: new Table(),
  stock: new Table(),
  commande: new Table(),
  ligneCommande: new Table(),
  allocationPicking: new Table(),
  mouvementStock: new Table(),
};

export const prisma: any = {
  ...tables,
  $transaction: async (fn: any) => fn(prisma),
  $disconnect: async () => undefined,
};
