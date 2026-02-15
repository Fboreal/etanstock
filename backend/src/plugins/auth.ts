import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
type Role = 'ADMIN' | 'GESTIONNAIRE' | 'DEMANDEUR';

export default fp(async (fastify) => {
  await fastify.register(jwt, { secret: process.env.JWT_SECRET || 'dev-secret' });

  fastify.decorate('requireAuth', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const payload = await request.jwtVerify<{ id: number; role: Role; email: string }>();
      request.userCtx = payload;
    } catch {
      reply.code(401).send({ message: 'Non authentifié' });
    }
  });

  fastify.decorate(
    'requireRole',
    (roles: Role[]) => async (request: FastifyRequest, reply: FastifyReply) => {
      await (fastify as any).requireAuth(request, reply);
      if (!request.userCtx) return;
      if (!roles.includes(request.userCtx.role)) {
        reply.code(403).send({ message: 'Accès interdit' });
      }
    },
  );
});

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (
      roles: Role[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
