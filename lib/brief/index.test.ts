import { beforeEach, describe, expect, it } from "vitest";

import { documentsFor, companyById } from "@/data/corpus";

import { buildBrief } from "./index";
import { QUESTIONS } from "./questions";
import { renderMarkdown } from "./render";
import { makeClaim, makeComposed, resetClaimIds } from "./testing";
import { textAt } from "./resolve";
import type { Claim, ComposedSentence } from "./types";

beforeEach(resetClaimIds);

const AS_OF = "2026-08-01";
const company = companyById("c02")!;
const documents = documentsFor("c02");

/** The two headcount claims that make `c02` a conflict, quoted verbatim from the corpus. */
function headcountClaims(): Claim[] {
  return [
    makeClaim({
      id: "old",
      question_id: "scale",
      document_id: "c02-d03",
      subject_company_id: "c02",
      kind: "number",
      stance: "company",
      value: { n: 200, unit: "people" },
      quote: "We are a team of 200 people across Memphis, Rotterdam and Singapore",
      assertion: "Cadence Freight had 200 people in April 2026.",
      observed_at: "2026-04-02",
    }),
    makeClaim({
      id: "new",
      question_id: "scale",
      document_id: "c02-d04",
      subject_company_id: "c02",
      kind: "number",
      stance: "company",
      value: { n: 340, unit: "people" },
      quote: "The company now employs 340 employees",
      assertion: "Cadence Freight employs 340 people.",
      observed_at: "2026-06-15",
    }),
  ];
}

function build(claims: Claim[], composed: ComposedSentence[]) {
  return buildBrief({ company, documents, claims, composed, asOf: AS_OF });
}

describe("buildBrief", () => {
  it("renders both sides of a conflict and picks neither", () => {
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Cadence Freight reports 200 people.", ["old"]),
      makeComposed("scale", "Cadence Freight reports 340 employees.", ["new"]),
    ]);

    const scale = questionIn(brief, "scale");
    expect(scale?.sentences).toHaveLength(2);
    expect(scale?.sentences.every((sentence) => sentence.conflicting)).toBe(true);
    expect(brief.conflicts).toHaveLength(1);
    expect(brief.conflicts[0]?.claim_ids).toEqual(["new", "old"]);
  });

  it("prefixes the older side of the conflict with its date", () => {
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Cadence Freight reports 200 people.", ["old"]),
      makeComposed("scale", "Cadence Freight reports 340 employees.", ["new"]),
    ]);
    const sentences = questionIn(brief, "scale")?.sentences ?? [];
    expect(sentences[0]?.text.startsWith("As of April 2026, ")).toBe(true);
    expect(sentences[1]?.as_of).toBeNull();
  });

  it("stores every surviving claim with a span that points at its own quote", () => {
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Cadence Freight reports 340 employees.", ["new"]),
    ]);
    for (const claim of brief.claims) {
      const source = documents.find((document) => document.id === claim.document_id)!;
      expect(claim.span).not.toBeNull();
      expect(textAt(source.text, claim.span!)).toBe(claim.quote);
    }
  });

  it("drops a fabricated quote and the sentence that cited it", () => {
    const brief = build(
      [
        makeClaim({
          id: "fake",
          question_id: "scale",
          document_id: "c02-d04",
          subject_company_id: "c02",
          kind: "number",
          value: { n: 900, unit: "people" },
          quote: "The company now employs 900 employees",
          observed_at: "2026-06-15",
        }),
      ],
      [makeComposed("scale", "Cadence Freight employs 900 people.", ["fake"])],
    );

    expect(brief.claims).toEqual([]);
    expect(questionIn(brief, "scale")?.sentences).toEqual([]);
    expect(reasons(brief)).toContain("quote_not_found");
    expect(reasons(brief)).toContain("no_surviving_citation");
  });

  it("reports an unroutable question without spending anything", () => {
    const c05 = companyById("c05")!;
    const brief = buildBrief({
      company: c05,
      documents: documentsFor("c05"),
      claims: [],
      composed: [],
      asOf: AS_OF,
    });

    const complaints = questionIn(brief, "third_party_complaints");
    expect(complaints?.unanswerable?.reason).toBe("unroutable");
    expect(complaints?.unanswerable?.missing_kinds).toEqual(["review_site", "news"]);
  });

  it("distinguishes an unroutable question from one whose claims all died", () => {
    const brief = build(
      [
        makeClaim({
          id: "dead",
          question_id: "what_they_sell",
          document_id: "c02-d01",
          quote: "a sentence that is not in the homepage",
        }),
      ],
      [],
    );
    const sell = questionIn(brief, "what_they_sell");
    // The homepage exists, so routing succeeded; the claim died at the gate.
    expect(sell?.unanswerable?.reason).toBe("no_surviving_claims");
  });

  it("counts coverage as routable versus answered", () => {
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Cadence Freight reports 340 employees.", ["new"]),
    ]);
    expect(brief.coverage.total).toBe(QUESTIONS.length);
    expect(brief.coverage.answered).toBe(1);
    expect(brief.coverage.routable).toBeGreaterThan(brief.coverage.answered);
  });

  it("enforces the per-question cap out loud rather than truncating silently", () => {
    const claims = Array.from({ length: 5 }, (_, index) =>
      makeClaim({
        id: `c${index}`,
        question_id: "pricing_shape",
        document_id: "c02-d02",
        subject_company_id: "c02",
        quote: "Cadence is priced on load volume, not seats",
        observed_at: "2026-05-11",
      }),
    );
    const composed = claims.map((claim, index) =>
      makeComposed("pricing_shape", `Sentence ${index}.`, [claim.id]),
    );

    const brief = build(claims, composed);
    // `pricing_shape` caps at 2.
    expect(questionIn(brief, "pricing_shape")?.sentences).toHaveLength(2);
    expect(brief.rejected.filter((rejection) => rejection.reason === "over_question_cap")).toHaveLength(3);
  });

  it("gives every rejection a reason and a non-empty detail", () => {
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Unsupported.", ["ghost"]),
    ]);
    expect(brief.rejected.length).toBeGreaterThan(0);
    for (const rejection of brief.rejected) {
      expect(rejection.reason).toBeTruthy();
      expect(rejection.detail.trim().length).toBeGreaterThan(10);
    }
  });

  it("is a pure function of its inputs", () => {
    const once = build(headcountClaims(), [makeComposed("scale", "A.", ["new"])]);
    const twice = build(headcountClaims(), [makeComposed("scale", "A.", ["new"])]);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it("never renders a sentence with zero citations", () => {
    // The load-bearing invariant, asserted here and again across every company in the sweep.
    const brief = build(headcountClaims(), [
      makeComposed("scale", "Sourced.", ["new"]),
      makeComposed("scale", "Unsourced.", []),
      makeComposed("scale", "Ghost-sourced.", ["nope"]),
    ]);
    for (const section of brief.sections) {
      for (const question of section.questions) {
        for (const sentence of question.sentences) {
          expect(sentence.claim_ids.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("renderMarkdown", () => {
  const brief = build(headcountClaims(), [
    makeComposed("scale", "Cadence Freight reports 200 people.", ["old"]),
    makeComposed("scale", "Cadence Freight reports 340 employees.", ["new"]),
  ]);
  const markdown = renderMarkdown(brief, documents);

  it("numbers footnotes by first appearance and resolves them to a document", () => {
    expect(markdown).toContain("[^1]");
    expect(markdown).toContain("[^1]: Careers — Cadence Freight — careers, 2026-04-02");
  });

  it("writes absence out explicitly instead of dropping empty questions", () => {
    expect(markdown).toContain("Not answerable from available sources");
  });

  it("marks the conflict in the body and lists it unresolved", () => {
    expect(markdown).toContain("**conflicting**");
    expect(markdown).toContain("Unresolved disagreements");
    expect(markdown).toContain("200 people (2026-04-02) vs 340 people (2026-06-15)");
  });

  it("says so plainly when nothing was rejected", () => {
    // c02's every question routes and every claim resolves, so its rejected section is empty — and
    // an empty rejected section is information, not a reason to hide the heading.
    expect(markdown).toContain("## What was rejected");
    expect(markdown).toContain("_Nothing was rejected for this company._");
  });

  it("counts rejections by reason when there are some", () => {
    const c05 = companyById("c05")!;
    const thin = buildBrief({
      company: c05,
      documents: documentsFor("c05"),
      claims: [],
      composed: [],
      asOf: AS_OF,
    });
    const output = renderMarkdown(thin, documentsFor("c05"));
    expect(output).toMatch(/- \d+ × `unroutable`/);
  });

  it("states that the corpus is synthetic", () => {
    expect(markdown).toContain("authored and synthetic");
  });
});

function questionIn(brief: ReturnType<typeof build>, id: string) {
  return brief.sections
    .flatMap((section) => section.questions)
    .find((question) => question.question_id === id);
}

function reasons(brief: ReturnType<typeof build>): string[] {
  return brief.rejected.map((rejection) => rejection.reason);
}
