import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RateLimiter } from '../../src/client/rate-limiter.js';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('throttle()', () => {
    it('does not delay when request count is below the limit', async () => {
      const limiter = new RateLimiter();
      const start = Date.now();

      for (let i = 0; i < 399; i++) {
        await limiter.throttle();
      }

      expect(Date.now() - start).toBe(0);
    });

    it('waits until next window when the limit (400) is reached', async () => {
      const limiter = new RateLimiter();

      // Consume all 400 slots
      for (let i = 0; i < 400; i++) {
        await limiter.throttle();
      }

      // The 401st call should wait for the next window
      let resolved = false;
      const promise = limiter.throttle().then(() => {
        resolved = true;
      });

      // Not yet resolved before the window expires
      await Promise.resolve();
      expect(resolved).toBe(false);

      // Advance time to the next window (60 seconds)
      vi.advanceTimersByTime(60_000);
      await promise;

      expect(resolved).toBe(true);
    });

    it('resets the counter after the window (60 s) has elapsed', async () => {
      const limiter = new RateLimiter();

      // Consume all 400 slots in the first window
      for (let i = 0; i < 400; i++) {
        await limiter.throttle();
      }

      // Advance into the next window
      vi.advanceTimersByTime(60_000);

      // Should be able to make 400 more requests without waiting
      const start = Date.now();
      for (let i = 0; i < 400; i++) {
        await limiter.throttle();
      }
      expect(Date.now() - start).toBe(0);
    });

    it('accepts custom maxRequests and windowMs via constructor', async () => {
      // Window of 10 s, max 2 requests
      const limiter = new RateLimiter({ maxRequests: 2, windowMs: 10_000 });

      await limiter.throttle();
      await limiter.throttle();

      // 3rd call should wait
      let resolved = false;
      const promise = limiter.throttle().then(() => {
        resolved = true;
      });

      await Promise.resolve();
      expect(resolved).toBe(false);

      vi.advanceTimersByTime(10_000);
      await promise;

      expect(resolved).toBe(true);
    });
  });
});
