import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import authPlugin from './plugins/auth.js';
import { registerApi } from './routes/api.js';

const app = Fastify({ logger: false });
await app.register(cors, { origin: true });
await app.register(multipart);
await app.register(authPlugin);

await app.register(fastifyStatic, {
  root: path.join(process.cwd(), '..', 'uploads'),
  prefix: '/uploads/',
  list: false,
});

await registerApi(app);

const port = Number(process.env.PORT || 3001);
app.listen({ port, host: '0.0.0.0' }).catch((e) => {
  console.error(e);
  process.exit(1);
});
