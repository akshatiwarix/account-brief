import { describe, expect, it } from "vitest";

import { DOCUMENTS } from "@/data/corpus";

import { chunkDocument } from "./chunk";
import type { SourceDocument } from "./types";

function document(text: string): SourceDocument {
  return {
    id: "c01-d01",
    company_id: "c01",
    kind: "homepage",
    title: "t",
    url: "https://x.example/",
    published_at: "2026-01-01",
    retrieved_at: "2026-01-02",
    text,
  };
}

describe("chunking", () => {
  it("splits on markdown headings and keeps the heading with its body", () => {
    const chunks = chunkDocument(document("# One\n\nbody one\n\n## Two\n\nbody two"));
    expect(chunks).toHaveLength(2);
    expect(chunks[0]?.heading).toBe("One");
    expect(chunks[1]?.heading).toBe("Two");
    expect(chunks[1]?.text).toContain("body two");
  });

  it("keeps preamble before the first heading", () => {
    const chunks = chunkDocument(document("intro line\n\n# One\n\nbody"));
    expect(chunks[0]?.heading).toBeNull();
    expect(chunks[0]?.text).toContain("intro line");
  });

  it("always produces at least one chunk", () => {
    expect(chunkDocument(document("  \n  "))).toHaveLength(1);
  });

  it("breaks a long section on a paragraph boundary", () => {
    const paragraph = `${"word ".repeat(120)}\n\n`;
    const chunks = chunkDocument(document(`# H\n\n${paragraph.repeat(4)}`));
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // A chunk must not begin mid-sentence: every boundary lands after a blank line or a heading.
      expect(chunk.text.startsWith("word") || chunk.text.startsWith("#")).toBe(true);
    }
  });

  it("exceeds the cap rather than splitting a single long line", () => {
    const line = "x".repeat(4000);
    const chunks = chunkDocument(document(line), 1500);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toHaveLength(4000);
  });
});

describe("chunk offsets, over the whole corpus", () => {
  // The property that keeps a chunking bug from becoming a citation bug: `chunk.text` is a verbatim
  // slice, and the chunks concatenate back into the document with nothing lost or reordered.
  it.each(DOCUMENTS.map((entry) => [entry.id, entry] as const))(
    "%s slices without drift",
    (_id, source) => {
      const chunks = chunkDocument(source);
      for (const chunk of chunks) {
        expect(chunk.text).toBe(source.text.slice(chunk.start, chunk.end));
        expect(chunk.start).toBeLessThan(chunk.end);
      }
      expect(chunks.map((chunk) => chunk.text).join("")).toBe(source.text);
      for (let i = 1; i < chunks.length; i += 1) {
        expect(chunks[i]!.start).toBe(chunks[i - 1]!.end);
      }
    },
  );

  it("indexes chunks contiguously from zero", () => {
    for (const source of DOCUMENTS) {
      const chunks = chunkDocument(source);
      expect(chunks.map((chunk) => chunk.index)).toEqual(chunks.map((_, index) => index));
    }
  });
});
