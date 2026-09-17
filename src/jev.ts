import { choice, TypeSafeClient } from '@typesafe-ai/sdk';
import type { Category } from './categories.js';
import { moderationQuestion } from './categories.js';

export interface ModerationDecision { probability: number; confidence: number }
export interface JevClient { moderate(text: string, categories: readonly Category[]): Promise<ModerationDecision> }

export class TypeSafeJevClient implements JevClient {
  private readonly client: TypeSafeClient;
  constructor(private readonly timeoutMs: number, apiKey = process.env.TYPESAFE_API_KEY) {
    this.client = new TypeSafeClient({ apiKey, retry: { maxRetries: 0 } });
  }
  async moderate(text: string, selected: readonly Category[]): Promise<ModerationDecision> {
    const response = await this.client.systemOne({
      state: { text },
      questions: {
        matches: choice(moderationQuestion(selected), {
          true: 'The text matches at least one selected category.',
          false: 'The text matches none of the selected categories.',
        }),
      },
    }, { timeout: this.timeoutMs, retry: { maxRetries: 0 } });
    const answer = response.answers.matches;
    return { probability: answer.probabilities.true, confidence: answer.confidence };
  }
}
