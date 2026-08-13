/**
 * The 12 questions, their sections, their routing table and their freshness budgets.
 *
 * This file is the reason absence is visible. A brief built from "summarize this company" cannot
 * report a gap, because nothing declared what was supposed to be there — models fill silence with
 * plausible padding, which is the content most likely to be false. Twelve fixed questions turn a
 * gap into a countable, renderable fact.
 *
 * `answerable_from` is load-bearing in a second way: a question whose kinds are all absent for a
 * company is rejected as `unroutable` *before any model call*, so coverage gaps cost zero tokens
 * and are computed rather than discovered.
 */

import type { DocumentKind, QuestionId, SectionId } from "./types";

export interface QuestionSpec {
  id: QuestionId;
  section: SectionId;
  /** Shown in the UI as the question the sentences below it answer. */
  label: string;
  /** What the extraction call is asked to look for. Kept short; the prompt adds the rules. */
  seek: string;
  /** Only documents of these kinds are ever sent for this question. */
  answerable_from: DocumentKind[];
  /**
   * Past this age a sentence renders with an `As of <month year>` prefix; past 3× it drops as
   * `stale`. Chosen per question because "what they sell" ages in years and "scale" in months.
   */
  freshness_days: number;
  /** Cap on rendered sentences. Three is a brief; ten is a wall nobody reads. */
  max_sentences: number;
}

export const SECTIONS: readonly { id: SectionId; label: string }[] = [
  { id: "company", label: "Company" },
  { id: "motion", label: "Motion" },
  { id: "change", label: "Change" },
  { id: "pain", label: "Pain" },
  { id: "approach", label: "Approach" },
];

/**
 * The Approach section infers over claims rather than citing one, so it has no
 * `answerable_from` of its own and is excluded from extraction routing entirely.
 */
export const INFERRED_QUESTION: QuestionId = "likely_owner_and_hook";

export const QUESTIONS: readonly QuestionSpec[] = [
  {
    id: "what_they_sell",
    section: "company",
    label: "What do they sell?",
    seek: "the product or service sold, in the company's own words or a third party's",
    answerable_from: ["homepage", "pricing", "blog", "filing_excerpt"],
    freshness_days: 540,
    max_sentences: 3,
  },
  {
    id: "who_they_sell_to",
    section: "company",
    label: "Who do they sell to?",
    seek: "the segment, industry, company size or role the product is aimed at",
    answerable_from: ["homepage", "pricing", "review_site", "blog"],
    freshness_days: 540,
    max_sentences: 3,
  },
  {
    id: "scale",
    section: "company",
    label: "How big are they?",
    seek: "headcount, revenue, customer or seat counts, offices — anything countable",
    answerable_from: ["filing_excerpt", "press_release", "news", "careers"],
    freshness_days: 120,
    max_sentences: 3,
  },
  {
    id: "gtm_motion",
    section: "motion",
    label: "How do they go to market?",
    seek: "self-serve versus sales-led signals: demo gates, trials, quotas, SDR or AE roles",
    answerable_from: ["pricing", "careers", "job_post", "blog"],
    freshness_days: 365,
    max_sentences: 3,
  },
  {
    id: "pricing_shape",
    section: "motion",
    label: "What shape is their pricing?",
    seek: "tiers, per-seat versus usage, published numbers, enterprise-contact-us",
    answerable_from: ["pricing", "press_release"],
    freshness_days: 365,
    max_sentences: 2,
  },
  {
    id: "segment_shift",
    section: "motion",
    label: "Which way are they moving?",
    seek: "evidence of moving up-market or down-market, or into a new segment or geography",
    answerable_from: ["press_release", "news", "blog", "job_post"],
    freshness_days: 180,
    max_sentences: 2,
  },
  {
    id: "recent_changes",
    section: "change",
    label: "What changed recently?",
    seek: "events that already happened: funding, acquisitions, launches, reorganizations",
    answerable_from: ["press_release", "news", "changelog"],
    freshness_days: 120,
    max_sentences: 3,
  },
  {
    id: "people_moves",
    section: "change",
    label: "Who joined or left?",
    seek: "named arrivals or departures, and which function is hiring",
    answerable_from: ["press_release", "news", "careers", "job_post"],
    freshness_days: 120,
    max_sentences: 2,
  },
  {
    id: "what_they_shipped",
    section: "change",
    label: "What did they ship?",
    seek: "released features or products, with dates where stated",
    answerable_from: ["changelog", "press_release", "blog"],
    freshness_days: 120,
    max_sentences: 3,
  },
  {
    id: "stated_priorities",
    section: "pain",
    label: "What do they say they care about?",
    seek: "priorities the company states for itself — initiatives, bets, stated problems",
    answerable_from: ["blog", "press_release", "filing_excerpt", "careers"],
    freshness_days: 180,
    max_sentences: 3,
  },
  {
    id: "third_party_complaints",
    section: "pain",
    label: "What do others complain about?",
    seek: "criticism from outside the company: reviews, press scrutiny, named shortcomings",
    answerable_from: ["review_site", "news"],
    freshness_days: 365,
    max_sentences: 3,
  },
  {
    id: INFERRED_QUESTION,
    section: "approach",
    label: "Who likely owns this, and what is the hook?",
    seek: "inference over the surviving claims — never extracted from a document",
    answerable_from: [],
    freshness_days: 120,
    max_sentences: 2,
  },
];

export const QUESTION_COUNT = QUESTIONS.length;

export function questionById(id: QuestionId): QuestionSpec {
  const found = QUESTIONS.find((question) => question.id === id);
  // Exhaustive by construction: `QuestionId` is a closed union over this array. The throw exists
  // so a future edit that removes an entry fails at the call site instead of returning undefined.
  if (!found) throw new Error(`Unknown question id: ${id}`);
  return found;
}

export function questionsInSection(section: SectionId): QuestionSpec[] {
  return QUESTIONS.filter((question) => question.section === section);
}

/** Questions that extraction is allowed to run for — everything except the inferred one. */
export function extractableQuestions(): QuestionSpec[] {
  return QUESTIONS.filter((question) => question.id !== INFERRED_QUESTION);
}

/**
 * Which of a company's documents can answer a question. Empty means `unroutable`: the question
 * is unanswerable from this corpus and we know it without spending a token.
 */
export function routeDocuments<T extends { kind: DocumentKind }>(
  question: QuestionSpec,
  documents: readonly T[],
): T[] {
  return documents.filter((document) => question.answerable_from.includes(document.kind));
}

/** The document kinds a question wanted and this company does not have. Renders in the UI. */
export function missingKinds<T extends { kind: DocumentKind }>(
  question: QuestionSpec,
  documents: readonly T[],
): DocumentKind[] {
  const present = new Set(documents.map((document) => document.kind));
  return question.answerable_from.filter((kind) => !present.has(kind));
}
