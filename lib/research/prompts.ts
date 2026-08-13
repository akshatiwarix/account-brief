import type { QuestionSpec } from "@/lib/brief/questions";
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

export const PROMPT_VERSION = "2026-08-14.1";

export const EXTRACT_SYSTEM_PROMPT = `You extract claims from a single source document about a single company.

Rules, in order of importance:

1. QUOTE VERBATIM. Every claim carries a "quote" field that must be copied character-for-character from the document text you were given. Do not fix typos, do not normalise punctuation, do not shorten with an ellipsis, do not join text across a gap. A quote that is not a contiguous substring of the document is discarded by a checker downstream, and the claim is lost.
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

/** The user-side content for one extraction call: one document, one section's questions. */
export function extractRequest(
  company: Company,
  document: SourceDocument,
  chunks: readonly Chunk[],
  questions: readonly QuestionSpec[],
): string {
  const asked = questions
    .map((question) => `- ${question.id}: ${question.label} — look for ${question.seek}`)
    .join("\n");

  const body = chunks
    .map((chunk) => (chunk.heading ? `[section: ${chunk.heading}]\n${chunk.text}` : chunk.text))
    .join("\n");

  return `COMPANY BEING RESEARCHED: ${company.name} (${company.domain}), ${company.industry}

DOCUMENT
id: ${document.id}
kind: ${document.kind}
title: ${document.title}
url: ${document.url}
published: ${document.published_at ?? "undated"}

QUESTIONS TO ANSWER FROM THIS DOCUMENT
${asked}

DOCUMENT TEXT BEGINS
${body}
DOCUMENT TEXT ENDS`;
}

/**
 * The retry. Only quote misses are retried, once, and the failing quotes are echoed back.
 *
 * A retry that just says "try again" gets the same output. Showing the model exactly which strings
 * were not found is what makes the second attempt different, and bounding it at one keeps a bad
 * document from turning into an unbounded spend.
 */
export function retryRequest(original: string, failedQuotes: readonly string[]): string {
  const list = failedQuotes.map((quote) => `- ${JSON.stringify(quote)}`).join("\n");
  return `${original}

RETRY. These quotes from your previous answer were NOT found in the document text above:
${list}

They were paraphrased, re-punctuated, or stitched together across a gap. Extract again. Copy each quote character-for-character from the document text, as one contiguous run. If a claim cannot be supported by such a quote, omit the claim entirely — an omitted claim costs nothing and a wrong quote is discarded anyway.`;
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
