import { describe, expect, it } from "vitest";

import {
  INFERRED_QUESTION,
  QUESTIONS,
  QUESTION_COUNT,
  extractableQuestions,
  missingKinds,
  questionById,
  questionsInSection,
  routeDocuments,
  SECTIONS,
} from "./questions";
import { DOCUMENT_KINDS } from "./types";

describe("the question set", () => {
  it("is exactly 12 questions", () => {
    expect(QUESTION_COUNT).toBe(12);
  });

  it("has unique ids", () => {
    expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(QUESTION_COUNT);
  });

  it("assigns every question to a declared section, and leaves no section empty", () => {
    for (const question of QUESTIONS) {
      expect(SECTIONS.map((section) => section.id)).toContain(question.section);
    }
    for (const section of SECTIONS) {
      expect(questionsInSection(section.id).length).toBeGreaterThan(0);
    }
  });

  it("routes only to document kinds that exist", () => {
    for (const question of QUESTIONS) {
      for (const kind of question.answerable_from) {
        expect(DOCUMENT_KINDS).toContain(kind);
      }
    }
  });

  it("gives every extractable question at least two answering kinds", () => {
    // One kind means one document can silently own a whole question, and a corpus that happens to
    // lack it reads as "the company has no pricing" rather than "we could not see it".
    for (const question of extractableQuestions()) {
      expect(question.answerable_from.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("excludes exactly one inferred question from extraction", () => {
    expect(extractableQuestions()).toHaveLength(11);
    expect(questionById(INFERRED_QUESTION).answerable_from).toEqual([]);
  });

  it("covers every document kind with at least one question", () => {
    const routed = new Set(QUESTIONS.flatMap((question) => question.answerable_from));
    // A kind nobody routes to is dead weight in the corpus — authoring documents no question can
    // ever read is the most expensive way to make a demo look full.
    for (const kind of DOCUMENT_KINDS) {
      expect(routed.has(kind)).toBe(true);
    }
  });
});

describe("routing", () => {
  const documents = [
    { kind: "homepage" as const },
    { kind: "pricing" as const },
    { kind: "news" as const },
  ];

  it("selects only documents of an answering kind", () => {
    expect(routeDocuments(questionById("pricing_shape"), documents)).toEqual([{ kind: "pricing" }]);
  });

  it("returns nothing for a question this corpus cannot answer", () => {
    // `third_party_complaints` wants review_site or news… news is present, so pick one that is not.
    expect(routeDocuments(questionById("what_they_shipped"), documents)).toEqual([]);
  });

  it("names the kinds that were missing, and only those it asked for", () => {
    const missing = missingKinds(questionById("what_they_shipped"), documents);
    expect(missing).toEqual(["changelog", "press_release", "blog"]);
  });

  it("reports no missing kinds when one answering document is present", () => {
    expect(missingKinds(questionById("pricing_shape"), documents)).toEqual(["press_release"]);
  });
});
