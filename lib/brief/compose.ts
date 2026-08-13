import { INFERRED_QUESTION, questionById } from "./questions";
import { asOfLabel } from "./stale";
import type {
  Attribution,
  Claim,
  ComposedSentence,
  Iso,
  Rejection,
  Sentence,
} from "./types";

/**
 * Binding composed text to the claims behind it — and fixing the verb.
 *
 * Most text written about a company is written by that company. A brief that renders "they are the
 * leading platform for regulated sustainability disclosure" because the homepage says so has not
 * researched anything: it has retyped an ad on a research tool's letterhead. The fix is not to drop
 * the claim — the claim is true, the company really does say that — it is to keep the attribution
 * the source had and the model dropped.
 *
 * So attribution is derived from the claims a sentence cites, never from the sentence, and the
 * engine REPAIRS rather than rejects: a sentence citing only company-stance claims that arrives
 * without an attribution marker gets one prefixed, deterministically, with `repaired: true` so the
 * UI can show it happened. Dropping it would lose information; trusting the model to have written it
 * correctly would make the rule a suggestion.
 *
 * Rejection is reserved for the one thing repair cannot fix: a sentence citing nothing that
 * survived the gate.
 */

/** Phrases that already attribute a statement to the company. Case-insensitive, word-boundaried. */
const COMPANY_MARKERS = [
  "positions itself",
  "positions the",
  "describes itself",
  "describes the",
  "describes its",
  "states that",
  "states it",
  "says that",
  "says it",
  "claims to",
  "claims that",
  "reports",
  "according to the company",
  "according to its own",
  "the company's own",
  "its own",
  "markets itself",
  "advertises",
  "calls itself",
];

/** Phrases that mark a statement as intent rather than event. */
const FORWARD_MARKERS = [
  "plans to",
  "plan to",
  "intends to",
  "intend to",
  "expects to",
  "expect to",
  "aims to",
  "aim to",
  "targets",
  "will begin",
  "will open",
  "will launch",
  "says it will",
  "plans for",
  "announced its intention",
  "intention to",
  "subject to",
];

const REGULATORY_MARKERS = ["filings show", "in its filings", "disclosure", "filed", "reported in"];

/**
 * Attribution is a property of the cited evidence, not of the prose.
 *
 * Order matters. Modality outranks stance: a forward-looking statement from a third party is still a
 * plan, and rendering it as an event is the `c08` failure. Below that, a single third-party claim is
 * enough to let a sentence stand bare — if an outside source says it, the company's agreement with
 * it does not turn it back into marketing.
 */
export function attributionFor(claims: readonly Claim[]): Attribution {
  if (claims.length === 0) return "bare";
  if (claims.some((claim) => claim.kind === "forward_looking")) return "forward_looking";
  if (claims.some((claim) => claim.stance === "third_party")) return "bare";
  if (claims.every((claim) => claim.stance === "regulatory")) return "regulatory";
  if (claims.some((claim) => claim.stance === "company")) return "company_stated";
  return "bare";
}

function hasMarker(text: string, markers: readonly string[]): boolean {
  const flat = text.toLowerCase();
  return markers.some((marker) => flat.includes(marker));
}

/** The prefix used when the model omitted attribution. Plain, boring, and always the same. */
const COMPANY_PREFIX = "The company states that ";
const FORWARD_PREFIX = "The company says it plans to ";

export function repair(
  text: string,
  attribution: Attribution,
): { text: string; repaired: boolean } {
  const trimmed = text.trim();

  if (attribution === "company_stated" && !hasMarker(trimmed, COMPANY_MARKERS)) {
    return { text: COMPANY_PREFIX + lowerFirst(trimmed), repaired: true };
  }

  if (attribution === "forward_looking" && !hasMarker(trimmed, FORWARD_MARKERS)) {
    // Deliberately not clever: the prefix reads stiffly against some sentences. A stiff sentence
    // that cannot be mistaken for an event beats a fluent one that can.
    return { text: FORWARD_PREFIX + lowerFirst(stripLeadingSubject(trimmed)), repaired: true };
  }

  if (attribution === "regulatory" && !hasMarker(trimmed, REGULATORY_MARKERS)) {
    return { text: `Filings show that ${lowerFirst(trimmed)}`, repaired: true };
  }

  return { text: trimmed, repaired: false };
}

export interface BindInput {
  composed: readonly ComposedSentence[];
  /** Claims that survived the gate and staleness. Anything else is not citable. */
  surviving: readonly Claim[];
  /** Claim ids involved in a conflict, from `conflict.ts`. */
  conflicted: ReadonlySet<string>;
  /** As-of labels for aging claims, from `stale.ts`. */
  asOfLabels: ReadonlyMap<string, Iso>;
}

export interface BindResult {
  sentences: Sentence[];
  rejected: Rejection[];
}

export function bindSentences({
  composed,
  surviving,
  conflicted,
  asOfLabels,
}: BindInput): BindResult {
  const byId = new Map(surviving.map((claim) => [claim.id, claim]));
  const sentences: Sentence[] = [];
  const rejected: Rejection[] = [];

  for (const candidate of composed) {
    const cited = candidate.claim_ids.map((id) => byId.get(id)).filter((claim): claim is Claim => claim !== undefined);

    /*
     * The load-bearing rejection. A sentence citing only claims the gate killed is exactly the
     * hallucination this project exists to stop: it reads as sourced, its footnote numbers look
     * real, and there is nothing behind them.
     */
    if (cited.length === 0) {
      rejected.push({
        reason: "no_surviving_citation",
        detail:
          candidate.claim_ids.length === 0
            ? "The sentence cited nothing at all."
            : `Cited ${candidate.claim_ids.join(", ")}; none survived the gate.`,
        sentence_text: candidate.text,
        question_id: candidate.question_id,
      });
      continue;
    }

    const question = questionById(candidate.question_id);
    const attribution = attributionFor(cited);
    const { text, repaired } = repair(candidate.text, attribution);

    // The oldest cited claim sets the as-of. Using the newest would let one fresh citation launder a
    // stale one, and the only direction a research tool must never err is claiming to be current.
    const staleDates = cited
      .map((claim) => asOfLabels.get(claim.id))
      .filter((date): date is Iso => date !== undefined)
      .sort();
    const asOf = staleDates[0] ?? null;

    sentences.push({
      question_id: candidate.question_id,
      text: asOf ? `As of ${asOfLabel(asOf)}, ${lowerFirst(text)}` : text,
      claim_ids: cited.map((claim) => claim.id),
      attribution,
      as_of: asOf,
      conflicting: cited.some((claim) => conflicted.has(claim.id)),
      repaired,
      inferred: question.id === INFERRED_QUESTION,
    });
  }

  return { sentences, rejected };
}

/**
 * Forward-looking claims are filtered out of the Change section before composition, not after.
 *
 * "What changed recently" has one job, and a plan is not a change. Filtering after composition would
 * mean the model had already written the sentence, and a sentence about a Lyon office that does not
 * exist is a liability whether or not it renders.
 */
export function filterForwardLookingFromChange(claims: readonly Claim[]): {
  kept: Claim[];
  rejected: Rejection[];
} {
  const kept: Claim[] = [];
  const rejected: Rejection[] = [];

  for (const claim of claims) {
    const question = questionById(claim.question_id);
    if (question.section === "change" && claim.kind === "forward_looking") {
      rejected.push({
        reason: "forward_looking_in_change_section",
        detail: `A stated intention cannot answer "${question.label}" — it has not happened yet.`,
        claim,
        question_id: claim.question_id,
      });
      continue;
    }
    kept.push(claim);
  }

  return { kept, rejected };
}

function lowerFirst(text: string): string {
  const first = text.slice(0, 1);
  // Leave acronyms and proper-noun-initial sentences alone: "CSRD reporting…" must not become
  // "cSRD reporting…". Only a single leading capital followed by lowercase is folded.
  if (first !== first.toLowerCase() && text.slice(1, 2) === text.slice(1, 2).toLowerCase()) {
    return first.toLowerCase() + text.slice(1);
  }
  return text;
}

/** `The company plans to open…` → `open…`, so a repair prefix does not stack a second subject. */
function stripLeadingSubject(text: string): string {
  return text.replace(
    /^(the company|it|they)\s+(plans?|intends?|expects?|aims?)\s+to\s+/i,
    "",
  );
}
