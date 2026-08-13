import { beforeEach, describe, expect, it } from "vitest";

import { CONFLICT_TOLERANCE, conflictedClaimIds, detectConflicts, normalizeValue } from "./conflict";
import { makeClaim, resetClaimIds } from "./testing";

beforeEach(resetClaimIds);

describe("unit folding", () => {
  it("folds synonyms to one canonical unit", () => {
    expect(normalizeValue({ n: 200, unit: "employees" })).toEqual({ n: 200, unit: "people" });
    expect(normalizeValue({ n: 200, unit: "headcount" })).toEqual({ n: 200, unit: "people" });
    expect(normalizeValue({ n: 200, unit: "STAFF" })).toEqual({ n: 200, unit: "people" });
  });

  it("rescales, so eleven weeks and one day are comparable", () => {
    expect(normalizeValue({ n: 11, unit: "weeks" })).toEqual({ n: 77, unit: "days" });
    expect(normalizeValue({ n: 1, unit: "day" })).toEqual({ n: 1, unit: "days" });
  });

  it("scales currency magnitudes", () => {
    expect(normalizeValue({ n: 28, unit: "usd_millions" })).toEqual({ n: 28_000_000, unit: "usd" });
  });

  it("keeps an unrecognised unit verbatim instead of guessing a neighbour", () => {
    // The failure mode of an incomplete table has to be a missed conflict, never an invented one.
    expect(normalizeValue({ n: 5, unit: "widgets" })).toEqual({ n: 5, unit: "widgets" });
  });
});

describe("detectConflicts", () => {
  it("flags two same-unit numbers beyond tolerance", () => {
    const conflicts = detectConflicts([
      makeClaim({ id: "a", question_id: "scale", kind: "number", value: { n: 200, unit: "employees" } }),
      makeClaim({ id: "b", question_id: "scale", kind: "number", value: { n: 340, unit: "employees" } }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.claim_ids).toEqual(["a", "b"]);
    expect(conflicts[0]?.unit).toBe("people");
    expect(conflicts[0]?.spread).toBeCloseTo(0.7, 4);
  });

  it("does not flag numbers in different units, however far apart", () => {
    // The c03 trap: 4,000 customers and 42,000 seats count different things.
    expect(
      detectConflicts([
        makeClaim({ question_id: "scale", kind: "number", value: { n: 4_000, unit: "customers" } }),
        makeClaim({ question_id: "scale", kind: "number", value: { n: 42_000, unit: "seats" } }),
      ]),
    ).toEqual([]);
  });

  it("does not flag numbers answering different questions", () => {
    expect(
      detectConflicts([
        makeClaim({ question_id: "scale", kind: "number", value: { n: 100, unit: "people" } }),
        makeClaim({ question_id: "pricing_shape", kind: "number", value: { n: 900, unit: "people" } }),
      ]),
    ).toEqual([]);
  });

  it("tolerates rounding differences", () => {
    const within = 1 + CONFLICT_TOLERANCE / 2;
    expect(
      detectConflicts([
        makeClaim({ question_id: "scale", kind: "number", value: { n: 400, unit: "people" } }),
        makeClaim({ question_id: "scale", kind: "number", value: { n: 400 * within, unit: "people" } }),
      ]),
    ).toEqual([]);
  });

  it("ignores claims that are not numbers, and numbers without a value", () => {
    expect(
      detectConflicts([
        makeClaim({ question_id: "scale", kind: "fact", value: { n: 1, unit: "people" } }),
        makeClaim({ question_id: "scale", kind: "number", value: null }),
      ]),
    ).toEqual([]);
  });

  it("ignores zero and negative magnitudes rather than dividing by them", () => {
    expect(
      detectConflicts([
        makeClaim({ question_id: "scale", kind: "number", value: { n: 0, unit: "people" } }),
        makeClaim({ question_id: "scale", kind: "number", value: { n: 340, unit: "people" } }),
      ]),
    ).toEqual([]);
  });

  it("puts three disagreeing claims in one conflict, not three pairs", () => {
    const conflicts = detectConflicts([
      makeClaim({ id: "a", question_id: "scale", kind: "number", value: { n: 100, unit: "people" } }),
      makeClaim({ id: "b", question_id: "scale", kind: "number", value: { n: 250, unit: "people" } }),
      makeClaim({ id: "c", question_id: "scale", kind: "number", value: { n: 900, unit: "people" } }),
    ]);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]?.claim_ids).toEqual(["a", "b", "c"]);
  });

  it("is order-independent and sorted, so a rebuild is byte-identical", () => {
    const one = makeClaim({ id: "x", question_id: "scale", kind: "number", value: { n: 900, unit: "customers" } });
    const two = makeClaim({ id: "y", question_id: "scale", kind: "number", value: { n: 430, unit: "customers" } });
    expect(detectConflicts([one, two])).toEqual(detectConflicts([two, one]));
    expect(detectConflicts([one, two])[0]?.claim_ids).toEqual(["x", "y"]);
  });

  it("never resolves anything — every member of a conflict is still a claim", () => {
    const claims = [
      makeClaim({ id: "a", question_id: "scale", kind: "number", value: { n: 200, unit: "people" } }),
      makeClaim({ id: "b", question_id: "scale", kind: "number", value: { n: 340, unit: "people" } }),
    ];
    const conflicts = detectConflicts(claims);
    // Nothing is filtered: `detectConflicts` reports, and the caller keeps both sides.
    expect(conflictedClaimIds(conflicts)).toEqual(new Set(["a", "b"]));
    expect(claims).toHaveLength(2);
  });
});
