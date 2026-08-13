import { beforeEach, describe, expect, it } from "vitest";

import {
  attributionFor,
  bindSentences,
  filterForwardLookingFromChange,
  repair,
} from "./compose";
import { makeClaim, makeComposed, resetClaimIds } from "./testing";

beforeEach(resetClaimIds);

describe("attributionFor", () => {
  it("marks a company-only sentence as stated", () => {
    expect(attributionFor([makeClaim({ stance: "company" })])).toBe("company_stated");
  });

  it("lets a third-party claim stand bare", () => {
    expect(attributionFor([makeClaim({ stance: "third_party" })])).toBe("bare");
  });

  it("lets one third-party citation carry a mixed sentence", () => {
    // If an outside source says it, the company agreeing does not turn it back into marketing.
    expect(
      attributionFor([makeClaim({ stance: "company" }), makeClaim({ stance: "third_party" })]),
    ).toBe("bare");
  });

  it("puts modality above stance", () => {
    // A plan reported by a journalist is still a plan. This is the c08 failure.
    expect(
      attributionFor([makeClaim({ stance: "third_party", kind: "forward_looking" })]),
    ).toBe("forward_looking");
  });

  it("marks a filings-only sentence as regulatory", () => {
    expect(attributionFor([makeClaim({ stance: "regulatory" })])).toBe("regulatory");
  });
});

describe("repair", () => {
  it("prefixes a company sentence that arrived as a bare assertion", () => {
    const { text, repaired } = repair("Verdanta is the leading platform for disclosure.", "company_stated");
    expect(repaired).toBe(true);
    expect(text).toBe("The company states that verdanta is the leading platform for disclosure.");
  });

  it("leaves a company sentence alone when the model already attributed it", () => {
    const { text, repaired } = repair("Verdanta positions itself as the leading platform.", "company_stated");
    expect(repaired).toBe(false);
    expect(text).toBe("Verdanta positions itself as the leading platform.");
  });

  it("accepts any of the attribution markers, not one blessed phrase", () => {
    for (const sentence of [
      "The company describes itself as vendor-neutral.",
      "Tinbox says it is vendor-neutral.",
      "Ledgerloop reports 412 employees.",
      "According to the company, the close takes eight days.",
    ]) {
      expect(repair(sentence, "company_stated").repaired).toBe(false);
    }
  });

  it("leaves a plan alone when the model already used a future marker", () => {
    // "will open" is on the marker list, so this sentence cannot be mistaken for an event already.
    expect(repair("Northroad will open a Lyon office in 2027.", "forward_looking").repaired).toBe(false);
  });

  it("marks an unattributed plan as a plan", () => {
    // Present tense, no marker: this is the sentence that would read as a depot that exists.
    const { text, repaired } = repair("Northroad opens a Lyon office in 2027.", "forward_looking");
    expect(repaired).toBe(true);
    expect(text.toLowerCase()).toContain("plans to");
  });

  it("does not stack a second subject onto a plan it rewrites", () => {
    const { text } = repair("The company plans to hire thirty people.", "forward_looking");
    expect(text).not.toContain("plans to the company plans to");
  });

  it("leaves an acronym's capitalisation intact when prefixing", () => {
    const { text } = repair("CSRD reporting is the priority.", "company_stated");
    expect(text).toContain("CSRD reporting");
  });

  it("does not touch a bare sentence", () => {
    expect(repair("Reviewers report multi-week imports.", "bare")).toEqual({
      text: "Reviewers report multi-week imports.",
      repaired: false,
    });
  });
});

describe("bindSentences", () => {
  const surviving = [
    makeClaim({ id: "s1", stance: "third_party" }),
    makeClaim({ id: "s2", stance: "company" }),
  ];
  const empty = { conflicted: new Set<string>(), asOfLabels: new Map<string, string>() };

  it("binds a sentence to the claims that survived", () => {
    const result = bindSentences({
      composed: [makeComposed("what_they_sell", "They sell reconciliation software.", ["s1"])],
      surviving,
      ...empty,
    });
    expect(result.sentences).toHaveLength(1);
    expect(result.sentences[0]?.claim_ids).toEqual(["s1"]);
    expect(result.rejected).toEqual([]);
  });

  it("drops a sentence citing only claims the gate killed", () => {
    const result = bindSentences({
      composed: [makeComposed("what_they_sell", "They are the market leader.", ["ghost"])],
      surviving,
      ...empty,
    });
    expect(result.sentences).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("no_surviving_citation");
    expect(result.rejected[0]?.detail).toContain("ghost");
    expect(result.rejected[0]?.sentence_text).toBe("They are the market leader.");
  });

  it("drops a sentence citing nothing at all", () => {
    const result = bindSentences({
      composed: [makeComposed("what_they_sell", "Unsourced.", [])],
      surviving,
      ...empty,
    });
    expect(result.rejected[0]?.detail).toBe("The sentence cited nothing at all.");
  });

  it("keeps the surviving subset when a sentence cites both live and dead claims", () => {
    const result = bindSentences({
      composed: [makeComposed("what_they_sell", "Partly sourced.", ["s1", "ghost"])],
      surviving,
      ...empty,
    });
    expect(result.sentences[0]?.claim_ids).toEqual(["s1"]);
  });

  it("repairs the verb on a company-only sentence", () => {
    const result = bindSentences({
      composed: [makeComposed("what_they_sell", "Verdanta is the leading platform.", ["s2"])],
      surviving,
      ...empty,
    });
    expect(result.sentences[0]?.repaired).toBe(true);
    expect(result.sentences[0]?.attribution).toBe("company_stated");
    expect(result.sentences[0]?.text).toContain("states that");
  });

  it("prefixes the as-of using the OLDEST cited claim", () => {
    // Taking the newest would let one fresh citation launder a stale one.
    const result = bindSentences({
      composed: [makeComposed("pricing_shape", "Pricing starts at $2,400 per robot.", ["s1", "s2"])],
      surviving,
      conflicted: new Set(),
      asOfLabels: new Map([
        ["s1", "2025-02-10"],
        ["s2", "2026-06-01"],
      ]),
    });
    expect(result.sentences[0]?.as_of).toBe("2025-02-10");
    expect(result.sentences[0]?.text.startsWith("As of February 2025, ")).toBe(true);
  });

  it("marks a sentence whose evidence is in conflict", () => {
    const result = bindSentences({
      composed: [makeComposed("scale", "They employ 340 people.", ["s1"])],
      surviving,
      conflicted: new Set(["s1"]),
      asOfLabels: new Map(),
    });
    expect(result.sentences[0]?.conflicting).toBe(true);
  });

  it("marks the Approach section as inference", () => {
    const result = bindSentences({
      composed: [makeComposed("likely_owner_and_hook", "The controller likely owns this.", ["s1"])],
      surviving,
      ...empty,
    });
    expect(result.sentences[0]?.inferred).toBe(true);
    expect(result.sentences[0]?.question_id).toBe("likely_owner_and_hook");
  });

  it("does not mark a cited section as inference", () => {
    const result = bindSentences({
      composed: [makeComposed("scale", "They employ 412 people.", ["s1"])],
      surviving,
      ...empty,
    });
    expect(result.sentences[0]?.inferred).toBe(false);
  });
});

describe("filterForwardLookingFromChange", () => {
  it("removes a plan from the Change section before it can be composed", () => {
    const result = filterForwardLookingFromChange([
      makeClaim({ id: "plan", question_id: "recent_changes", kind: "forward_looking" }),
    ]);
    expect(result.kept).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("forward_looking_in_change_section");
    expect(result.rejected[0]?.detail).toContain("has not happened yet");
  });

  it("keeps a plan outside the Change section, where it renders as a plan", () => {
    const result = filterForwardLookingFromChange([
      makeClaim({ question_id: "segment_shift", kind: "forward_looking" }),
    ]);
    expect(result.kept).toHaveLength(1);
    expect(result.rejected).toEqual([]);
  });

  it("keeps a factual claim in the Change section", () => {
    const result = filterForwardLookingFromChange([
      makeClaim({ question_id: "recent_changes", kind: "fact" }),
    ]);
    expect(result.kept).toHaveLength(1);
  });
});
