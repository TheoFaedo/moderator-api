import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { categories, moderationQuestion, type Category } from './categories.js';
import type { Config } from './config.js';
import type { JevClient } from './jev.js';
import { ApiKeyStore } from './key-store.js';
import { FixedWindowRateLimiter } from './rate-limit.js';

const config: Config = { TYPESAFE_API_KEY: 'upstream', API_KEYS_DB_PATH: ':memory:', HOST: '127.0.0.1', PORT: 3000, LOG_LEVEL: 'silent', JEV_TIMEOUT_MS: 100, RATE_LIMIT_PER_MINUTE: 60 };

describe('moderation API', () => {
  it('uses every category by default, calls Jev once, and exposes only public fields', async () => {
    const store = new ApiKeyStore(':memory:'); const key = store.create('test');
    const calls: Array<{ text: string; categories: readonly Category[] }> = [];
    const jev: JevClient = { async moderate(text, selected) { calls.push({ text, categories: selected }); return { probability: .8, confidence: .9 }; } };
    const app = buildApp(config, { store, jev });
    const response = await app.inject({ method: 'POST', url: '/v1/moderations', headers: { authorization: `Bearer ${key.secret}` }, payload: { text: 'bonjour' } });
    expect(response.statusCode).toBe(200);
    expect(Object.keys(response.json()).sort()).toEqual(['confidence', 'id', 'probability']);
    expect(calls).toHaveLength(1); expect(calls[0]!.categories).toEqual(categories);
    await app.close(); store.close();
  });
  it('rejects invalid, revoked, and rate-limited keys without calling Jev', async () => {
    const store = new ApiKeyStore(':memory:'); const key = store.create('test'); store.revoke(key.id);
    const jev: JevClient = { async moderate() { throw new Error('must not run'); } };
    const app = buildApp(config, { store, jev, limiter: new FixedWindowRateLimiter(1) });
    expect((await app.inject({ method: 'POST', url: '/v1/moderations', payload: { text: 'x' } })).statusCode).toBe(401);
    expect((await app.inject({ method: 'POST', url: '/v1/moderations', headers: { authorization: `Bearer ${key.secret}` }, payload: { text: 'x' } })).statusCode).toBe(401);
    const active = store.create('active');
    const request = { method: 'POST' as const, url: '/v1/moderations', headers: { authorization: `Bearer ${active.secret}` }, payload: { text: 'x' } };
    expect((await app.inject(request)).statusCode).toBe(502); // mocked upstream failure still consumes its quota
    expect((await app.inject(request)).statusCode).toBe(429);
    await app.close(); store.close();
  });
  it('builds a focused, independently described question', () => {
    const question = moderationQuestion(['racism_hate', 'violence_threat']);
    expect(question).toContain('Racism or hate'); expect(question).toContain('Violence or threat'); expect(question).not.toContain('Sexual content');
  });
});
