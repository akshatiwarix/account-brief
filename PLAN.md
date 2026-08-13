# Day 006 — Account Brief — Implementation Plan

Day 006 of a 100-day building challenge. The concept is fixed by the master
backlog (`~/Desktop/100-days-portfolio-execution-plan.md`): *a company research
tool that turns a company or domain into a concise, evidence-backed sales brief.*
Portfolio angle: research automation, synthesis, citations.

Every choice below came out of a decision-by-decision interview across four
rounds. The 24 settled decisions are recorded at the bottom; treat them as
decided, not as open questions to relitigate.

**Time limit:** one day. Feature-frozen at plan sign-off.

---

## Problem

"Paste a domain, get a company summary" is the most slop-adjacent project on the
100-day list. The default build is three lines of code — fetch a page, hand it to
a model, render the markdown — and every reviewer has already seen it twice this
month. It produces a document that reads well and cannot be trusted, which is the
worst possible artifact for the job: a rep who believes a fabricated headcount
walks into a call and burns the account.

Four specific failures live inside that default build, and all four are why this
repo exists.

**Citations are decorative.** Tools footnote a sentence with a URL and call it
grounded. Nobody checks that the sentence is actually *in* the document, because
checking means aligning generated text against source text, which is real work.
An unverified citation is worse than none — it converts a guess into an apparent
fact.

**Marketing copy gets laundered into intelligence.** Most text about a company is
written by that company. A brief that says *"they are the leading platform for
mid-market compliance"* because the homepage says so has not researched anything;
it has retyped an ad and put a research tool's letterhead on it.

**Sources disagree and the tool picks silently.** The careers page says 200
people, the press release says 340. Something has to give, and models resolve it
by writing whichever number they saw last, with total confidence and no mention
that the other one exists. The disagreement was the actual finding.

**Absence is invisible.** Ask a model twelve questions about a company whose
corpus can only answer four and it will answer twelve. There is no such thing as
a blank section in generated prose — the gaps get filled with plausible padding,
which is precisely the content most likely to be false.

So the interesting problems are:

- Can the pipeline make it **structurally impossible** for an unsupported sentence
  to reach the page — enforced by code a reviewer can run, not by asking a model
  nicely in a system prompt?
- Can a claim's citation be checked, mechanically, character by character, against
  the document it names?
- Can the tool state the company's own claims *as claims* without human review?
- When two sources conflict, can the tool refuse to choose?
- When the sources cannot answer, can the tool say so — and know it *before*
  spending a token?

That is a grounding and verification problem with synthesis on top, and it is
what this project builds. The brief is the output. **The gate is the product.**

## Intended user

An SDR, AE or founder doing pre-call research who needs a page they can trust in
five minutes, and who will ask "where does this number come from" expecting a
click, not a URL to go read.

Secondary user, and honestly the one the repo is written for: whoever reads it to
judge whether the author understands that grounding is an engineering problem
with a test suite, or has just wired a prompt to a textarea.

## User journey

1. Land on the app. Ten companies, briefs already built, no key, no config, no
   empty state, no spinner. Each brief is badged `cached` with its generation date.
2. Pick a company. Read a five-section brief. Every sentence carries a superscript
   citation. Some sentences are prefixed *"positions itself as"*, some *"As of
   March 2026"*, some are marked **conflicting** with two dates.
3. **Click a citation.** The Sources pane opens that document, scrolled to the
   quote, with the exact span highlighted. This is the demo — the citation is a
   character range, not a footnote.
4. Read the coverage meter: `9 / 12 questions answerable`. Click through to the
   three that were not, each naming the document kinds that were missing.
5. Open the **Rejected** pane. Model claims that did not survive, grouped by
   reason with counts: quote not found in the document, quote not found after one
   retry, source too stale, sentence with no surviving citation, claim about the
   wrong company. This pane is worth more than the brief.
6. Compare companies. `c02` shows two headcounts and picks neither. `c05` has a
   starved Pain section because nothing third-party exists. `c09` is mostly *not
   answerable from available sources*. `c08` renders every plan as a plan.
7. Export `brief.md` — the artifact a rep pastes into a CRM note, with numbered
   footnotes. Or `claims.json` — every claim including rejected ones, with spans
   and reasons, for a reviewer to audit.
8. Optional, only with a Gemini key set: paste your own documents for a company
   the corpus has never seen, and watch the gate run live on unseen text. Costs
   are displayed: extract calls, retries, claims dropped.

## MVP scope (user-selected)

**In:**

- 12 fixed research questions in 5 sections, each declaring which document kinds
  can answer it
- Declarative document routing, so unanswerable questions cost zero tokens
- Two constrained model calls — extract (document → claims with verbatim quotes)
  and compose (surviving claims → sentences with claim IDs)
- **The gate**: deterministic quote → span resolution with reversible
  normalization, no fuzzy matching, one bounded retry
- Stance and modality templates: company claims and forward-looking statements
  cannot render as facts
- First-class conflicts — both sides rendered, neither chosen
- Per-question freshness budgets, `as of` prefixing, hard drop at 3× budget
- Coverage reporting, computed before and after generation
- Authored synthetic corpus: 10 companies, ~80 documents, 10 engineered traps
- Committed brief fixtures with an `inputs_hash` that fails the build when stale
- Three-pane UI with citation → highlighted span, rejected pane, coverage meter
- `POST /api/brief` for regeneration and paste-documents, key-gated, rate-limited
- Exports: `brief.md`, `claims.json`
- Invariant sweep across every company × every question
- Live eval producing an honest rejection rate for the README

**Out** (each belongs to a specific later day, listed under Scope boundaries):
live URL fetching, embeddings or vector retrieval, persistence, auth,
multi-model comparison, ICP fit scoring, enrichment, CSV, personas, signal
timing, narrative "why now", E2E tests, CI.

## Stack (user-selected)

Next 16.3 (App Router) · React 19.2 · TypeScript strict + `noUncheckedIndexedAccess`
· Tailwind 4 · Zod 4.4 · Vitest 4.1 · `@google/genai` · npm · Vercel · MIT.

Identical to Days 001–005 so a reviewer types the same commands in every repo.

## Data sources (user-selected)

**An authored synthetic corpus. `*.example` domains. Labeled synthetic above the
fold in the README.**

Two reasons, and the second is the load-bearing one.

Committing real page text from real companies is a copyright question on a public
repo, and real pages rot. But the deciding factor is that **you cannot find a real
corpus that contains exactly the ten traps.** The traps are the test suite. A
corpus where no two documents disagree cannot demonstrate conflict handling, and
waiting to stumble across a real company whose careers page names a competitor's
product is not a plan.

Cost: a human cannot click a citation through to a real source to verify it. Paid
back by paste-documents (see Routes) — paste any real company's actual pages and
the gate runs on text it has never seen, which is the same proof without the
copyright surface or the rot.

The corpus prose must be written in genuine register — a careers page that sounds
like a careers page, an earnings excerpt that hedges like one. Obviously-fake
filler would let extraction play on easy mode and invalidate the rejection rate.

## Architecture

```
                    ┌─ read cached brief ─► data/briefs/<id>.json (Zod + hash at import)
Browser ────────────┤   (server components, nothing recomputes client-side)
                    │
                    └─ POST /api/brief ─► Zod ─► key check ─► rate limit
                                            │
                                            ├─ lib/research  extract (Gemini, per doc × section)
                                            │                   └─ retry once on quote miss
                                            │                compose (Gemini, claims only)
                                            └─ lib/brief     buildBrief() ── the gate, pure
```

```
lib/brief/               ← pure. no non-relative imports, at all.
  types.ts               Document, Claim, Sentence, Brief, Conflict, Rejection
  questions.ts           the 12 questions, sections, routing table, freshness budgets
  normalize.ts           reversible quote folding + offset map — read this file first
  chunk.ts               heading split, soft 1500-char cap, chunk→document offsets
  resolve.ts             quote → span, or null. the gate's teeth
  conflict.ts            value parsing, unit normalization, tolerance, symmetric sets
  stale.ts               freshness budgets, `as of`, hard drop at 3×
  compose.ts             stance/modality attribution, repair, citation binding
  coverage.ts            answerable-before-spending, rendered-after
  render.ts              brief → markdown with numbered footnotes
  index.ts               buildBrief({ company, documents, claims, asOf })
lib/research/            impure: Gemini extract + compose, versioned prompts,
                         response schemas, retry, cost accounting, hash, rate limiter,
                         paste validation, and the unwired fetch adapter with its warning
data/                    corpus.json, corpus.ts, briefs/<id>.json, briefs.ts
app/                     server components + api/brief
scripts/                 generate-briefs.mts, sweep.mts, eval.mts
```

**`buildBrief` is the only exported engine function.** Day 007 (`why-now`) imports
that one call and nothing else, same contract as Day 005's `buildBoard`. Route
handlers and components must not reach into `resolve.ts` or `compose.ts` directly.

**The model's output is an input to the pure engine.** This is the structural
reason the gate cannot be bypassed: nothing in `lib/brief/` can call a model even
if a later change wanted it to, so there is no path where a claim reaches a
sentence without passing `resolve.ts`. Enforced by `purity.test.ts`, which scans
for bare import specifiers with no allowlist.

**No client-side engine.** Day 005 shipped its engine to the browser because a
date scrubber makes a request-per-frame a stutter-per-frame. There is no scrubber
here — briefs are static fixtures — so `app/page.tsx` and the company pages are
server components and nothing recomputes in the browser. Day 005's deviation is
deliberately not carried over.

## Data model

```ts
type Iso = string;                    // "2026-03-14", date-only, no times anywhere

type DocumentKind =
  | "homepage" | "pricing" | "careers" | "blog" | "press_release"
  | "filing_excerpt" | "news" | "review_site" | "changelog" | "job_post";

interface SourceDocument {
  id: string;                 // "d031"
  company_id: string;         // ownership is explicit — see the c06 trap
  kind: DocumentKind;
  title: string;
  url: string;                // always *.example
  published_at: Iso | null;   // null when a page carries no date
  retrieved_at: Iso;
  text: string;               // markdown-ish plain text, headings as "## "
}

interface Company {
  id: string;                 // "c01"
  name: string;
  domain: string;             // *.example
  industry: string;
}

interface Claim {
  id: string;                 // "c01-q03-014"
  question_id: QuestionId;    // one of the 12
  assertion: string;          // the model's restatement, one sentence
  quote: string;              // VERBATIM from the document — the gate's input
  span: { start: number; end: number } | null;   // resolved by code, never by the model
  document_id: string;
  kind: "fact" | "number" | "opinion" | "forward_looking";
  stance: "company" | "third_party" | "regulatory";
  value: { n: number; unit: string } | null;     // parsed for kind === "number" only
  observed_at: Iso;           // the document's date. never today
}

interface Conflict {
  question_id: QuestionId;
  claim_ids: string[];        // ≥2, symmetric, all survive
  unit: string;
  spread: number;             // max/min − 1
}

interface Sentence {
  text: string;               // what renders
  claim_ids: string[];        // ≥1 always. zero is unreachable by construction
  attribution: "bare" | "company_stated" | "forward_looking" | "regulatory";
  as_of: Iso | null;          // set when the backing claim is past its freshness budget
  conflicting: boolean;
  repaired: boolean;          // engine added the attribution the model omitted
}

type RejectionReason =
  | "quote_not_found"
  | "quote_not_found_after_retry"
  | "wrong_company"
  | "stale"
  | "unroutable"
  | "no_surviving_citation"
  | "forward_looking_in_change_section";

interface Rejection {
  reason: RejectionReason;
  detail: string;             // the concrete comparison. never empty
  claim?: Claim;
  sentence_text?: string;
}

interface Brief {
  company: Company;
  sections: {
    section: SectionId;
    questions: {
      question_id: QuestionId;
      sentences: Sentence[];
      unanswerable: { missing_kinds: DocumentKind[] } | null;
    }[];
  }[];
  conflicts: Conflict[];
  rejected: Rejection[];
  coverage: {
    routable: number;         // computed before any model call
    answered: number;         // questions with ≥1 rendered sentence
    total: 12;
  };
  as_of: Iso;
  generated_at: Iso;
  cost: {
    extract_calls: number; retry_calls: number; compose_calls: number;
    claims_returned: number; claims_surviving: number;
  } | null;                   // null for cached fixtures older than the field
}
```

### The 12 questions

Fixed set. Absence is only visible if the question existed first.

| # | `question_id` | Section | Answerable from | Freshness budget |
|---|---|---|---|---|
| 1 | `what_they_sell` | Company | homepage, pricing, blog, filing_excerpt | 540d |
| 2 | `who_they_sell_to` | Company | homepage, pricing, review_site, blog | 540d |
| 3 | `scale` | Company | filing_excerpt, press_release, news, careers | 120d |
| 4 | `gtm_motion` | Motion | pricing, careers, job_post, blog | 365d |
| 5 | `pricing_shape` | Motion | pricing, press_release | 365d |
| 6 | `segment_shift` | Motion | press_release, news, blog, job_post | 180d |
| 7 | `recent_changes` | Change | press_release, news, changelog | 120d |
| 8 | `people_moves` | Change | press_release, news, careers, job_post | 120d |
| 9 | `what_they_shipped` | Change | changelog, press_release, blog | 120d |
| 10 | `stated_priorities` | Pain | blog, press_release, filing_excerpt, careers | 180d |
| 11 | `third_party_complaints` | Pain | review_site, news | 365d |
| 12 | `likely_owner_and_hook` | Approach | — inference over surviving claims — | — |

Each question renders 0–3 sentences or renders **"Not answerable from available
sources"** naming the document kinds that were missing. Question 12 is the only
one that is *inference over* cited claims rather than a cited claim itself, and it
is marked as such in the UI and in `brief.md`. Everything else is claim-backed or
absent.

**Routing runs before the model.** A question whose `answerableFrom` kinds are all
absent for a company is `unroutable` — recorded as a rejection, reported in
coverage, and **never sent to a model**. Gaps are computed, not discovered.

Call budget: questions group into their 5 sections, so one company is
`documents × applicable sections` extract calls plus one compose call —
roughly **20–40 extract calls + 1 compose** for a well-covered company. That
number goes in the README rather than being quietly elided.

### The gate

Three files, ~150 lines, and the whole thesis.

**`normalize.ts`** folds a string and keeps a reversible map back to original
offsets. Rules, in order: Unicode NFKC · curly quotes → straight · every dash
variant → `-` · `…` → `...` · NBSP and all Unicode spaces → space · collapse
whitespace runs → one space · trim · case fold. It emits `{ text, sourceIndex[] }`
where `sourceIndex[i]` is the original index of normalized character `i`, so a
match at `[i, j)` maps to `[sourceIndex[i], sourceIndex[j-1] + 1)` in the
untouched document — which is what the UI highlights.

**`resolve.ts`** normalizes the quote, normalizes the document, `indexOf`. Found →
span in original coordinates. Not found → `span: null`, claim dead, rejection
recorded with the quote and the document ID.

**No fuzzy matching, and this is the hill to die on.** A similarity threshold is
exactly the knob that lets a paraphrase pass as a quote, which is the single
failure the project exists to prevent. If the rejection rate comes out ugly, the
fix is a stricter extraction prompt and the one retry — never a looser matcher.
The rejection rate ships in the README either way; a high honest number beats a
hidden threshold.

**One retry, bounded, and only for quote misses.** Failing quotes are echoed back
with the instruction to copy character-for-character. Second failure drops the
claim with `quote_not_found_after_retry`. Retries are counted and displayed.

Compose receives **only surviving claims, never document text**. It cannot cite
what the gate already killed because it never sees it.

### Attribution — marketing copy is not a fact

Most text about a company is written by that company. Rendering it bare launders
an ad into intelligence.

| stance / kind | Renders as |
|---|---|
| `company` + `fact` | *"positions itself as…"*, *"states that…"*, *"describes … as"* |
| `company` + `number` | *"reports…"* |
| any + `forward_looking` | *"says it plans to…"*, *"expects to…"* |
| `third_party` | bare |
| `regulatory` | bare, or *"filings show…"* |

Enforced by **repair, not rejection.** Compose returns sentence text plus claim
IDs; the engine then checks that a sentence citing only `company`-stance claims
contains an attribution marker. If it does not, the engine deterministically
prefixes `"The company states that "` and lowercases the first character, setting
`repaired: true`. Repair rather than drop, because the information is true — what
was wrong was the verb. The sweep then asserts no company-stance sentence lacks a
marker, so the model cannot bypass the rule by writing a confident sentence.

`forward_looking` claims are additionally **filtered out of the Change section
before compose** — a plan is not a change that happened — with reason
`forward_looking_in_change_section`.

The Pain section will visibly starve under these rules for companies with no
third-party sources. That is the correct outcome and `c05` exists to show it.

### Conflicts — refuse to choose

Two claims answering the same question with parsed `value`s in the **same
normalized unit** differing by more than **10%** form a `Conflict`. Both claims
survive. The brief renders both with both dates and a `conflicting` marker.
Recency is *displayed*, never *applied*.

Different units are not a conflict — `1,200 customers` and `1,200 seats` are
different facts, and `c03` exists so that false positive gets caught by a test
rather than by a reader.

Unit normalization is a small explicit table (`employees|people|staff|headcount`
→ `people`; `$`, `USD`, `M`, `bn` → `usd` with scaling; `customers`, `seats`,
`logos`, `ARR` distinct). Anything unparseable leaves `value: null` and simply
cannot conflict — silent, and honest about it.

### Staleness

Per-question budgets from the table above. Past budget, the sentence carries
`as_of` and renders `As of March 2026, …`. Past **3× budget** the claim drops with
reason `stale`. Rationale is Day 005's rule aimed at a new target: never claim
something is fresher or more settled than the sources support. A document with
`published_at: null` falls back to `retrieved_at`.

## Corpus design

**10 companies × 6–11 documents ≈ 80 documents.** Distribution designed, not
sampled. One company per trap:

| Company | Trap | What it proves |
|---|---|---|
| `c01` | Rich and clean, all 12 answerable | The happy path exists |
| `c02` | Headcount 200 (Mar) vs 340 (Sep) | Conflict renders both, picks neither |
| `c03` | "1,200 customers" vs "1,200 seats" | Unit mismatch is not a conflict |
| `c04` | Pricing only on an 18-month-old page | `as of`, then hard drop past 3× |
| `c05` | Pure marketing, zero third-party docs | Pain starves; stance gate visible |
| `c06` | Careers page names a competitor's product | `wrong_company` rejection |
| `c07` | Key number lives in a table caption | Extraction from non-prose structure |
| `c08` | Everything forward-looking | Plans never render as changes |
| `c09` | Two documents only | Coverage is mostly "not answerable" |
| `c10` | Reviews contradict the homepage | Both render, marked, neither wins |

`data/corpus.ts` parses `corpus.json` through Zod at import time, so a bad
hand-edit fails the build rather than a request. `corpus.test.ts` pins the
distribution — every `DocumentKind` appears at least twice, every trap is
structurally present, and flattening the corpus fails CI instead of quietly
making the demo boring.

## Extraction

Same conventions as Day 005: `@google/genai`, model `gemini-3.6-flash`,
`responseMimeType: "application/json"` with a native `responseSchema`, then Zod as
the trust boundary — a schema is a request, a validator is a guarantee.
`ThinkingLevel.MINIMAL` on both calls: this is constrained extraction against a
fixed schema, not reasoning, and the free tier's per-minute quota is what limits
the live demo.

Additions specific to this build:

- **`temperature: 0`** on both calls — not for quality, for reproducibility of the
  `inputs_hash` and the eval scoreboard.
- Prompts live in a **versioned constant** (`PROMPT_VERSION`). Editing a prompt
  invalidates every fixture, loudly, by design.
- Cost accounting is returned, not logged: extract calls, retry calls, compose
  calls, claims returned, claims surviving. Day 002's habit pointed at tokens.

## Fixtures

`data/briefs/<company_id>.json`, generated only by `scripts/generate-briefs.mts`.

Each fixture carries `inputs_hash` = SHA-256 over canonical JSON of document IDs
and texts, the question set and routing table, `PROMPT_VERSION`, the model ID and
the schema version. `data/briefs.ts` recomputes it at import time and **fails the
build on mismatch** — same posture as Day 005's Zod-at-import. So the repo cannot
ship a brief that no longer corresponds to its corpus.

Hashing uses `node:crypto` and therefore lives in `lib/research/hash.ts`, outside
the purity boundary. `lib/brief/` stays free of it.

## Routes

**`POST /api/brief`** is the only route.

Body is either `{ company_id }` — regenerate a bundled company — or
`{ company, documents }` — your own pasted text. Zod at the boundary. Caps: 12
documents, 40,000 characters each, 500 KB body. No key → **501** with a message
pointing at the cached briefs, exactly like Day 005. Model failure → 502.
Per-IP fixed-window rate limit, 5 requests per 10 minutes, in memory, injected
clock so tests do not sleep. Leaky per instance on Vercel and documented in
Limitations rather than papered over.

**No live URL fetching.** A public endpoint that fetches an arbitrary
user-supplied URL server-side is an SSRF hole — on Vercel it can be aimed at
instance metadata and link-local addresses, and doing it properly means scheme
allowlisting, DNS resolution with private-CIDR rejection, redirect chain
re-validation, timeouts and size caps, and it *still* leaves DNS-rebinding edges.
That is not the right day to spend on Day 006, and shipping it half-done on a
public repo is worse than not shipping it.

`lib/research/fetch-adapter.ts` therefore exists as an **unexported, uncalled**
adapter with a comment naming SSRF as the reason it is not wired to a route, so
the seam is visible and the decision is on the record. Live sourcing is Days
061–065.

## Validation / test plan

Vitest over `lib/**` only (`vitest.config.mts`, `.mts` deliberately). Unit tests
per normalization rule, per resolution case, per conflict rule, per attribution
template, per staleness boundary, plus:

- **`purity.test.ts`** — scans `lib/brief/**` for any bare import specifier. No
  allowlist. If the engine needs a package, the code belongs in `lib/research/`.
- **`corpus.test.ts`** — pins the ten traps and the kind distribution.
- **`normalize.test.ts`** — the offset map round-trips: for every position in
  every corpus document, mapping normalized → original → normalized is identity.

**`npm run sweep`** runs every company × every question against the committed
fixtures. No network, deterministic, CI-safe. It asserts:

- **every rendered sentence resolves to ≥1 surviving claim** — the load-bearing
  invariant; if this can fail, the project has no thesis
- every surviving claim's `span` re-resolves in its document text, offsets exact
- no claim cites a document belonging to another company (`c06`)
- no `company`-stance sentence renders without an attribution marker
- no `forward_looking` claim appears in the Change section
- conflicts are symmetric, every member survives, none is auto-resolved
- `coverage.routable` ≥ `coverage.answered`; every unanswered question renders the
  explicit message with a non-empty `missing_kinds`
- every rejection carries a non-empty `detail`
- `inputs_hash` matches for every fixture
- no `NaN`, `Infinity` or `undefined` reaches any count

**`npm run eval`** (key required, never in CI) re-runs extraction live across the
trap companies and reports the rejection rate per trap. That number goes in the
README as a number, not a boast.

Day 004's and Day 005's sweeps each found real bugs. Here the two most likely to
fail first are the span re-resolution after normalization and the attribution
regex — both would otherwise ship broken and unnoticed.

Manual verification: the main journey (land → pick → read → click citation →
coverage → rejected → compare traps → export) plus failure states (no key,
rate-limited, malformed paste, oversized paste, company with two documents,
company whose every claim is rejected).

## Implementation task order

Ten commits, each independently sound, pushed as they land:

1. **scaffold** — Next 16, `tsconfig` strict + `noUncheckedIndexedAccess`, Vitest,
   `lib/brief/types.ts`, `questions.ts` with all 12 and the routing table, and
   `purity.test.ts` failing loudly on the empty engine.
2. **corpus** — Zod schemas, ~80 authored documents across 10 companies with all
   ten traps, `corpus.ts`, `corpus.test.ts`.
3. **the gate** — `normalize.ts`, `chunk.ts`, `resolve.ts` and their tests.
   Nothing else. The thesis lands alone and is reviewable alone.
4. **policy** — `conflict.ts`, `stale.ts`, `compose.ts` attribution and repair,
   `coverage.ts`, `render.ts`; `buildBrief` complete with tests per rule.
5. **extraction** — `lib/research/`: versioned prompts, response schemas,
   retry-on-quote-miss, cost accounting, hash, the unwired fetch adapter.
6. **fixtures** — `generate-briefs.mts`, the ten committed briefs, the
   `inputs_hash` build gate.
7. **sweep** — every invariant above. Fix what it finds.
8. **UI** — three panes, citation → highlighted span, rejected pane, coverage
   meter, conflict and attribution affordances.
9. **route + exports** — `POST /api/brief`, rate limiter, paste panel,
   `brief.md`, `claims.json`.
10. **docs** — README, `docs/plain-english-guide.md`, four screenshots, the
    citation GIF.

## Deployment plan

Vercel, `main` auto-deploy. `GEMINI_API_KEY` in project env; `.env.local`
gitignored, `.env.example` committed with the name and no value. The app renders
all ten cached briefs, all rejected panes and all exports with the key unset —
only regeneration and paste degrade, to a 501 that names the cached briefs. Live
URL replaces the README's `[Live Demo](#)`.

## README plan

Master template from the backlog. Claims that must appear above the fold: the
corpus is **authored and synthetic** with `.example` domains; **every sentence is
span-verified against a source document or it does not render**; the measured
**rejection rate** from `npm run eval` as a real number.

Limitations must name: no live URL fetching, with SSRF as the stated reason;
in-memory rate limiting leaky per Vercel instance; attribution templates are a
blunt instrument and will read stiff; no embeddings, by choice, at this corpus
size; extraction is one model at temperature 0 and is not benchmarked across
models; the Approach section is inference rather than citation and is marked as
such.

## Definition of done

Live Vercel URL renders ten cached briefs with zero configuration · clicking a
citation highlights the exact character span in the source document · the rejected
pane is non-empty on trap companies · coverage reports honest gaps on `c09` ·
`c02` shows both headcounts and picks neither · paste-documents works with a key
and degrades to a clear 501 without one · `npm test`, `npm run sweep`,
`npm run build`, `npm run typecheck`, `npm run lint` all clean · `inputs_hash`
verified for every fixture · README follows the master template with the
synthetic-data note, the rejection rate and explicit limitations · four
screenshots and the citation GIF committed · ten commits pushed to
`akshatiwarix/account-brief`, MIT.

The Day 006 checkbox in the master backlog is ticked only on the user's explicit
confirmation that it shipped.

## Scope boundaries

| Feature | Belongs to |
|---|---|
| ICP fit scoring | Day 001 `icp-score` |
| Data enrichment | Day 002 `enrichment-waterfall` |
| CSV upload, header mapping | Day 003 `lead-cleaner` |
| Persona / buying committee logic | Day 004 `persona-mapper` |
| Signal detection, decay, timing | Day 005 `signal-scout` |
| Narrative "why now" for one account | Day 007 `why-now` (imports `buildBrief`) |
| Job-title normalization | Day 011 `title-normalizer` |
| Live website / news / competitor fetching | Days 061–065 |
| Evals as a product | Day 042 `research-agent-eval` |
| Hallucination detection as a product | Day 045 `hallucination-catcher` |

Also out: persistence, auth, embeddings, multi-model comparison, multi-tenant
config, E2E tests, CI.

**Hard rule: no sentence renders without a resolved span behind it.** Not a
guideline, not a prompt instruction — a code path that does not exist.

## Post-MVP ideas (not part of this build)

- Entailment checking on top of span matching — the quote exists, but does it
  actually support the assertion?
- Cross-document coreference so conflicts can be detected on entities, not just
  question IDs
- Live adapters behind the same `SourceDocument` interface, with a real SSRF
  defense
- Multi-model rejection-rate comparison as an eval product
- Reviewer workflow: accept/reject a claim and regenerate the brief around it

---

## Settled decisions

Recorded so they are not relitigated mid-build.

1. **The claim is a grounding gate, not a writer.** Every sentence resolves to a
   character span in a source document or it does not render. The verifier is the
   deliverable; the brief is the output.
2. **Authored synthetic corpus, `*.example`, labeled.** Traps must be engineered,
   not hoped for. Real verbatim text is a copyright surface and rots.
3. **The LLM sits inside the pipeline, sandwiched.** Two constrained calls,
   extract and compose, with deterministic code before, between and after. Day
   005's "never in the measurement path" rule cannot survive here, so it is
   replaced by structural containment instead of abstinence.
4. **Every extracted claim carries a mandatory verbatim quote,** and code — not
   the model — decides whether that quote exists.
5. **Normalized exact matching. No fuzzy, no threshold.** A threshold is the knob
   that lets a paraphrase pass as a quote.
6. **Normalization is reversible.** Offsets map back to the untouched document, so
   the UI highlights real characters. This is what makes citations clickable.
7. **One bounded retry, quote misses only,** counted and displayed. Then drop.
8. **Compose sees surviving claims only, never document text.** It cannot cite
   what the gate killed.
9. **Company marketing can never render as fact.** Stance and modality drive
   attribution templates, enforced by deterministic repair plus a sweep assertion.
10. **Forward-looking statements never render in the Change section.**
11. **Conflicts are first-class and never auto-resolved.** Both sides, both dates,
    recency displayed and not applied.
12. **Different units are not a conflict.** Explicit unit table; unparseable values
    cannot conflict.
13. **Per-question freshness budgets; `as of` prefix; hard drop at 3×.** Never
    claim something is fresher than the sources support.
14. **12 fixed questions in 5 sections.** Absence is only visible if the question
    existed first.
15. **Declarative document routing, so unanswerable questions cost zero tokens.**
    Gaps are computed before spending, not discovered after.
16. **No embeddings.** At 80 documents, declarative routing wins and a vector
    store would be resume-padding. Named in Limitations as a choice.
17. **The Approach section is inference, and says so.** The only section not
    claim-backed, marked in the UI and in the export.
18. **A rejected pane in the UI, not just tests.** An empty rejected pane is itself
    information and is rendered, never hidden.
19. **Committed brief fixtures with an `inputs_hash` that fails the build.** Keyless
    visitors get the full demo; a stale fixture is loud, not silent.
20. **`temperature: 0`, versioned prompts.** Reproducibility of the hash and the
    eval scoreboard is worth more than variety.
21. **Paste-documents, not live URL fetch.** SSRF. The adapter exists unwired with
    the reason written down; live sourcing is Days 061–065.
22. **`buildBrief` is the only exported engine function,** and `lib/brief/` imports
    nothing non-relative. Day 007 imports that one call.
23. **No client-side engine.** Server components throughout; Day 005's
    client-side deviation existed for a scrubber that does not exist here.
24. **Ten pushed commits, `akshatiwarix/account-brief`, MIT, Vercel, full docs
    set** — README, plain-English guide, four screenshots, citation GIF.
    Consistency across six repos is itself part of the portfolio.
