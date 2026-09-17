import 'dotenv/config';
import { z } from 'zod';

const environmentSchema = z.object({
  TYPESAFE_API_KEY: z.string().min(1),
  API_KEYS_DB_PATH: z.string().min(1),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JEV_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
});

export type Config = z.infer<typeof environmentSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return environmentSchema.parse(env);
}
