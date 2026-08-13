import { normalize, toSourceSpan, widenToCodePoint, type Normalized } from "./normalize";
import type { Claim, Rejection, Span } from "./types";

/**
 * The gate's teeth.
 *
 * A claim arrives from the model asserting that `quote` appears in `document_id`. This file decides
 * whether it does. Found: the claim carries a span in the untouched document's coordinates and may
 * go on to be cited. Not found: the claim is dead, with a rejection that names the quote and the
 * document, and nothing downstream can revive it.
 *
 * The model is not consulted about whether its own quote exists. That asymmetry is the entire
 * design: `Claim.quote` is an assertion, `Claim.span` is a verdict, and they are produced by
 * different authors.
 *
 * There is no scoring here, no threshold, no nearest match, and no "close enough". Adding one would
 * be a one-line change and would quietly end the project — see `normalize.ts`.
 */

export interface ResolveInput {
  claims: readonly Claim[];
  documents: readonly { id: string; text: string }[];
  /** The company being briefed. A claim about anyone else is rejected, quote or no quote. */
  company_id: string;
  /** Set on the retry pass so a second failure is distinguishable from a first. */
  afterRetry?: boolean;
}

export interface ResolveResult {
  /** Claims with a resolved span, in input order. */
  resolved: Claim[];
  rejected: Rejection[];
}

/** Cache of folded document text, so a document with 30 claims is folded once. */
function foldDocuments(
  documents: readonly { id: string; text: string }[],
): Map<string, { original: string; normalized: Normalized }> {
  const folded = new Map<string, { original: string; normalized: Normalized }>();
  for (const document of documents) {
    folded.set(document.id, { original: document.text, normalized: normalize(document.text) });
  }
  return folded;
}

export function resolveClaims({
  claims,
  documents,
  company_id,
  afterRetry = false,
}: ResolveInput): ResolveResult {
  const folded = foldDocuments(documents);
  const resolved: Claim[] = [];
  const rejected: Rejection[] = [];

  for (const claim of claims) {
    /*
     * Subject check first, and deliberately before the quote check.
     *
     * A quote lifted from a competitor's name in a careers page resolves perfectly — the text is
     * right there in the document. Span verification cannot catch it, because nothing is wrong with
     * the span. This is the hole in every grounding pipeline that verifies quotes and not subjects,
     * and `c06` in the corpus exists to keep it visible.
     */
    if (claim.subject_company_id !== company_id) {
      rejected.push({
        reason: "wrong_company",
        detail: `The quote is in ${claim.document_id} but the claim is about ${claim.subject_company_id}, not ${company_id}.`,
        claim,
        question_id: claim.question_id,
      });
      continue;
    }

    const target = folded.get(claim.document_id);
    if (!target) {
      rejected.push({
        reason: afterRetry ? "quote_not_found_after_retry" : "quote_not_found",
        detail: `Cites ${claim.document_id}, which is not among this company's documents.`,
        claim,
        question_id: claim.question_id,
      });
      continue;
    }

    const span = findSpan(target.original, target.normalized, claim.quote);
    if (!span) {
      rejected.push({
        reason: afterRetry ? "quote_not_found_after_retry" : "quote_not_found",
        detail: `Quote not present in ${claim.document_id}: ${excerpt(claim.quote)}`,
        claim,
        question_id: claim.question_id,
      });
      continue;
    }

    resolved.push({ ...claim, span });
  }

  return { resolved, rejected };
}

/**
 * Find a quote in a document and return its span in the document's own coordinates.
 *
 * Exported because the sweep re-resolves every surviving claim independently: a span that only
 * exists because `resolveClaims` put it there is not evidence of anything.
 */
export function findSpan(
  documentText: string,
  documentNormalized: Normalized,
  quote: string,
): Span | null {
  const needle = normalize(quote).text.trim();
  // An empty or whitespace-only quote is not a citation. Without this, `indexOf("")` returns 0 and
  // every such claim would resolve to a zero-length span at the top of the document.
  if (needle.length === 0) return null;

  const at = documentNormalized.text.indexOf(needle);
  if (at === -1) return null;

  const span = toSourceSpan(documentNormalized, at, needle.length, documentText.length);
  if (!span) return null;

  return { start: span.start, end: widenToCodePoint(documentText, span.end) };
}

/** Every quote in a document, for the UI's "this quote appears three times" case and for tests. */
export function findAllSpans(documentText: string, quote: string): Span[] {
  const documentNormalized = normalize(documentText);
  const needle = normalize(quote).text.trim();
  if (needle.length === 0) return [];

  const spans: Span[] = [];
  let from = 0;
  for (;;) {
    const at = documentNormalized.text.indexOf(needle, from);
    if (at === -1) break;
    const span = toSourceSpan(documentNormalized, at, needle.length, documentText.length);
    if (span) spans.push({ start: span.start, end: widenToCodePoint(documentText, span.end) });
    from = at + needle.length;
  }
  return spans;
}

/** The text a span points at. The UI highlights this; the sweep asserts it is not empty. */
export function textAt(documentText: string, span: Span): string {
  return documentText.slice(span.start, span.end);
}

function excerpt(quote: string): string {
  const flat = quote.replace(/\s+/g, " ").trim();
  return flat.length > 120 ? `"${flat.slice(0, 117)}…"` : `"${flat}"`;
}
