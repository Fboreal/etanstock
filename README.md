# LudoCommande (V1)

Monorepo TypeScript pour la gestion d'un catalogue, des stocks par emplacement, commandes internes, mouvements et picking automatique.

## Stack
- Backend: Fastify + Prisma (SQLite dev)
- Frontend: React + Vite
- Auth: JWT + RBAC (ADMIN/GESTIONNAIRE/DEMANDEUR)
- Tests: Vitest + Playwright

## Démarrage
```bash
npm install
cp backend/.env.example backend/.env
npm run migrate
npm run seed
npm run dev
```
- Front: http://localhost:5173
- API: http://localhost:3001

Comptes seed:
- admin@local.dev / admin123
- gest@local.dev / admin123
- dem@local.dev / admin123

## Scripts
- `npm run dev`
- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run migrate`
- `npm run seed`

## Hypothèses V1
- Suppression = désactivation (`actif=false`) sur référentiels principaux.
- Sortie commande réservée à ADMIN/GESTIONNAIRE.
- Les destinations de commande sont stockées en polymorphe (`destinationType` + `destinationId`).
- Les photos sont stockées en `./uploads/articles/<articleId>/UUID.ext` (max 3MB, jpg/png/webp).

## Endpoints principaux
- `/auth/login|logout|me`
- `/articles` (+ `/articles/:id/photo`)
- `/fournisseurs`, `/categories`, `/agences`, `/chantiers`
- `/emplacements`
- `/stocks`, `/stocks/ajustement`, `/stocks/transfert`
- `/commandes` (+ lignes, picking, soumettre, sortie, cloturer)
- `/mouvements`

## Règles métier implémentées
- Stock négatif interdit.
- Tout changement de stock passe par `MouvementStock`.
- Validation des multiples de commande.
- Emplacement format `A-000-000`, bornes niveau/travée.
- Picking auto: emplacement unique optimal sinon split trié niveau/travée/code.
