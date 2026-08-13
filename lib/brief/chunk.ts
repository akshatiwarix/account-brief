import type { SourceDocument } from "./types";

/**
 * Split a document into chunks for extraction, keeping each chunk's offset in the original.
 *
 * Chunking exists for the model's benefit — a 4,000-character document sent whole produces vaguer
 * quotes than the same document sent as four sections. But every chunk boundary is a chance to
 * corrupt an offset, and an offset that drifts by three characters produces a citation that
 * highlights the wrong half of a sentence while looking entirely plausible.
 *
 * So chunks carry `start`, and `chunk.text` is a verbatim slice — never re-joined, never trimmed
 * into a new string. `resolve.ts` searches the whole document rather than the chunk, so a quote that
 * straddles a boundary still resolves; chunking narrows what the model reads, not what the gate
 * checks. That separation is why a chunking bug cannot become a citation bug.
 */

export interface Chunk {
  document_id: string;
  index: number;
  /** Offset of `text` in the original document. */
  start: number;
  end: number;
  /** The nearest preceding markdown heading, for the prompt's context line. */
  heading: string | null;
  /** A verbatim slice of the document. */
  text: string;
}

const SOFT_CAP = 1500;

export function chunkDocument(document: SourceDocument, softCap = SOFT_CAP): Chunk[] {
  const sections = splitOnHeadings(document.text);
  const chunks: Chunk[] = [];

  for (const section of sections) {
    for (const piece of splitLongSection(document.text, section, softCap)) {
      chunks.push({
        document_id: document.id,
        index: chunks.length,
        start: piece.start,
        end: piece.end,
        heading: section.heading,
        text: document.text.slice(piece.start, piece.end),
      });
    }
  }

  // A document with no headings and no content still gets one chunk, so callers never have to
  // special-case an empty array.
  if (chunks.length === 0) {
    chunks.push({
      document_id: document.id,
      index: 0,
      start: 0,
      end: document.text.length,
      heading: null,
      text: document.text,
    });
  }

  return chunks;
}

interface Section {
  start: number;
  end: number;
  heading: string | null;
}

function splitOnHeadings(text: string): Section[] {
  const sections: Section[] = [];
  const heading = /^#{1,6} .+$/gm;

  let cursor = 0;
  let currentHeading: string | null = null;

  for (const match of text.matchAll(heading)) {
    const at = match.index;
    if (at > cursor) {
      sections.push({ start: cursor, end: at, heading: currentHeading });
    }
    currentHeading = match[0].replace(/^#+ /, "").trim();
    cursor = at;
  }

  if (cursor < text.length) {
    sections.push({ start: cursor, end: text.length, heading: currentHeading });
  }

  return sections.filter((section) => text.slice(section.start, section.end).trim().length > 0);
}

/**
 * Break a long section on a paragraph boundary, falling back to the soft cap when a single paragraph
 * is longer than the cap. Splitting mid-paragraph is worse than an oversized chunk, so the cap is
 * soft in exactly one direction: a chunk may exceed it, never split a line to obey it.
 */
function splitLongSection(text: string, section: Section, softCap: number): Section[] {
  if (section.end - section.start <= softCap) return [section];

  const pieces: Section[] = [];
  let start = section.start;

  while (section.end - start > softCap) {
    const window = text.slice(start, start + softCap);
    const breakAt = window.lastIndexOf("\n\n");
    // No paragraph break in the window: emit the oversized run up to the next one rather than
    // cutting a sentence in half.
    const next =
      breakAt > 0 ? start + breakAt + 2 : nextParagraph(text, start + softCap, section.end);
    if (next <= start) break;
    pieces.push({ start, end: next, heading: section.heading });
    start = next;
  }

  if (start < section.end) pieces.push({ start, end: section.end, heading: section.heading });
  return pieces;
}

function nextParagraph(text: string, from: number, limit: number): number {
  const at = text.indexOf("\n\n", from);
  return at === -1 || at > limit ? limit : at + 2;
}
