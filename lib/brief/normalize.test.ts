import { describe, expect, it } from "vitest";

import { DOCUMENTS } from "@/data/corpus";

import { normalize, toSourceSpan, widenToCodePoint } from "./normalize";

describe("folding", () => {
  it("straightens quotes and apostrophes", () => {
    expect(normalize("the “audit trail” isn’t slow").text).toBe(`the "audit trail" isn't slow`);
  });

  it("folds every dash variant to a hyphen", () => {
    expect(normalize("a–b—c‐d−e").text).toBe("a-b-c-d-e");
  });

  it("folds an ellipsis to three dots", () => {
    expect(normalize("wait…").text).toBe("wait...");
  });

  it("collapses runs of whitespace, including non-breaking and tabs", () => {
    expect(normalize("| Growth |\t$900  |  25 |").text).toBe("| growth | $900 | 25 |");
  });

  it("drops zero-width characters outright", () => {
    expect(normalize("in​visible").text).toBe("invisible");
  });

  it("case folds", () => {
    expect(normalize("Series B").text).toBe("series b");
  });

  it("trims leading and trailing whitespace without shifting the map", () => {
    const folded = normalize("   hello   ");
    expect(folded.text).toBe("hello");
    expect(folded.sourceIndex[0]).toBe(3);
  });

  it("keeps the map the same length as the text", () => {
    const folded = normalize("The “fi” ligature — ﬁ — folds to two characters…");
    expect(folded.sourceIndex).toHaveLength(folded.text.length);
  });

  it("points every character of a multi-character fold at one source index", () => {
    // "…" is one code point and three normalized characters. All three must map to index 4, or a
    // span ending inside the ellipsis would resolve to a nonsense offset.
    const folded = normalize("wait…");
    expect(folded.text).toBe("wait...");
    expect(folded.sourceIndex.slice(4)).toEqual([4, 4, 4]);
  });
});

describe("the offset map, over the whole corpus", () => {
  // The load-bearing property of this file. If it fails, every citation in the app silently
  // highlights the wrong characters while still looking like a citation.
  it.each(DOCUMENTS.map((document) => [document.id, document] as const))(
    "%s round-trips every folded position back into itself",
    (_id, document) => {
      const folded = normalize(document.text);
      for (let i = 0; i < folded.text.length; i += 1) {
        const at = folded.sourceIndex[i];
        expect(at, `index ${i}`).toBeGreaterThanOrEqual(0);
        expect(at).toBeLessThan(document.text.length);

        const character = folded.text[i];
        // A folded character must correspond to the source character it points at, once that source
        // character is folded the same way. Spaces are exempt: a collapsed run maps to the first
        // character after it by design.
        if (character !== " ") {
          const source = document.text[at ?? 0] ?? "";
          expect(normalize(source).text, `at ${at} of ${document.id}`).toContain(character);
        }
      }
    },
  );

  it("maps monotonically, so a span can never end before it starts", () => {
    for (const document of DOCUMENTS) {
      const folded = normalize(document.text);
      let previous = -1;
      for (const at of folded.sourceIndex) {
        expect(at).toBeGreaterThanOrEqual(previous);
        previous = at;
      }
    }
  });
});

describe("toSourceSpan", () => {
  const folded = normalize("  Hello  world  ");

  it("returns null for a zero-length match", () => {
    expect(toSourceSpan(folded, 0, 0, 16)).toBeNull();
  });

  it("returns null when the match runs past the map", () => {
    expect(toSourceSpan(folded, 40, 3, 16)).toBeNull();
  });

  it("clamps the end to the original length", () => {
    const span = toSourceSpan(folded, 0, folded.text.length, 16);
    expect(span?.end).toBeLessThanOrEqual(16);
  });
});

describe("widenToCodePoint", () => {
  it("covers a whole surrogate pair", () => {
    const text = "a🎯b";
    // Ending at index 2 would split the astral character in half.
    expect(widenToCodePoint(text, 2)).toBe(3);
  });

  it("leaves a plain character alone", () => {
    expect(widenToCodePoint("abc", 2)).toBe(2);
  });

  it("never exceeds the string", () => {
    expect(widenToCodePoint("abc", 9)).toBe(3);
  });
});
