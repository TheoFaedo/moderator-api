import { randomUUID } from 'node:crypto';
import Fastify, { LogController, type FastifyInstance } from 'fastify';
import { categories, type Category } from './categories.js';
import type { Config } from './config.js';
import { TypeSafeJevClient, type JevClient } from './jev.js';
import { ApiKeyStore } from './key-store.js';
import { FixedWindowRateLimiter } from './rate-limit.js';
import { moderationRequestSchema } from './schema.js';

declare module 'fastify' { interface FastifyRequest { apiKeyPrefix?: string } }

export interface AppDependencies { store?: ApiKeyStore; jev?: JevClient; limiter?: FixedWindowRateLimiter }

export function buildApp(config: Config, dependencies: AppDependencies = {}): FastifyInstance {
  const store = dependencies.store ?? new ApiKeyStore(config.API_KEYS_DB_PATH);
  const jev = dependencies.jev ?? new TypeSafeJevClient(config.JEV_TIMEOUT_MS, config.TYPESAFE_API_KEY);
  const limiter = dependencies.limiter ?? new FixedWindowRateLimiter(config.RATE_LIMIT_PER_MINUTE);
  const app = Fastify({ logger: { level: config.LOG_LEVEL }, logController: new LogController({ disableRequestLogging: true }), genReqId: () => randomUUID() });

  app.addHook('onResponse', (request, reply, done) => {
    request.log.info({ requestId: request.id, statusCode: reply.statusCode, latencyMs: reply.elapsedTime, keyPrefix: request.apiKeyPrefix ? `${request.apiKeyPrefix}…` : undefined }, 'request completed');
    done();
  });
  app.addHook('onClose', () => { if (!dependencies.store) store.close(); });

  app.get('/healthz', async () => ({ status: 'ok' }));
  app.get('/readyz', async () => ({ status: 'ready' }));

  app.post('/v1/moderations', async (request, reply) => {
    const authorization = request.headers.authorization;
    const match = authorization?.match(/^Bearer (.+)$/);
    if (!match) return reply.code(401).send({ error: { code: 'unauthorized', message: 'Bearer token required' } });
    const key = store.authenticate(match[1]!);
    if (!key) return reply.code(401).send({ error: { code: 'unauthorized', message: 'Invalid API key' } });
    request.apiKeyPrefix = key.prefix;
    const rate = limiter.consume(key.id);
    if (!rate.allowed) {
      reply.header('Retry-After', rate.retryAfterSeconds);
      return reply.code(429).send({ error: { code: 'rate_limited', message: 'Rate limit exceeded' } });
    }
    const parsed = moderationRequestSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: { code: 'invalid_request', message: 'Invalid request body' } });
    const selected: readonly Category[] = parsed.data.categories ?? categories;
    try {
      const decision = await jev.moderate(parsed.data.text, selected);
      if (!Number.isFinite(decision.probability) || !Number.isFinite(decision.confidence)) throw new Error('Invalid upstream decision');
      return reply.code(200).send({ id: request.id, probability: decision.probability, confidence: decision.confidence });
    } catch (error) {
      const timedOut = error instanceof Error && /timeout|abort/i.test(error.name + error.message);
      return reply.code(timedOut ? 504 : 502).send({ error: { code: timedOut ? 'upstream_timeout' : 'upstream_unavailable', message: timedOut ? 'Moderation service timed out' : 'Moderation service unavailable' } });
    }
  });
  return app;
}
