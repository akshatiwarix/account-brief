/**
 * Reversible text folding.
 *
 * Models paraphrase quotes constantly in ways that are not paraphrases at all: they straighten a
 * curly apostrophe, swap an em dash for a hyphen, collapse the padding inside a markdown table row,
 * or re-flow a wrapped line into one. Comparing raw strings rejects every one of those as a
 * fabrication, and a gate that cries wolf on true claims gets loosened until it means nothing.
 *
 * So this file folds both sides before comparing — and keeps a map back, which is the part that
 * matters. `sourceIndex[i]` is the index in the ORIGINAL string of normalized character `i`, so a
 * match found in folded coordinates resolves to a span in the untouched document. That is what
 * makes a citation a character range the UI can highlight rather than a footnote.
 *
 * What this file must never become: a similarity metric. Folding is a finite list of equivalences,
 * each one arguable on its own line. A threshold is a knob that lets a paraphrase through, and the
 * paraphrase-passing-as-quote is the exact failure the whole project exists to prevent. If a true
 * claim is being rejected, add a fold or tighten the prompt — do not add a score.
 *
 * Composition is handled at the boundary, not here: `data/schema.ts` stores document text as NFC,
 * so this function only has to fold single code points. Per-code-point NFKC cannot compose across
 * characters, which is why that boundary exists.
 */

export interface Normalized {
  /** The folded text. */
  text: string;
  /** `sourceIndex[i]` is the index in the original string of `text[i]`. Same length as `text`. */
  sourceIndex: number[];
}

/** Code points folded to a single ASCII character before anything else happens. */
const CHARACTER_FOLDS: Readonly<Record<string, string>> = {
  // Quotes and apostrophes. The single most common model rewrite.
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "″": '"',
  "«": '"',
  "»": '"',
  // Dashes and hyphens. Em, en, figure, non-breaking, minus, horizontal bar, soft hyphen.
  "‐": "-",
  "‑": "-",
  "‒": "-",
  "–": "-",
  "—": "-",
  "―": "-",
  "−": "-",
  "­": "-",
  // Ellipsis, folded to three dots so a model that spelled it out still matches.
  "…": "...",
};

/** Code points treated as a space. Collapsed with any run of adjacent whitespace. */
const SPACE_LIKE = new Set([
  "\t",
  "\n",
  "\r",
  "\v",
  "\f",
  " ", // non-breaking space — endemic in copied web text
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  " ",
  "　",
]);

/** Zero-width code points, dropped outright: they carry no meaning and break every comparison. */
const ZERO_WIDTH = new Set(["​", "‌", "‍", "﻿"]);

export function normalize(input: string): Normalized {
  const out: string[] = [];
  const sourceIndex: number[] = [];

  let index = 0;
  let pendingSpace = false;

  for (const codePoint of input) {
    const at = index;
    index += codePoint.length;

    if (ZERO_WIDTH.has(codePoint)) continue;

    if (codePoint === " " || SPACE_LIKE.has(codePoint)) {
      // Defer: a run of whitespace becomes at most one space, and only if something follows it.
      // This is what lets `| Growth | $900 |` match `| Growth  |  $900 |`.
      pendingSpace = out.length > 0;
      continue;
    }

    if (pendingSpace) {
      out.push(" ");
      // A collapsed run maps to the first character that follows it. Mapping it to the run's own
      // start would put a span's edge inside whitespace and highlight a leading gap.
      sourceIndex.push(at);
      pendingSpace = false;
    }

    const folded = CHARACTER_FOLDS[codePoint] ?? codePoint.normalize("NFKC");
    const lowered = folded.toLowerCase();

    // One source code point can fold to several characters — the fi ligature, a fullwidth digit,
    // an ellipsis, a Turkish dotted capital. Every produced character points back at the same
    // original index, which keeps spans correct in both directions.
    for (const character of lowered) {
      out.push(character);
      sourceIndex.push(at);
    }
  }

  return { text: out.join(""), sourceIndex };
}

/**
 * Map a match in normalized coordinates back to the original string.
 *
 * `end` is derived from the last matched character rather than from `start + length`, because folding
 * is not length-preserving in either direction: one original character can produce three normalized
 * ones and vice versa.
 */
export function toSourceSpan(
  normalized: Normalized,
  start: number,
  length: number,
  originalLength: number,
): { start: number; end: number } | null {
  if (length <= 0) return null;
  const firstIndex = normalized.sourceIndex[start];
  const lastIndex = normalized.sourceIndex[start + length - 1];
  if (firstIndex === undefined || lastIndex === undefined) return null;

  // The last matched normalized character maps to the START of an original code point, so the span
  // has to reach past that code point rather than stopping on it. Astral characters are two UTF-16
  // units, hence the surrogate check instead of a bare +1.
  const end = Math.min(originalLength, lastIndex + 1);
  return { start: firstIndex, end };
}

/** Widen a span's end to cover a whole surrogate pair or a trailing combining mark. */
export function widenToCodePoint(source: string, end: number): number {
  if (end <= 0 || end >= source.length) return Math.min(end, source.length);
  const code = source.charCodeAt(end - 1);
  const isHighSurrogate = code >= 0xd800 && code <= 0xdbff;
  return isHighSurrogate ? end + 1 : end;
}
