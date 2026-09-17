import { loadConfig } from './config.js';
import { ApiKeyStore } from './key-store.js';

const [command, ...args] = process.argv.slice(2);
const store = new ApiKeyStore(loadConfig().API_KEYS_DB_PATH);
try {
  if (command === 'create') {
    const name = args.join(' ');
    if (!name) throw new Error('Usage: bun run keys create <name>');
    const key = store.create(name);
    console.log(`Created ${key.id} (${key.name})\nSecret (shown once): ${key.secret}`);
  } else if (command === 'list') {
    console.table(store.list().map(({ id, prefix, name, createdAt, revokedAt }) => ({ id, prefix: `${prefix}…`, name, createdAt, revokedAt: revokedAt ?? 'active' })));
  } else if (command === 'revoke') {
    if (args.length !== 1) throw new Error('Usage: bun run keys revoke <id>');
    if (!store.revoke(args[0]!)) throw new Error('Key not found');
    console.log('Key revoked');
  } else throw new Error('Usage: bun run keys <create|list|revoke>');
} finally { store.close(); }
