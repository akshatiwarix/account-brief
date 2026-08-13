import { describe, expect, it } from "vitest";

import { DOCUMENTS, documentsFor } from "@/data/corpus";

import { normalize } from "./normalize";
import { findAllSpans, findSpan, resolveClaims, textAt } from "./resolve";
import type { Claim } from "./types";

const document = {
  id: "c01-d01",
  text: `# Close the books

Ledgerloop reconciles bank feeds, invoices and your general ledger in a single pass.

Built for controllers at companies between 200 and 2,000 employees — large enough that the close spans three systems.`,
};

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: "c01-q01-001",
    question_id: "what_they_sell",
    assertion: "Ledgerloop reconciles bank feeds, invoices and the general ledger in one pass.",
    quote: "reconciles bank feeds, invoices and your general ledger in a single pass",
    span: null,
    document_id: "c01-d01",
    subject_company_id: "c01",
    kind: "fact",
    stance: "company",
    value: null,
    observed_at: "2026-06-01",
    ...overrides,
  };
}

describe("findSpan", () => {
  const folded = normalize(document.text);

  it("finds an exact quote and returns the original characters", () => {
    const span = findSpan(document.text, folded, claim().quote);
    expect(span).not.toBeNull();
    expect(textAt(document.text, span!)).toBe(claim().quote);
  });

  it("finds a quote whose whitespace was re-flowed", () => {
    const span = findSpan(document.text, folded, "reconciles   bank feeds,\n  invoices");
    expect(span).not.toBeNull();
    expect(textAt(document.text, span!)).toBe("reconciles bank feeds, invoices");
  });

  it("finds a quote whose dash was swapped for a hyphen", () => {
    const span = findSpan(document.text, folded, "2,000 employees - large enough");
    expect(span).not.toBeNull();
    // The span points at the ORIGINAL em dash, not the hyphen the model sent.
    expect(textAt(document.text, span!)).toBe("2,000 employees — large enough");
  });

  it("finds a quote whose case differs", () => {
    expect(findSpan(document.text, folded, "LEDGERLOOP RECONCILES")).not.toBeNull();
  });

  it("rejects a paraphrase, however close", () => {
    // One word changed. This is the case a fuzzy matcher would let through, and the reason there is
    // no fuzzy matcher.
    expect(
      findSpan(document.text, folded, "reconciles bank feeds, invoices and your general ledger in one pass"),
    ).toBeNull();
  });

  it("rejects a quote with a fabricated number", () => {
    expect(findSpan(document.text, folded, "companies between 200 and 5,000 employees")).toBeNull();
  });

  it("rejects an empty or whitespace-only quote instead of matching at offset zero", () => {
    expect(findSpan(document.text, folded, "")).toBeNull();
    expect(findSpan(document.text, folded, "   \n  ")).toBeNull();
  });

  it("returns a span whose text folds to the quote it was given", () => {
    const quote = "Built for controllers at companies";
    const span = findSpan(document.text, folded, quote);
    expect(normalize(textAt(document.text, span!)).text).toBe(normalize(quote).text);
  });
});

describe("findAllSpans", () => {
  it("finds every occurrence and never overlaps", () => {
    const spans = findAllSpans("aa bb aa bb aa", "aa");
    expect(spans).toHaveLength(3);
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i]!.start).toBeGreaterThanOrEqual(spans[i - 1]!.end);
    }
  });

  it("returns nothing for an empty quote", () => {
    expect(findAllSpans("anything", "")).toEqual([]);
  });
});

describe("resolveClaims", () => {
  const documents = [document];

  it("attaches a span to a claim whose quote is present", () => {
    const result = resolveClaims({ claims: [claim()], documents, company_id: "c01" });
    expect(result.rejected).toEqual([]);
    expect(result.resolved[0]?.span).not.toBeNull();
  });

  it("rejects a claim whose quote is absent, naming the document", () => {
    const result = resolveClaims({
      claims: [claim({ quote: "Ledgerloop is the market leader in reconciliation" })],
      documents,
      company_id: "c01",
    });
    expect(result.resolved).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("quote_not_found");
    expect(result.rejected[0]?.detail).toContain("c01-d01");
  });

  it("distinguishes a second failure from a first", () => {
    const result = resolveClaims({
      claims: [claim({ quote: "not in the document" })],
      documents,
      company_id: "c01",
      afterRetry: true,
    });
    expect(result.rejected[0]?.reason).toBe("quote_not_found_after_retry");
  });

  it("rejects a claim about another company even when the quote resolves perfectly", () => {
    const result = resolveClaims({
      claims: [claim({ subject_company_id: "c99" })],
      documents,
      company_id: "c01",
    });
    expect(result.resolved).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("wrong_company");
    expect(result.rejected[0]?.detail).toContain("c99");
  });

  it("checks the subject before the quote, so a wrong-company claim is never mislabelled", () => {
    const result = resolveClaims({
      claims: [claim({ subject_company_id: "c99", quote: "also not in the document" })],
      documents,
      company_id: "c01",
    });
    expect(result.rejected[0]?.reason).toBe("wrong_company");
  });

  it("rejects a claim citing a document this company does not have", () => {
    const result = resolveClaims({
      claims: [claim({ document_id: "c02-d01" })],
      documents,
      company_id: "c01",
    });
    expect(result.rejected[0]?.detail).toContain("not among this company's documents");
  });

  it("gives every rejection a non-empty detail", () => {
    const result = resolveClaims({
      claims: [
        claim({ quote: "absent" }),
        claim({ subject_company_id: "c99" }),
        claim({ document_id: "nope" }),
      ],
      documents,
      company_id: "c01",
    });
    expect(result.rejected).toHaveLength(3);
    for (const rejection of result.rejected) {
      expect(rejection.detail.length).toBeGreaterThan(10);
    }
  });
});

describe("the c06 misattribution trap, end to end", () => {
  it("resolves the competitor quote and still rejects the claim", () => {
    const documents = documentsFor("c06");
    const careers = documents.find((entry) => entry.kind === "careers")!;
    const quote = "Zafira Sheets has more than 30,000 teams on its platform";

    // The quote is genuinely there. Span verification alone would pass this.
    expect(findSpan(careers.text, normalize(careers.text), quote)).not.toBeNull();

    const result = resolveClaims({
      claims: [
        claim({
          question_id: "scale",
          document_id: careers.id,
          subject_company_id: "zafira",
          quote,
          kind: "number",
        }),
      ],
      documents: documents.map((entry) => ({ id: entry.id, text: entry.text })),
      company_id: "c06",
    });

    expect(result.resolved).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("wrong_company");
  });
});

describe("real quotes from the corpus", () => {
  // Guards against a fold that works on hand-written fixtures and breaks on authored prose —
  // markdown tables, footnote daggers, em dashes in headings.
  it.each([
    ["c01-d02", "All plans are priced per seat"],
    ["c02-d04", "The company now employs 340 employees"],
    ["c07-d02", "| Growth | $900 | 2,000,000 | 25 |"],
    ["c07-d02", "Table 1 — plan limits effective 1 June 2026"],
    ["c07-d03", "| Employees | 71 | 118 |"],
    ["c10-d01", "Over 900 enterprise customers rely on Brightsill"],
    ["c10-d02", "puts the figure at 430 paying customers"],
  ])("%s contains %s", (documentId, quote) => {
    const source = DOCUMENTS.find((entry) => entry.id === documentId)!;
    const span = findSpan(source.text, normalize(source.text), quote);
    expect(span, quote).not.toBeNull();
    expect(normalize(textAt(source.text, span!)).text).toBe(normalize(quote).text);
  });
});
