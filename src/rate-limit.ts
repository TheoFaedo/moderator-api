export class FixedWindowRateLimiter {
  private readonly buckets = new Map<string, { startedAt: number; count: number }>();
  constructor(private readonly maximum: number, private readonly windowMs = 60_000) {}
  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
    const existing = this.buckets.get(key);
    const bucket = !existing || now - existing.startedAt >= this.windowMs ? { startedAt: now, count: 0 } : existing;
    bucket.count += 1;
    this.buckets.set(key, bucket);
    return { allowed: bucket.count <= this.maximum, retryAfterSeconds: Math.max(1, Math.ceil((this.windowMs - (now - bucket.startedAt)) / 1000)) };
  }
}
