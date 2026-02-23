export interface RateLimiterOptions {
  /** Maximum number of requests allowed per window. Defaults to 400. */
  maxRequests?: number;
  /** Duration of the rate-limit window in milliseconds. Defaults to 60 000 ms (1 min). */
  windowMs?: number;
}

/**
 * Token-bucket style rate limiter that enforces a maximum number of requests
 * per sliding time window.  When the limit is reached, {@link throttle} suspends
 * the caller until the next window begins.
 */
export class RateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private requestCount: number;
  private windowStart: number;

  constructor(options?: RateLimiterOptions) {
    this.maxRequests = options?.maxRequests ?? 400;
    this.windowMs = options?.windowMs ?? 60_000;
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  /**
   * Call before each outgoing request.  Awaits if the per-window quota has
   * been exhausted; otherwise returns immediately after incrementing the counter.
   */
  async throttle(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.windowStart;

    // Roll over to a new window if enough time has passed
    if (elapsed >= this.windowMs) {
      this.windowStart = now;
      this.requestCount = 0;
    }

    // Suspend until the next window when the quota is exhausted
    if (this.requestCount >= this.maxRequests) {
      const waitMs = this.windowMs - (Date.now() - this.windowStart);
      await new Promise<void>((resolve) => setTimeout(resolve, waitMs));
      this.windowStart = Date.now();
      this.requestCount = 0;
    }

    this.requestCount++;
  }
}
