import { z } from 'zod';
import { categories } from './categories.js';

export const moderationRequestSchema = z.object({
  text: z.string().trim().min(1).max(100_000),
  categories: z.array(z.enum(categories)).min(1).max(categories.length).optional(),
}).strict();

export type ModerationRequest = z.infer<typeof moderationRequestSchema>;
