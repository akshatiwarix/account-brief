import { describe, expect, it } from "vitest";

import { COMPANIES, DEFAULT_AS_OF, DOCUMENTS, companyById, documentsFor } from "@/data/corpus";
import { QUESTIONS, extractableQuestions, routeDocuments } from "@/lib/brief/questions";
import { chunkDocument } from "@/lib/brief/chunk";
import { SECTIONS } from "@/lib/brief/questions";

import { subjectIdFor } from "./generate";
import { hashInputs } from "./hash";
import { composeRequest, extractRequest, retryRequest } from "./prompts";
import { composeResponseSchema, extractResponseSchema, pasteRequestSchema } from "./schemas";
import { makeClaim } from "@/lib/brief/testing";

const company = companyById("c06")!;

describe("subjectIdFor", () => {
  it("recognises the company by name, bare domain and self-reference", () => {
    for (const subject of ["Sparkfold", "sparkfold", "sparkfold.example", "the company", "itself"]) {
      expect(subjectIdFor(subject, company)).toBe("c06");
    }
  });

  it("recognises a legal suffix on the registered name", () => {
    expect(subjectIdFor("Sparkfold Inc.", company)).toBe("c06");
    expect(subjectIdFor("Sparkfold, Inc.", company)).toBe("c06");
  });

  it("does not recognise a competitor", () => {
    // The c06 trap. A claim carrying this subject is rejected by the gate, however good its quote.
    expect(subjectIdFor("Zafira Sheets", company)).toBe("other:zafira-sheets");
  });

  it("does not treat a negated mention as self", () => {
    // A substring match anywhere would make "not Sparkfold" read as Sparkfold.
    expect(subjectIdFor("not Sparkfold", company)).toBe("other:not-sparkfold");
  });
});

describe("extraction requests", () => {
  const document = documentsFor("c01")[0]!;
  const request = extractRequest(
    companyById("c01")!,
    document,
    chunkDocument(document),
    extractableQuestions().slice(0, 2),
  );

  it("names the company being researched, so the subject rule is answerable", () => {
    expect(request).toContain("COMPANY BEING RESEARCHED: Ledgerloop");
  });

  it("carries the document's own text verbatim", () => {
    // Anything less means the quote the model returns cannot be checked against what it saw.
    for (const chunk of chunkDocument(document)) {
      expect(request).toContain(chunk.text.trim().slice(0, 60));
    }
  });

  it("asks only the questions it was given", () => {
    expect(request).toContain("what_they_sell");
    expect(request).not.toContain("third_party_complaints");
  });

  it("echoes failed quotes back on retry", () => {
    const retry = retryRequest(request, ["a quote that was not found"]);
    expect(retry).toContain("were NOT found");
    expect(retry).toContain("a quote that was not found");
    expect(retry).toContain(request);
  });
});

describe("composition requests", () => {
  const claims = [
    makeClaim({ id: "k1", question_id: "scale", stance: "company", kind: "number", value: { n: 340, unit: "people" } }),
    makeClaim({ id: "k2", question_id: "scale", stance: "third_party" }),
  ];
  const request = composeRequest(company, claims, [], documentsFor("c06"), QUESTIONS);

  it("passes claims with their ids, stances and dates", () => {
    expect(request).toContain("k1");
    expect(request).toContain("company");
    expect(request).toContain("third_party");
  });

  it("never passes document text", () => {
    // The structural reason compose cannot cite what the gate killed: it has not read the documents.
    for (const document of documentsFor("c06")) {
      expect(request).not.toContain(document.text.slice(0, 80));
    }
  });

  it("names disagreements and tells the model not to choose", () => {
    const withConflict = composeRequest(
      company,
      claims,
      [{ question_id: "scale", claim_ids: ["k1", "k2"], unit: "people", spread: 0.7 }],
      documentsFor("c06"),
      QUESTIONS,
    );
    expect(withConflict).toContain("choose neither");
  });
});

describe("response schemas", () => {
  it("accepts a well-formed extraction", () => {
    const parsed = extractResponseSchema.safeParse({
      claims: [
        {
          question_id: "scale",
          assertion: "They employ 340 people.",
          quote: "The company now employs 340 employees",
          subject: "Cadence Freight",
          kind: "number",
          stance: "company",
          value_n: 340,
          value_unit: "employees",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects an unknown question id", () => {
    const parsed = extractResponseSchema.safeParse({
      claims: [
        {
          question_id: "what_they_smell",
          assertion: "a",
          quote: "b",
          subject: "c",
          kind: "fact",
          stance: "company",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty quote before it can match at offset zero", () => {
    const parsed = extractResponseSchema.safeParse({
      claims: [{ question_id: "scale", assertion: "a", quote: "", subject: "c", kind: "fact", stance: "company" }],
    });
    expect(parsed.success).toBe(false);
  });

  it("accepts a composition with no citations, so the engine can reject it with a reason", () => {
    // Schema-level rejection would lose the sentence silently; the rejected pane needs to show it.
    const parsed = composeResponseSchema.safeParse({
      sentences: [{ question_id: "scale", text: "Unsourced.", claim_ids: [] }],
    });
    expect(parsed.success).toBe(true);
  });
});

describe("paste validation", () => {
  const valid = {
    company: { name: "Realco", domain: "realco.com", industry: "Widgets" },
    documents: [
      { kind: "homepage", title: "Home", text: "x".repeat(100) },
    ],
  };

  it("accepts a minimal paste and defaults the optional fields", () => {
    const parsed = pasteRequestSchema.safeParse(valid);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.documents[0]?.published_at).toBeNull();
  });

  it("caps the number of documents", () => {
    const many = { ...valid, documents: Array.from({ length: 13 }, () => valid.documents[0]!) };
    expect(pasteRequestSchema.safeParse(many).success).toBe(false);
  });

  it("caps document length", () => {
    const huge = { ...valid, documents: [{ ...valid.documents[0]!, text: "x".repeat(40_001) }] };
    expect(pasteRequestSchema.safeParse(huge).success).toBe(false);
  });

  it("rejects a document too short to contain a quotable sentence", () => {
    const tiny = { ...valid, documents: [{ ...valid.documents[0]!, text: "short" }] };
    expect(pasteRequestSchema.safeParse(tiny).success).toBe(false);
  });

  it("normalises text to NFC, which is what keeps the offset map honest", () => {
    const decomposed = `café ${"x".repeat(100)}`;
    const parsed = pasteRequestSchema.parse({
      ...valid,
      documents: [{ ...valid.documents[0]!, text: decomposed }],
    });
    expect(parsed.documents[0]?.text.startsWith("café")).toBe(true);
  });
});

describe("inputs_hash", () => {
  it("is stable for the same inputs", () => {
    expect(hashInputs(documentsFor("c01"), DEFAULT_AS_OF)).toBe(
      hashInputs(documentsFor("c01"), DEFAULT_AS_OF),
    );
  });

  it("ignores document order", () => {
    const documents = documentsFor("c01");
    expect(hashInputs([...documents].reverse(), DEFAULT_AS_OF)).toBe(
      hashInputs(documents, DEFAULT_AS_OF),
    );
  });

  it("changes when a document's text changes by one character", () => {
    const documents = documentsFor("c02");
    const edited = documents.map((document, index) =>
      index === 0 ? { ...document, text: `${document.text} ` } : document,
    );
    expect(hashInputs(edited, DEFAULT_AS_OF)).not.toBe(hashInputs(documents, DEFAULT_AS_OF));
  });

  it("changes when the as-of changes", () => {
    expect(hashInputs(documentsFor("c01"), "2026-08-02")).not.toBe(
      hashInputs(documentsFor("c01"), DEFAULT_AS_OF),
    );
  });

  it("differs per company", () => {
    const hashes = COMPANIES.map((entry) => hashInputs(documentsFor(entry.id), DEFAULT_AS_OF));
    expect(new Set(hashes).size).toBe(COMPANIES.length);
  });
});

describe("the call budget, counted before spending it", () => {
  it("is the number of (document, applicable section) pairs plus one", () => {
    // The number that goes in the README. Computed from the routing table, not guessed.
    let extract = 0;
    for (const document of DOCUMENTS) {
      for (const section of SECTIONS) {
        const applicable = extractableQuestions().filter(
          (question) =>
            question.section === section.id && routeDocuments(question, [document]).length > 0,
        );
        if (applicable.length > 0) extract += 1;
      }
    }
    // 68 documents across ten companies; every company also makes one compose call.
    expect(extract).toBeGreaterThan(100);
    expect(extract).toBeLessThan(200);
  });
});
