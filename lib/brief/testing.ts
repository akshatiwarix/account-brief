import type { Claim, ClaimKind, ClaimStance, ComposedSentence, QuestionId } from "./types";

/**
 * Builders for tests and for the sweep. Not a fixture library — every field a test cares about is
 * passed in, and the defaults exist only so a test about staleness does not have to restate a stance.
 *
 * Kept inside `lib/brief/` rather than in a test file because the sweep imports it too, and a helper
 * that lives in a `.test.ts` cannot be imported by a script.
 */

let counter = 0;

/** Deterministic ids, so a sweep run is reproducible. Reset between suites that assert on ids. */
export function resetClaimIds(): void {
  counter = 0;
}

export interface ClaimOverrides {
  id?: string;
  question_id?: QuestionId;
  assertion?: string;
  quote?: string;
  document_id?: string;
  subject_company_id?: string;
  kind?: ClaimKind;
  stance?: ClaimStance;
  value?: { n: number; unit: string } | null;
  observed_at?: string;
}

export function makeClaim(overrides: ClaimOverrides = {}): Claim {
  counter += 1;
  return {
    id: overrides.id ?? `t-${String(counter).padStart(3, "0")}`,
    question_id: overrides.question_id ?? "what_they_sell",
    assertion: overrides.assertion ?? "An assertion.",
    quote: overrides.quote ?? "a quote",
    span: null,
    document_id: overrides.document_id ?? "c01-d01",
    subject_company_id: overrides.subject_company_id ?? "c01",
    kind: overrides.kind ?? "fact",
    stance: overrides.stance ?? "company",
    value: overrides.value ?? null,
    observed_at: overrides.observed_at ?? "2026-07-01",
  };
}

export function makeComposed(
  question_id: QuestionId,
  text: string,
  claim_ids: string[],
): ComposedSentence {
  return { question_id, text, claim_ids };
}
