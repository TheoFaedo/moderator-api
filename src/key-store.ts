import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export interface ApiKeyRecord { id: string; prefix: string; name: string; createdAt: string; revokedAt: string | null }
interface ApiKeyRow extends ApiKeyRecord { hash: string }

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const keyPrefix = (secret: string) => secret.slice(0, 12);

export class ApiKeyStore {
  private readonly db: Database.Database;
  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new Database(path);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(`CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY, hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL,
      name TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT
    )`);
  }

  create(name: string): ApiKeyRecord & { secret: string } {
    if (!name.trim()) throw new Error('Key name must not be empty');
    const id = randomUUID();
    const secret = `jevmod_${randomBytes(32).toString('base64url')}`;
    const record = { id, prefix: keyPrefix(secret), name: name.trim(), createdAt: new Date().toISOString(), revokedAt: null };
    this.db.prepare('INSERT INTO api_keys (id, hash, prefix, name, created_at, revoked_at) VALUES (?, ?, ?, ?, ?, NULL)')
      .run(record.id, digest(secret), record.prefix, record.name, record.createdAt);
    return { ...record, secret };
  }

  authenticate(secret: string): ApiKeyRecord | null {
    const row = this.db.prepare('SELECT id, hash, prefix, name, created_at AS createdAt, revoked_at AS revokedAt FROM api_keys WHERE hash = ?').get(digest(secret)) as ApiKeyRow | undefined;
    // Keep a constant-time equality check even though the indexed digest already found the row.
    if (!row || !timingSafeEqual(Buffer.from(row.hash, 'hex'), Buffer.from(digest(secret), 'hex')) || row.revokedAt) return null;
    return { id: row.id, prefix: row.prefix, name: row.name, createdAt: row.createdAt, revokedAt: row.revokedAt };
  }

  list(): ApiKeyRecord[] {
    return this.db.prepare('SELECT id, prefix, name, created_at AS createdAt, revoked_at AS revokedAt FROM api_keys ORDER BY created_at DESC').all() as ApiKeyRecord[];
  }
  revoke(id: string): boolean {
    return this.db.prepare('UPDATE api_keys SET revoked_at = COALESCE(revoked_at, ?) WHERE id = ?').run(new Date().toISOString(), id).changes > 0;
  }
  close(): void { this.db.close(); }
}
