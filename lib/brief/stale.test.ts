import { beforeEach, describe, expect, it } from "vitest";

import { questionById } from "./questions";
import { ageInDays, asOfLabel, dropStale, freshnessOf } from "./stale";
import { makeClaim, resetClaimIds } from "./testing";

beforeEach(resetClaimIds);

const AS_OF = "2026-08-01";

describe("ageInDays", () => {
  it("counts whole days", () => {
    expect(ageInDays("2026-07-01", "2026-08-01")).toBe(31);
  });

  it("crosses a leap year without drifting", () => {
    expect(ageInDays("2024-02-28", "2024-03-01")).toBe(2);
  });

  it("goes negative for a document dated after the as-of", () => {
    expect(ageInDays("2026-09-01", AS_OF)).toBeLessThan(0);
  });
});

describe("freshnessOf", () => {
  const budget = questionById("scale").freshness_days; // 120

  it("is fresh at the budget boundary", () => {
    const claim = makeClaim({ question_id: "scale", observed_at: daysBefore(AS_OF, budget) });
    expect(freshnessOf(claim, AS_OF).freshness).toBe("fresh");
  });

  it("is aging one day past the budget", () => {
    const claim = makeClaim({ question_id: "scale", observed_at: daysBefore(AS_OF, budget + 1) });
    expect(freshnessOf(claim, AS_OF).freshness).toBe("aging");
  });

  it("is aging at exactly 3x the budget", () => {
    const claim = makeClaim({ question_id: "scale", observed_at: daysBefore(AS_OF, budget * 3) });
    expect(freshnessOf(claim, AS_OF).freshness).toBe("aging");
  });

  it("is stale one day past 3x", () => {
    const claim = makeClaim({ question_id: "scale", observed_at: daysBefore(AS_OF, budget * 3 + 1) });
    expect(freshnessOf(claim, AS_OF).freshness).toBe("stale");
  });

  it("uses the question's own budget, not a global one", () => {
    const at = daysBefore(AS_OF, 400);
    // 400 days is stale for `scale` (120) and merely aging for `what_they_sell` (540 → fresh).
    expect(freshnessOf(makeClaim({ question_id: "scale", observed_at: at }), AS_OF).freshness).toBe("stale");
    expect(
      freshnessOf(makeClaim({ question_id: "what_they_sell", observed_at: at }), AS_OF).freshness,
    ).toBe("fresh");
  });

  it("never reports a negative age", () => {
    const claim = makeClaim({ observed_at: "2026-12-01" });
    expect(freshnessOf(claim, AS_OF).age_days).toBe(0);
  });
});

describe("dropStale", () => {
  it("keeps fresh claims with no label", () => {
    const claim = makeClaim({ question_id: "scale", observed_at: daysBefore(AS_OF, 30) });
    const result = dropStale([claim], AS_OF);
    expect(result.kept).toHaveLength(1);
    expect(result.asOfLabels.size).toBe(0);
    expect(result.rejected).toEqual([]);
  });

  it("keeps aging claims and labels them with the source date", () => {
    const claim = makeClaim({ id: "old", question_id: "pricing_shape", observed_at: "2025-02-10" });
    const result = dropStale([claim], AS_OF);
    expect(result.kept).toHaveLength(1);
    expect(result.asOfLabels.get("old")).toBe("2025-02-10");
  });

  it("drops stale claims with a detail naming the budget and the gap", () => {
    const claim = makeClaim({ question_id: "recent_changes", observed_at: "2022-03-01" });
    const result = dropStale([claim], AS_OF);
    expect(result.kept).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("stale");
    expect(result.rejected[0]?.detail).toContain("2022-03-01");
    expect(result.rejected[0]?.detail).toContain("120-day budget");
  });
});

describe("asOfLabel", () => {
  it("renders month precision, because a day is false precision on a web page", () => {
    expect(asOfLabel("2025-02-10")).toBe("February 2025");
    expect(asOfLabel("2026-12-31")).toBe("December 2026");
  });

  it("falls back to the raw date rather than throwing on a malformed one", () => {
    expect(asOfLabel("garbage")).toBe("garbage");
  });
});

function daysBefore(date: string, days: number): string {
  const at = new Date(Date.parse(date) - days * 24 * 60 * 60 * 1000);
  return at.toISOString().slice(0, 10);
}
