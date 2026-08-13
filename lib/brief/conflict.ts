import type { Claim, ClaimValue, Conflict, QuestionId } from "./types";

/**
 * Conflict detection that refuses to resolve anything.
 *
 * When the careers page says 200 people and the funding announcement says 340, something has to
 * give — and every summarizer gives by writing whichever number it saw last, confidently, without
 * mentioning that the other exists. The disagreement was the finding. A brief that hides it has
 * destroyed the most useful thing in the corpus.
 *
 * So a conflict is a first-class object, both sides survive, and nothing in this file picks a
 * winner. Recency is displayed by the UI, never applied here.
 *
 * The second half of the job is not crying wolf. "4,000 customers" and "42,000 seats" are ten times
 * apart and are not in disagreement: they count different things. A detector that compares numbers
 * without comparing units flags that pair, and once the `conflicting` marker appears on briefs where
 * nothing is wrong, a reviewer learns to ignore it — including on the brief where it matters. Hence
 * the unit table, and hence `c03`.
 */

/** Relative spread above which two same-unit numbers are treated as disagreeing. */
export const CONFLICT_TOLERANCE = 0.1;

/**
 * Unit synonyms, folded to a canonical unit. `scale` is a multiplier applied to the number, which is
 * what lets "eleven weeks" and "a single day" disagree in the same unit.
 */
const UNITS: readonly { canonical: string; scale: number; aliases: readonly string[] }[] = [
  {
    canonical: "people",
    scale: 1,
    aliases: ["people", "person", "employees", "employee", "staff", "headcount", "fte", "ftes", "team members", "engineers"],
  },
  {
    canonical: "customers",
    scale: 1,
    aliases: ["customers", "customer", "clients", "client", "organizations", "organisations", "accounts", "logos", "companies", "teams", "brands"],
  },
  {
    canonical: "seats",
    scale: 1,
    aliases: ["seats", "seat", "licenses", "licences", "editors", "users", "agents", "technicians", "reviewers"],
  },
  { canonical: "usd", scale: 1, aliases: ["usd", "$", "dollars", "dollar"] },
  { canonical: "usd", scale: 1_000, aliases: ["usd_thousands", "$k", "k usd"] },
  { canonical: "usd", scale: 1_000_000, aliases: ["usd_millions", "$m", "m usd", "million usd"] },
  { canonical: "usd", scale: 1_000_000_000, aliases: ["usd_billions", "$bn", "bn usd", "billion usd"] },
  { canonical: "eur", scale: 1, aliases: ["eur", "€", "euros"] },
  { canonical: "events", scale: 1, aliases: ["events", "event"] },
  { canonical: "events", scale: 1_000_000_000, aliases: ["billion events", "events_billions"] },
  { canonical: "days", scale: 1, aliases: ["days", "day"] },
  { canonical: "days", scale: 7, aliases: ["weeks", "week"] },
  { canonical: "days", scale: 30, aliases: ["months", "month"] },
  { canonical: "days", scale: 365, aliases: ["years", "year"] },
  { canonical: "hours", scale: 1, aliases: ["hours", "hour"] },
  { canonical: "percent", scale: 1, aliases: ["percent", "%", "pct", "percentage points"] },
  { canonical: "loads", scale: 1, aliases: ["loads", "load", "shipments"] },
  { canonical: "vehicles", scale: 1, aliases: ["vehicles", "vehicle", "vans", "trucks"] },
  { canonical: "robots", scale: 1, aliases: ["robots", "robot"] },
  { canonical: "sites", scale: 1, aliases: ["sites", "site", "depots", "depot", "offices", "office"] },
  { canonical: "reviews", scale: 1, aliases: ["reviews", "review"] },
  { canonical: "spreadsheets", scale: 1, aliases: ["spreadsheets", "spreadsheet"] },
];

/**
 * Fold a raw unit into a canonical unit and rescale the number.
 *
 * An unrecognised unit is kept verbatim rather than coerced into a neighbour. That is deliberate: an
 * unknown unit can only conflict with the identical unknown unit, so the failure mode of an
 * incomplete table is a missed conflict, never a fabricated one. Missing a conflict costs a reader
 * one finding; inventing one costs them their trust in the marker.
 */
export function normalizeValue(value: ClaimValue): ClaimValue {
  const raw = value.unit.trim().toLowerCase();
  const entry = UNITS.find((unit) => unit.aliases.includes(raw));
  if (!entry) return { n: value.n, unit: raw };
  return { n: value.n * entry.scale, unit: entry.canonical };
}

export function detectConflicts(claims: readonly Claim[]): Conflict[] {
  const groups = new Map<string, { question_id: QuestionId; unit: string; claims: Claim[] }>();

  for (const claim of claims) {
    if (claim.kind !== "number" || claim.value === null) continue;
    const value = normalizeValue(claim.value);
    // Zero and negatives cannot produce a meaningful ratio, and a metering company legitimately
    // reports zero of things. Excluded rather than special-cased downstream.
    if (!Number.isFinite(value.n) || value.n <= 0) continue;

    const key = `${claim.question_id}::${value.unit}`;
    const group = groups.get(key) ?? { question_id: claim.question_id, unit: value.unit, claims: [] };
    group.claims.push(claim);
    groups.set(key, group);
  }

  const conflicts: Conflict[] = [];
  for (const group of groups.values()) {
    if (group.claims.length < 2) continue;

    const numbers = group.claims.map((claim) => normalizeValue(claim.value!).n);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const spread = max / min - 1;
    if (spread <= CONFLICT_TOLERANCE) continue;

    conflicts.push({
      question_id: group.question_id,
      // Sorted so a conflict is stable across runs — the sweep asserts determinism and an
      // insertion-ordered array would make it depend on the model's output order.
      claim_ids: group.claims.map((claim) => claim.id).sort(),
      unit: group.unit,
      spread: Number(spread.toFixed(4)),
    });
  }

  return conflicts.sort((a, b) => a.question_id.localeCompare(b.question_id) || a.unit.localeCompare(b.unit));
}

/** Every claim id involved in any conflict — what `compose.ts` marks sentences against. */
export function conflictedClaimIds(conflicts: readonly Conflict[]): Set<string> {
  return new Set(conflicts.flatMap((conflict) => conflict.claim_ids));
}
