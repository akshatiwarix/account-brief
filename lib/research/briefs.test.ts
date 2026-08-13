import { describe, expect, it } from "vitest";

import { allBriefs, briefFor, generatedCompanyIds } from "@/data/briefs";
import { COMPANIES, DEFAULT_AS_OF, documentsFor } from "@/data/corpus";
import { QUESTIONS } from "@/lib/brief/questions";
import { textAt } from "@/lib/brief/resolve";
import { hashInputs } from "@/lib/research/hash";

/**
 * The committed fixtures, checked against the corpus they claim to describe.
 *
 * `data/briefs.ts` already throws at import time on a hash mismatch, so half of this suite exists to
 * make that failure legible: a thrown error during a Next build points at a bundler, while a failing
 * test names the company and tells you to regenerate it.
 *
 * The other half re-derives what each fixture asserts. A stored span is not evidence that a quote
 * exists — it is evidence that something once thought so.
 *
 * The suite tolerates a PARTIAL set on purpose. The free tier for this model allows 20 requests per
 * day and a full generation is exactly 20, so the repo has to be able to ship half-generated without
 * either lying about it or failing its own tests. What it does not tolerate is a fixture that exists
 * and is wrong.
 */

const generated = generatedCompanyIds();

describe("committed fixtures", () => {
  it("only names companies that exist in the corpus", () => {
    for (const id of generated) {
      expect(COMPANIES.map((company) => company.id)).toContain(id);
    }
  });

  it("reports how many of the ten are generated", () => {
    // Not an assertion about completeness — a record of it, so the number is visible in test output
    // rather than discovered by clicking around the app.
    console.log(`fixtures: ${generated.length}/${COMPANIES.length} generated (${generated.join(", ") || "none"})`);
    expect(allBriefs()).toHaveLength(generated.length);
  });

  it.runIf(generated.length > 0)("are dated at the default as-of and hash against the corpus", () => {
    for (const id of generated) {
      const brief = briefFor(id)!;
      expect(brief.as_of).toBe(DEFAULT_AS_OF);
      expect(hashInputs(documentsFor(id), brief.as_of)).toHaveLength(32);
    }
  });

  it.runIf(generated.length > 0)("every stored span still points at its own quote", () => {
    for (const id of generated) {
      const brief = briefFor(id)!;
      const documents = documentsFor(id);

      for (const claim of brief.claims) {
        const source = documents.find((document) => document.id === claim.document_id);
        expect(source, `${claim.id} cites ${claim.document_id}`).toBeDefined();
        expect(claim.span, claim.id).not.toBeNull();
        expect(textAt(source!.text, claim.span!), claim.id).toBe(claim.quote);
      }
    }
  });

  it.runIf(generated.length > 0)("every rendered sentence cites at least one surviving claim", () => {
    // The load-bearing invariant, asserted against what actually shipped rather than a test double.
    for (const id of generated) {
      const brief = briefFor(id)!;
      const survivingIds = new Set(brief.claims.map((claim) => claim.id));

      for (const section of brief.sections) {
        for (const question of section.questions) {
          for (const sentence of question.sentences) {
            expect(sentence.claim_ids.length, `${id} ${question.question_id}`).toBeGreaterThan(0);
            for (const claimId of sentence.claim_ids) {
              expect(survivingIds.has(claimId), `${id} cites ${claimId}`).toBe(true);
            }
          }
        }
      }
    }
  });

  it.runIf(generated.length > 0)("carry all twelve questions, answered or not", () => {
    for (const id of generated) {
      const ids = briefFor(id)!.sections.flatMap((section) =>
        section.questions.map((question) => question.question_id),
      );
      expect(ids.sort()).toEqual(QUESTIONS.map((question) => question.id).sort());
    }
  });

  it.runIf(generated.length > 0)("record a cost, so the README's numbers come from a run", () => {
    for (const id of generated) {
      const cost = briefFor(id)!.cost;
      expect(cost, id).not.toBeNull();
      expect(cost!.extract_calls).toBeGreaterThan(0);
      expect(cost!.claims_surviving).toBeLessThanOrEqual(cost!.claims_returned);
    }
  });
});
