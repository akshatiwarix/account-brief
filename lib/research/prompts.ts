import { INFERRED_QUESTION, type QuestionSpec } from "@/lib/brief/questions";
import type { Chunk } from "@/lib/brief/chunk";
import type { Claim, Company, Conflict, SourceDocument } from "@/lib/brief/types";

/**
 * The two prompts, versioned.
 *
 * `PROMPT_VERSION` is part of every fixture's `inputs_hash`, so editing a word here invalidates all
 * ten committed briefs and the build says so. That is the intended cost: a prompt change is a change
 * to what the model was asked, and a fixture generated under different instructions is not evidence
 * of anything.
 *
 * Both prompts are written to be *narrow*. Extraction is asked for quotes, not judgements;
 * composition is given claims and never document text, so it cannot cite what the gate already
 * killed. Neither prompt is asked to be careful about hallucinating — that is not a prompt's job
 * here, it is `resolve.ts`'s. The prompt's job is to make the honest path the easy one.
 */

export const PROMPT_VERSION = "2026-08-14.3";

export const EXTRACT_SYSTEM_PROMPT = `You extract claims from a set of source documents about a single company.

Rules, in order of importance:

1. QUOTE VERBATIM, AND NAME THE DOCUMENT IT CAME FROM. Every claim carries a "document_id" and a "quote". The quote must be copied character-for-character from THAT document's text. Do not fix typos, do not normalise punctuation, do not shorten with an ellipsis, do not join text across a gap, and never attribute a quote to a document it did not come from. A quote that is not a contiguous substring of the document you named is discarded by a checker downstream, and the claim is lost.
2. Keep quotes short but complete: the shortest contiguous run of the document that actually supports the claim, typically 8 to 30 words.
3. ONE ASSERTION PER CLAIM. "assertion" is your own one-sentence restatement. It must be supported by the quote alone.
4. NAME THE SUBJECT. "subject" is the company the claim is about. Documents mention competitors, customers, investors and acquisitions; a sentence about another company is a claim about that company, and you must say so. Never attribute a competitor's numbers to the company being researched.
5. CLASSIFY THE STANCE. "company" when the company is describing itself (its own site, its own blog, its own press release, its own careers page). "third_party" when someone outside the company is speaking (news, review sites, analysts). "regulatory" for filings and formal disclosures.
6. CLASSIFY THE KIND. "number" for a countable quantity — also fill value_n and value_unit. "forward_looking" for anything not yet true: plans, intentions, expectations, targets, conditional statements. "opinion" for judgements and preferences. "fact" otherwise. A stated intention is ALWAYS forward_looking, even in a press release, even if it sounds certain.
7. Only answer the questions you were asked. If the document says nothing about a question, return no claims for it. Returning nothing is a correct and common answer.
8. Do not infer, combine documents, or use anything you know about the real world. This corpus is synthetic; outside knowledge is always wrong here.`;

export const COMPOSE_SYSTEM_PROMPT = `You write the sentences of a sales brief from a list of verified claims.

You are given claims only. You do not have the source documents, and you cannot add facts.

Rules:

1. EVERY SENTENCE CITES. List the claim ids each sentence relies on in "claim_ids". A sentence with no claim id is discarded.
2. Use only what the claims say. If you want to write something the claims do not support, do not write it.
3. One sentence should usually rest on one claim. Combine two only when they genuinely belong in one sentence.
4. Respect stance. When a claim's stance is "company", the company is describing itself: write "positions itself as", "states that", "describes itself as", "reports". Never write a company's self-description as a plain fact. A checker enforces this and will rewrite your sentence if you forget, which reads worse than doing it yourself.
5. Respect modality. A "forward_looking" claim is a plan: write "says it plans to", "expects to", "intends to". Never write a plan as something that happened.
6. When claims disagree, write both sides and do not choose. Say so plainly: "X in April, Y in June".
7. Be plain. No adjectives the claims do not support, no summarising flourish, no "positioned for growth". A rep is going to read this before a call.
8. For the question "likely_owner_and_hook" only, you may reason across the claims to suggest who probably owns the problem and what the opening should be — still citing the claims your reasoning rests on, and still without adding facts.
9. Respect the per-question sentence limit you are given. Extra sentences are dropped.`;

/**
 * One extraction call per company, carrying all of its documents.
 *
 * PLAN.md specified one call per (document, section) — ~78 calls for the corpus, and better isolation:
 * a model reading one document cannot mix two up. It was abandoned for a hard external limit rather
 * than a design preference. The free tier for this model allows **20 requests per day**, which makes a
 * 78-call generation impossible to run at all, and makes a paste of five documents cost fifteen calls
 * instead of two.
 *
 * Batching per company costs isolation and buys something real back: the model must now name the
 * document each quote came from, and a quote attributed to the wrong document fails to resolve. So the
 * risk the batching introduces is caught by the same gate that catches everything else, and the
 * rejected pane shows it happening. `c06` remains the sharper trap, because there the quote and the
 * document are both right and only the subject is wrong.
 */
/** Per-document prompt budget. A pasted document may be 40,000 characters; a prompt of ten is not. */
export const MAX_CHARS_PER_DOCUMENT = 12_000;

export function extractRequest(
  company: Company,
  documents: readonly { document: SourceDocument; chunks: readonly Chunk[] }[],
  questions: readonly { question: QuestionSpec; documentIds: readonly string[] }[],
): string {
  const asked = questions
    .map(
      ({ question, documentIds }) =>
        `- ${question.id}: ${question.label} — look for ${question.seek}\n  answerable only from: ${documentIds.join(", ")}`,
    )
    .join("\n");

  const bodies = documents
    .map(({ document, chunks }) => {
      /*
       * The body must be a byte-exact prefix of the document.
       *
       * The first version of this joined chunks with a newline and prefixed each with a
       * `[section: …]` label. Both insert text the gate will never see, so a quote spanning a
       * boundary could contain characters that exist nowhere in the document — a rejection caused
       * entirely by the prompt. Chunks are contiguous slices, so they concatenate back exactly;
       * the markdown headings are already in the text and the labels were redundant anyway.
       *
       * Chunking's real job here is the truncation boundary: an over-long document is cut at a
       * section break rather than mid-sentence, and the cut is stated rather than hidden.
       */
      let used = 0;
      const kept: string[] = [];
      for (const chunk of chunks) {
        if (used > 0 && used + chunk.text.length > MAX_CHARS_PER_DOCUMENT) break;
        kept.push(chunk.text);
        used += chunk.text.length;
      }
      const truncated = used < document.text.length;
      const body = kept.join("") + (truncated ? `\n\n[document truncated after ${used} characters]` : "");

      return `--- DOCUMENT ${document.id} ---
kind: ${document.kind}
title: ${document.title}
url: ${document.url}
published: ${document.published_at ?? "undated"}

${body}
--- END OF DOCUMENT ${document.id} ---`;
    })
    .join("\n\n");

  return `COMPANY BEING RESEARCHED: ${company.name} (${company.domain}), ${company.industry}

QUESTIONS TO ANSWER
${asked}

Only use the documents listed for a question. A claim answering a question from a document not listed for it will be discarded.

DOCUMENTS BEGIN

${bodies}

DOCUMENTS END`;
}

/**
 * The retry. Only quote misses are retried, once, and the failing quotes are echoed back.
 *
 * A retry that just says "try again" gets the same output. Showing the model exactly which strings
 * were not found is what makes the second attempt different, and bounding it at one keeps a bad
 * document from turning into an unbounded spend.
 */
export function retryRequest(
  original: string,
  failed: readonly { document_id: string; quote: string }[],
): string {
  const list = failed
    .map((entry) => `- in ${entry.document_id}: ${JSON.stringify(entry.quote)}`)
    .join("\n");
  return `${original}

RETRY. These quotes from your previous answer were NOT found in the document you attributed them to:
${list}

They were paraphrased, re-punctuated, stitched together across a gap, or taken from a different document than the one you named. Extract again. Copy each quote character-for-character from the document you attribute it to, as one contiguous run. If a claim cannot be supported by such a quote, omit the claim entirely — an omitted claim costs nothing and a wrong quote is discarded anyway.`;
}

export function composeRequest(
  company: Company,
  claims: readonly Claim[],
  conflicts: readonly Conflict[],
  documents: readonly SourceDocument[],
  questions: readonly QuestionSpec[],
): string {
  const kindOf = new Map(documents.map((document) => [document.id, document.kind]));

  const grouped = questions
    .map((question) => {
      const mine = claims.filter((claim) => claim.question_id === question.id);

      /*
       * The inferred question has no claims of its own — that is what makes it inferred. Listing only
       * questions that have claims silently dropped it from the request, and the first generated
       * fixture came back with an empty Approach section for every company. It is asked for
       * explicitly, and it still has to cite the claims its reasoning rests on.
       */
      if (mine.length === 0 && question.id === INFERRED_QUESTION) {
        return `${question.id} — ${question.label} (at most ${question.max_sentences} sentences)\n  No claims of its own. Reason over the claims listed above, and cite the ones you used.`;
      }

      if (mine.length === 0) return null;
      const lines = mine
        .map(
          (claim) =>
            `  ${claim.id} | ${claim.kind} | ${claim.stance} | ${kindOf.get(claim.document_id) ?? "document"} | ${claim.observed_at}\n    assertion: ${claim.assertion}\n    quote: ${JSON.stringify(claim.quote)}`,
        )
        .join("\n");
      return `${question.id} — ${question.label} (at most ${question.max_sentences} sentences)\n${lines}`;
    })
    .filter((entry): entry is string => entry !== null)
    .join("\n\n");

  const disagreements =
    conflicts.length === 0
      ? "None."
      : conflicts
          .map(
            (conflict) =>
              `- ${conflict.question_id}: claims ${conflict.claim_ids.join(", ")} disagree in ${conflict.unit}. Write both, choose neither.`,
          )
          .join("\n");

  return `COMPANY: ${company.name} (${company.domain}), ${company.industry}

VERIFIED CLAIMS
${grouped || "None."}

KNOWN DISAGREEMENTS
${disagreements}

Write the brief's sentences. Cite claim ids. Do not add facts.`;
}
