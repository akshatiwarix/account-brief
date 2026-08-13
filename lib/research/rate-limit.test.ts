import { describe, expect, it } from "vitest";

import { createRateLimiter } from "./rate-limit";

describe("rate limiter", () => {
  function fixedClock(start = 0) {
    let now = start;
    return { now: () => now, advance: (ms: number) => (now += ms) };
  }

  it("allows up to the limit, then refuses", () => {
    const clock = fixedClock();
    const take = createRateLimiter({ limit: 3, windowMs: 1000, now: clock.now });

    expect(take("ip").allowed).toBe(true);
    expect(take("ip").allowed).toBe(true);
    expect(take("ip").allowed).toBe(true);
    expect(take("ip").allowed).toBe(false);
  });

  it("counts down remaining", () => {
    const take = createRateLimiter({ limit: 2, windowMs: 1000, now: () => 0 });
    expect(take("ip").remaining).toBe(1);
    expect(take("ip").remaining).toBe(0);
  });

  it("keys are independent", () => {
    const take = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(take("a").allowed).toBe(true);
    expect(take("b").allowed).toBe(true);
    expect(take("a").allowed).toBe(false);
  });

  it("resets when the window rolls over", () => {
    const clock = fixedClock();
    const take = createRateLimiter({ limit: 1, windowMs: 1000, now: clock.now });
    expect(take("ip").allowed).toBe(true);
    expect(take("ip").allowed).toBe(false);
    clock.advance(1000);
    expect(take("ip").allowed).toBe(true);
  });

  it("reports seconds until reset, for Retry-After", () => {
    const clock = fixedClock();
    const take = createRateLimiter({ limit: 1, windowMs: 10_000, now: clock.now });
    take("ip");
    clock.advance(4_000);
    expect(take("ip").retry_after_seconds).toBe(6);
  });
});
