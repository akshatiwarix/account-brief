import { describe, expect, it } from "vitest";

import { COMPANIES, DEFAULT_AS_OF, DOCUMENTS, TRAPS, documentsFor } from "@/data/corpus";
import { QUESTIONS, missingKinds, questionById, routeDocuments } from "@/lib/brief/questions";
import { DOCUMENT_KINDS } from "@/lib/brief/types";

/**
 * The corpus is the test suite for the gate, so its shape is pinned here. Every assertion below
 * exists because flattening the corpus — making it uniform, plausible and boring — would leave the
 * gate with nothing to catch and every brief would look like it worked.
 *
 * This test lives in `lib/research/` rather than `data/` because `vitest.config.mts` only globs
 * `lib/**`. A test placed next to the corpus would silently never run, which is exactly the class of
 * problem it is here to prevent.
 */

describe("corpus shape", () => {
  it("holds ten companies with unique ids and .example domains", () => {
    expect(COMPANIES).toHaveLength(10);
    expect(new Set(COMPANIES.map((company) => company.id)).size).toBe(10);
    for (const company of COMPANIES) {
      expect(company.domain.endsWith(".example")).toBe(true);
    }
  });

  it("documents a trap for every company", () => {
    for (const company of COMPANIES) {
      expect(TRAPS[company.id]).toBeTruthy();
    }
  });

  it("gives every company between two and eleven documents", () => {
    for (const company of COMPANIES) {
      const count = documentsFor(company.id).length;
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(11);
    }
  });

  it("has unique document ids owned by the company they are filed under", () => {
    expect(new Set(DOCUMENTS.map((document) => document.id)).size).toBe(DOCUMENTS.length);
    for (const document of DOCUMENTS) {
      expect(document.id.startsWith(document.company_id)).toBe(true);
    }
  });

  it("uses every document kind at least twice", () => {
    // A kind used once means one authored document silently owns a whole routing path, and the day
    // it is edited a question stops being answerable with no test to notice.
    for (const kind of DOCUMENT_KINDS) {
      const count = DOCUMENTS.filter((document) => document.kind === kind).length;
      expect(count, `document kind ${kind}`).toBeGreaterThanOrEqual(2);
    }
  });

  it("dates every document at or before the default as-of", () => {
    for (const document of DOCUMENTS) {
      expect(document.retrieved_at <= DEFAULT_AS_OF, document.id).toBe(true);
    }
  });

  it("writes prose, not filler — every document is a few real paragraphs", () => {
    for (const document of DOCUMENTS) {
      expect(document.text.length, document.id).toBeGreaterThan(280);
    }
  });
});

describe("the engineered traps", () => {
  it("c01 can route every extractable question", () => {
    const documents = documentsFor("c01");
    for (const question of QUESTIONS) {
      if (question.answerable_from.length === 0) continue;
      expect(routeDocuments(question, documents).length, question.id).toBeGreaterThan(0);
    }
  });

  it("c02 states two different headcounts in two documents", () => {
    const documents = documentsFor("c02");
    const older = documents.find((document) => document.text.includes("a team of 200 people"));
    const newer = documents.find((document) => document.text.includes("340 employees"));
    expect(older?.published_at).toBe("2026-04-02");
    expect(newer?.published_at).toBe("2026-06-15");
    // The older side must be past the 120-day `scale` budget at the default as-of, so the brief
    // shows a conflict *and* an `as of` prefix on one side of it.
    expect(daysBetween(older?.published_at ?? DEFAULT_AS_OF, DEFAULT_AS_OF)).toBeGreaterThan(
      questionById("scale").freshness_days,
    );
  });

  it("c03 states two scale numbers in different units", () => {
    const documents = documentsFor("c03");
    expect(documents.some((document) => document.text.includes("4,000 customers"))).toBe(true);
    expect(documents.some((document) => document.text.includes("42,000 seats"))).toBe(true);
  });

  it("c04 has pricing inside 3x its budget and an announcement outside it", () => {
    const documents = documentsFor("c04");
    const pricing = documents.find((document) => document.kind === "pricing");
    const ancient = documents.find((document) => document.published_at === "2022-03-01");
    const budget = questionById("pricing_shape").freshness_days;
    const pricingAge = daysBetween(pricing?.published_at ?? DEFAULT_AS_OF, DEFAULT_AS_OF);
    expect(pricingAge).toBeGreaterThan(budget);
    expect(pricingAge).toBeLessThan(budget * 3);
    expect(daysBetween(ancient?.published_at ?? DEFAULT_AS_OF, DEFAULT_AS_OF)).toBeGreaterThan(
      budget * 3,
    );
  });

  it("c05 has no third-party sources at all, so its Pain question is unroutable", () => {
    const documents = documentsFor("c05");
    const complaints = questionById("third_party_complaints");
    expect(routeDocuments(complaints, documents)).toEqual([]);
    expect(missingKinds(complaints, documents)).toEqual(["review_site", "news"]);
  });

  it("c06 names a competitor's product in its own documents", () => {
    const documents = documentsFor("c06");
    const mentions = documents.filter((document) => document.text.includes("Zafira Sheets"));
    expect(mentions.length).toBeGreaterThanOrEqual(3);
    // The specific sentence a naive extractor lifts as a fact about Sparkfold.
    expect(
      documents.some((document) => document.text.includes("Zafira Sheets has more than 30,000 teams")),
    ).toBe(true);
  });

  it("c07 keeps its key numbers out of prose", () => {
    const documents = documentsFor("c07");
    const pricing = documents.find((document) => document.kind === "pricing");
    expect(pricing?.text).toContain("| Growth | $900 | 2,000,000 | 25 |");
    expect(pricing?.text).toContain("*Table 1 — plan limits effective 1 June 2026.");
    const filing = documents.find((document) => document.kind === "filing_excerpt");
    expect(filing?.text).toContain("| Employees | 71 | 118 |");
  });

  it("c08 is written almost entirely in the future tense", () => {
    const documents = documentsFor("c08");
    // Plural-tolerant: the corpus says both "intends to" and "we intend to". The first version of
    // this regex only matched the third person and undercounted its own trap by half.
    const forwardMarkers = /\b(plans? to|intends? to|expects? to|will begin|aims? to|subject to)\b/i;
    const forward = documents.filter((document) => forwardMarkers.test(document.text));
    // Five of seven. The two that do not are the trade-press piece and the job post — a corpus where
    // even the outside coverage is hedged would be making the trap too easy.
    expect(forward.length).toBeGreaterThanOrEqual(5);
  });

  it("c09 has two documents and cannot route half its questions", () => {
    const documents = documentsFor("c09");
    expect(documents).toHaveLength(2);
    const extractable = QUESTIONS.filter((question) => question.answerable_from.length > 0);
    const unroutable = extractable.filter(
      (question) => routeDocuments(question, documents).length === 0,
    );
    // Six of the eleven extractable questions, known before a token is spent: scale, pricing shape,
    // recent changes, what shipped, stated priorities, third-party complaints.
    expect(unroutable).toHaveLength(6);
    expect(unroutable.map((question) => question.id)).toEqual([
      "scale",
      "pricing_shape",
      "recent_changes",
      "what_they_shipped",
      "stated_priorities",
      "third_party_complaints",
    ]);
  });

  it("c10 disagrees with the press about its own customer count", () => {
    const documents = documentsFor("c10");
    expect(
      documents.some(
        (document) =>
          document.kind === "homepage" && document.text.includes("Over 900 enterprise customers"),
      ),
    ).toBe(true);
    expect(
      documents.some(
        (document) => document.kind === "news" && document.text.includes("430 paying customers"),
      ),
    ).toBe(true);
  });
});

function daysBetween(from: string, to: string): number {
  const day = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(to) - Date.parse(from)) / day);
}
