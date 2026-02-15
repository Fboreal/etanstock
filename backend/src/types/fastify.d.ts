declare module 'fastify' {
  interface FastifyRequest {
    userCtx?: { id: number; role: 'ADMIN' | 'GESTIONNAIRE' | 'DEMANDEUR'; email: string };
  }
}
