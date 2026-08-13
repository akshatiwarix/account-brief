import { questionById } from "./questions";
import type { Claim, Iso, Rejection } from "./types";

/**
 * Freshness, per question.
 *
 * "What do they sell" ages in years. "How big are they" ages in months. One global horizon would
 * either drop half the Company section or present a headcount from last winter as today's, so the
 * budget lives on the question rather than on the tool.
 *
 * Three states, and the middle one is the useful invention:
 *
 * - inside the budget → renders plainly
 * - past the budget, inside 3× → renders with an `As of February 2025` prefix
 * - past 3× → dropped as `stale`
 *
 * The middle state is what a rep actually needs. "Their pricing was $2,400 a robot eighteen months
 * ago" is a usable fact. "Their pricing is $2,400 a robot" is the same sentence with the date filed
 * off, and it walks someone into a call with a number that has moved. Dropping it entirely would
 * also be wrong — it is the only pricing evidence that exists for that company.
 */

export type Freshness = "fresh" | "aging" | "stale";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two date-only strings. Negative when `to` precedes `from`. */
export function ageInDays(from: Iso, to: Iso): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
}

export function freshnessOf(claim: Claim, asOf: Iso): { freshness: Freshness; age_days: number } {
  const budget = questionById(claim.question_id).freshness_days;
  const age = ageInDays(claim.observed_at, asOf);

  // A document dated after the as-of is not "very fresh", it is a corpus error. Treated as fresh
  // rather than thrown on, because the sweep is what should catch it, loudly, in one place.
  if (age <= budget) return { freshness: "fresh", age_days: Math.max(0, age) };
  if (age <= budget * 3) return { freshness: "aging", age_days: age };
  return { freshness: "stale", age_days: age };
}

export interface DropStaleResult {
  kept: Claim[];
  /** The as-of label for a kept claim that is aging, keyed by claim id. */
  asOfLabels: Map<string, Iso>;
  rejected: Rejection[];
}

export function dropStale(claims: readonly Claim[], asOf: Iso): DropStaleResult {
  const kept: Claim[] = [];
  const asOfLabels = new Map<string, Iso>();
  const rejected: Rejection[] = [];

  for (const claim of claims) {
    const { freshness, age_days } = freshnessOf(claim, asOf);
    const budget = questionById(claim.question_id).freshness_days;

    if (freshness === "stale") {
      rejected.push({
        reason: "stale",
        detail: `Dated ${claim.observed_at}, which is ${age_days} days before ${asOf} — past 3× the ${budget}-day budget for ${claim.question_id}.`,
        claim,
        question_id: claim.question_id,
      });
      continue;
    }

    if (freshness === "aging") asOfLabels.set(claim.id, claim.observed_at);
    kept.push(claim);
  }

  return { kept, asOfLabels, rejected };
}

/** `2025-02-10` → `February 2025`. Month precision only: the day is false precision on a web page. */
export function asOfLabel(date: Iso): string {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const [year, month] = date.split("-");
  const name = months[Number(month) - 1];
  return name && year ? `${name} ${year}` : date;
}
