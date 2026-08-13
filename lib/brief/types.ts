/**
 * The type contract for the whole engine.
 *
 * Two ideas are encoded here rather than in prose, and they are the reason the project has a
 * thesis:
 *
 * 1. `Claim.quote` is supplied by the model; `Claim.span` is supplied by code. The model asserts
 *    that a quote exists in a document, and `resolve.ts` decides whether it does. A `Claim` with
 *    `span: null` never reaches a sentence.
 * 2. `Sentence.claim_ids` is non-empty by construction. There is no code path that produces a
 *    rendered sentence with zero citations, which is why the sweep can assert it as an invariant
 *    rather than a hope.
 *
 * Everything in `lib/brief/` is pure: no non-relative imports, enforced by `purity.test.ts`.
 */

/** Date-only. No times anywhere in the repo — documents are dated, not timestamped. */
export type Iso = string;

export type DocumentKind =
  | "homepage"
  | "pricing"
  | "careers"
  | "blog"
  | "press_release"
  | "filing_excerpt"
  | "news"
  | "review_site"
  | "changelog"
  | "job_post";

export const DOCUMENT_KINDS: readonly DocumentKind[] = [
  "homepage",
  "pricing",
  "careers",
  "blog",
  "press_release",
  "filing_excerpt",
  "news",
  "review_site",
  "changelog",
  "job_post",
];

export interface Company {
  id: string;
  name: string;
  domain: string;
  industry: string;
}

export interface SourceDocument {
  id: string;
  /**
   * Ownership is explicit rather than inferred from the URL, because the `c06` trap is a careers
   * page that names a competitor's product: a claim extracted from it can be *about* another
   * company while living in this company's document.
   */
  company_id: string;
  kind: DocumentKind;
  title: string;
  url: string;
  /** `null` when a page carries no date; staleness falls back to `retrieved_at`. */
  published_at: Iso | null;
  retrieved_at: Iso;
  /** Plain text with markdown-ish `## ` headings. Offsets in `Claim.span` index into this. */
  text: string;
}

/** What the extraction call is asked to distinguish. Drives modality, not truth. */
export type ClaimKind = "fact" | "number" | "opinion" | "forward_looking";

/** Who is doing the asserting. Drives attribution — see `compose.ts`. */
export type ClaimStance = "company" | "third_party" | "regulatory";

export interface ClaimValue {
  n: number;
  /** Normalized by `conflict.ts`. Two claims can only conflict within one unit. */
  unit: string;
}

export interface Span {
  /** Inclusive, in the coordinates of the untouched `SourceDocument.text`. */
  start: number;
  /** Exclusive. */
  end: number;
}

export interface Claim {
  id: string;
  question_id: QuestionId;
  /** The model's one-sentence restatement. Never rendered directly. */
  assertion: string;
  /** Must appear verbatim in the document, modulo the foldings in `normalize.ts`. */
  quote: string;
  /** Resolved by `resolve.ts`. `null` means the gate rejected it. */
  span: Span | null;
  document_id: string;
  /** The company the claim is *about*, which is not always the document's owner. */
  subject_company_id: string;
  kind: ClaimKind;
  stance: ClaimStance;
  /** Parsed for `kind === "number"` only. `null` cannot conflict, deliberately. */
  value: ClaimValue | null;
  /** The document's date. Never today. Staleness is measured from this. */
  observed_at: Iso;
}

export interface Conflict {
  question_id: QuestionId;
  /** At least two, and every member survives. Conflicts are never resolved. */
  claim_ids: string[];
  unit: string;
  /** max / min − 1. Displayed, never used to pick a winner. */
  spread: number;
}

export type Attribution = "bare" | "company_stated" | "forward_looking" | "regulatory";

export interface Sentence {
  /** Which of the 12 this sentence answers. Set by the compose call, preserved through binding. */
  question_id: QuestionId;
  text: string;
  /** Non-empty by construction. */
  claim_ids: string[];
  attribution: Attribution;
  /** Set when the backing claim is past its question's freshness budget. */
  as_of: Iso | null;
  conflicting: boolean;
  /** The engine added the attribution the compose call omitted. */
  repaired: boolean;
  /** True only for the Approach section, which infers over claims instead of citing one. */
  inferred: boolean;
}

export type RejectionReason =
  | "quote_not_found"
  | "quote_not_found_after_retry"
  | "wrong_company"
  | "stale"
  | "unroutable"
  | "no_surviving_citation"
  | "forward_looking_in_change_section"
  /** More supported sentences than the question's cap. Recorded rather than silently truncated. */
  | "over_question_cap";

export interface Rejection {
  reason: RejectionReason;
  /** The concrete comparison, always populated. The rejected pane is a feature, not debug output. */
  detail: string;
  claim?: Claim;
  sentence_text?: string;
  question_id?: QuestionId;
}

export interface BriefQuestion {
  question_id: QuestionId;
  sentences: Sentence[];
  /** Set when nothing could be rendered; names the document kinds that were missing. */
  unanswerable: { missing_kinds: DocumentKind[]; reason: "unroutable" | "no_surviving_claims" } | null;
}

export interface BriefSection {
  section: SectionId;
  questions: BriefQuestion[];
}

export interface Coverage {
  /** Questions with at least one document of an answering kind. Known before any model call. */
  routable: number;
  /** Questions that ended up with at least one rendered sentence. */
  answered: number;
  total: number;
}

export interface Cost {
  extract_calls: number;
  retry_calls: number;
  compose_calls: number;
  claims_returned: number;
  claims_surviving: number;
}

export interface Brief {
  company: Company;
  sections: BriefSection[];
  /**
   * Every claim that survived the gate, with its resolved span. Sentences carry ids; this is where
   * the ids resolve to. It is what lets the UI turn a citation into a highlighted character range,
   * and what lets the sweep re-resolve every span independently instead of trusting the one that was
   * stored.
   */
  claims: Claim[];
  conflicts: Conflict[];
  rejected: Rejection[];
  coverage: Coverage;
  as_of: Iso;
  generated_at: Iso;
  /** `null` for a brief built without a generation pass (e.g. re-derived in the sweep). */
  cost: Cost | null;
}

/**
 * What the compose call returns, before the engine binds it. Deliberately minimal: text plus the
 * claims it used. The model does not get to set attribution, `as_of`, or `conflicting` — those are
 * derived from the claims it cited.
 */
export interface ComposedSentence {
  question_id: QuestionId;
  text: string;
  claim_ids: string[];
}

// ── ids, declared here so `questions.ts` and every consumer share one source ──────────────────

export type SectionId = "company" | "motion" | "change" | "pain" | "approach";

export type QuestionId =
  | "what_they_sell"
  | "who_they_sell_to"
  | "scale"
  | "gtm_motion"
  | "pricing_shape"
  | "segment_shift"
  | "recent_changes"
  | "people_moves"
  | "what_they_shipped"
  | "stated_priorities"
  | "third_party_complaints"
  | "likely_owner_and_hook";
