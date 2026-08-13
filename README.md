# Account Brief

Turns a company's documents into a sales brief where every sentence resolves to a character span in a source document — or does not render at all.

[Live Demo](#) · Screenshots and GIF: pending, see [Current state](#current-state)

> The corpus in this repo is **authored and synthetic**. Every domain ends in `.example`, no real company is quoted, and the ten companies exist to carry ten specific traps. To see the pipeline run on real text, paste your own pages — see [Usage](#usage).

Day 006 of a 100-day building challenge.

## Why I Built This

"Paste a domain, get a company summary" is the most slop-adjacent project on my backlog. The default build is three lines — fetch a page, hand it to a model, render the markdown — and it produces a document that reads well and cannot be trusted. That is the worst possible artifact for the job: a rep who believes a fabricated headcount walks into a call and burns the account.

Four failures live inside that default build, and this repo exists because of them.

**Citations are decorative.** Tools footnote a sentence with a URL and call it grounded. Nobody checks that the sentence is actually *in* the document, because checking means aligning generated text against source text.

**Marketing copy gets laundered into intelligence.** Most text about a company is written by that company. A brief that says "they are the leading platform for mid-market compliance" because the homepage says so has retyped an ad on a research tool's letterhead.

**Sources disagree and the tool picks silently.** The careers page says 200 people, the funding announcement says 340. Models resolve that by writing whichever they saw last, with total confidence. The disagreement was the finding.

**Absence is invisible.** Ask twelve questions about a company whose sources answer four and you get twelve answers. The padding is the content most likely to be false.

So the brief is the output. **The gate is the product.**

## What It Does

1. Routes 12 fixed research questions against the documents on hand. A question with no answering document kind is rejected as `unroutable` **before any model call** — gaps are computed, not discovered.
2. Extracts claims in one constrained call per company. Every claim must carry a **verbatim quote** and name the document it came from and the company it is about.
3. **Resolves each quote to a character span** in that document, with reversible normalization and no fuzzy matching. A claim whose quote does not resolve is dead. A claim about another company is dead even if its quote is perfect.
4. Retries once, echoing back the exact quotes that were not found.
5. Composes sentences from **surviving claims only** — the compose call never sees document text, so it cannot cite what the gate killed.
6. Repairs attribution: a sentence resting only on the company's self-description cannot render as a bare fact.
7. Reports conflicts and refuses to resolve them; ages sources past a per-question freshness budget; drops what is too old to stand behind.
8. Shows what it threw away, with reasons and counts.

## Demo

Click a citation in the brief and the source pane opens that document scrolled to the exact characters the sentence rests on. The highlight is `text.slice(start, end)` computed on the server from the same span the gate produced — not a client-side search.

Screenshots and the citation GIF land with the generated briefs; see [Current state](#current-state).

## How It Works

```
                    ┌─ read cached brief ─► data/briefs/<id>.json (Zod + hash at import)
Browser ────────────┤   (server components, nothing recomputes client-side)
                    └─ POST /api/brief ─► Zod ─► key check ─► rate limit
                                            ├─ lib/research  extract → retry once → compose
                                            └─ lib/brief     buildBrief() — the gate, pure
```

The load-bearing structural decision: **`lib/brief/` imports nothing non-relative** — not `next`, not `react`, not `zod`, not `@google/genai`. A test scans for bare import specifiers with no allowlist.

That is not stylistic. A module that cannot import a model client cannot generate a claim, so every claim enters the engine as a function argument that has already been through `resolve.ts`. There is no code path from model output to rendered sentence that skips the gate, and `buildBrief` is the only function that assembles a brief.

### The gate

`normalize.ts` folds both sides of the comparison — curly quotes, every dash variant, ellipses, twenty space variants, zero-width characters, case, whitespace runs — and keeps a map back: `sourceIndex[i]` is the original index of folded character `i`. So a match found in folded coordinates resolves to a span in the untouched document, which is what makes the highlight real.

Then `indexOf`. **No fuzzy matching and no similarity threshold.** A threshold is exactly the knob that lets a paraphrase pass as a quote, which is the failure the project exists to prevent. If a true claim is rejected, the fix is a stricter prompt or the one retry — never a looser matcher.

Composition is handled at the boundary: documents are stored NFC, so the engine only folds single code points and the offset map stays honest.

### Why the subject check comes first

`c06`'s careers page talks at length about a competitor's product. A quote lifted from it resolves perfectly — the text really is in the document — and is still a claim about the wrong company. Span verification cannot catch that, so the extraction schema forces the model to name each claim's subject and the engine decides whether that name is the company being briefed. **Every grounding pipeline that verifies quotes but not subjects has this hole.**

## Architecture

```
lib/brief/               ← pure. no non-relative imports, at all.
  types.ts               Document, Claim, Sentence, Brief, Conflict, Rejection
  questions.ts           the 12 questions, routing table, freshness budgets
  normalize.ts           reversible folding + offset map — read this file first
  chunk.ts               heading split, verbatim slices, truncation boundary
  resolve.ts             quote → span, or null. the gate's teeth
  conflict.ts            unit folding, tolerance, symmetric conflict sets
  stale.ts               freshness budgets, `as of`, hard drop at 3×
  compose.ts             attribution templates, repair, citation binding
  coverage.ts            answerable-before-spending, rendered-after
  render.ts              brief → markdown with numbered footnotes
  index.ts               buildBrief() — the only exported engine function
lib/research/            impure: Gemini calls, versioned prompts, schemas, retry,
                         cost accounting, hash, rate limiter, the unwired fetch adapter
data/                    corpus (10 companies, 68 documents), committed brief fixtures
app/                     server components + api/brief + api/export
scripts/                 generate-briefs.mts, sweep.mts
```

## Key Decisions & Tradeoffs

- **Decision:** The deliverable is a verifier, not a writer.
  **Why:** A brief nobody can check is worse than no brief.
  **Tradeoff:** True claims get rejected when the model paraphrases its own quote. The rejection rate ships as a number rather than being hidden behind a threshold.

- **Decision:** Authored synthetic corpus, `.example` domains.
  **Why:** The ten traps have to be engineered — no real corpus happens to contain a careers page naming a competitor, a customer count that disagrees with an investor update, and an eighteen-month-old pricing page at once. Also no copyright surface, and it cannot rot.
  **Tradeoff:** A reader cannot click a citation through to a live page. Paste-documents is the answer.

- **Decision:** Attribution is repaired, not rejected.
  **Why:** A company-stated claim is true — the company really does say it. What was wrong was the verb.
  **Tradeoff:** The templates read stiffly. A stiff sentence that cannot be mistaken for a fact beats a fluent one that can.

- **Decision:** Conflicts are never resolved.
  **Why:** Recency and third-party-preference are both heuristics that destroy the finding.
  **Tradeoff:** The reader has to do something with two numbers. That is the correct amount of work to push back onto them.

- **Decision:** Paste-documents instead of live URL fetching.
  **Why:** A public endpoint that fetches an arbitrary user-supplied URL server-side is SSRF — scheme allowlisting, DNS resolution with private-CIDR rejection, redirect re-validation, and DNS rebinding still live between check and connect. That is a day's careful work by itself and shipping it half-done on a public repo is worse than not shipping it.
  **Tradeoff:** A human does the fetching. `lib/research/fetch-adapter.ts` keeps the seam and the reasoning; live sourcing is Days 061–065.

- **Decision:** One extract call per company, not per (document, section).
  **Why:** Not preference — the free tier for `gemini-3.6-flash` allows **20 requests per day**, which makes the 137-call original shape unrunnable and made a five-document paste cost fifteen calls.
  **Tradeoff:** Weaker per-document isolation. Bought back by making the model name each quote's document: a misattributed quote fails to resolve and appears in the rejected pane.

- **Decision:** No embeddings.
  **Why:** At 68 documents, a declarative routing table wins and a vector store would be resume-padding.
  **Tradeoff:** Routing is by document kind, not by content. A pricing detail buried in a blog post is not found.

## Getting Started

### Prerequisites

Node 20+. A `GEMINI_API_KEY` is **optional** — the cached briefs, their rejected panes and both exports all work without one.

### Installation

```bash
npm install
```

### Configuration

```bash
cp .env.example .env.local   # then add GEMINI_API_KEY if you want to generate or paste
```

### Run Locally

```bash
npm run dev
```

## Usage

```bash
npm run dev                        # the reader
npm test                           # 335 tests
npm run sweep                      # invariant sweep over every committed brief
npm run generate:briefs            # regenerate all fixtures (2 calls per company)
npm run generate:briefs -- c02     # regenerate one
npm run typecheck && npm run lint
```

**Run it on real text:** the paste panel at the bottom of the page takes up to 12 documents. Two model calls, and every sentence you get back was checked character-for-character against the text you supplied. Rate limited to 5 generations per 10 minutes per IP.

```bash
curl -X POST localhost:3000/api/brief -H 'content-type: application/json' -d '{
  "company": { "name": "Realco", "domain": "realco.com", "industry": "Widgets" },
  "documents": [{ "kind": "homepage", "title": "Home", "text": "…page text…" }]
}'
```

## Validation / Testing

335 tests, plus `npm run sweep` over every committed brief. The assertions that matter:

- **Every rendered sentence cites at least one surviving claim.** If this can fail, the project has no thesis.
- Every folded position in all 68 documents round-trips back into itself — the property that stops citations from silently highlighting the wrong characters.
- Every stored span **re-resolves from the document**, rather than being read back from the fixture.
- Every chunk is a verbatim slice that concatenates back into its document.
- No `company`-stance sentence renders without an attribution marker.
- No `forward_looking` claim reaches the Change section.
- Conflicts re-derive from the surviving claims, and every side still renders.
- A one-word paraphrase is pinned as a **rejection**, so nobody can "fix" the matcher into a similarity score.
- `inputs_hash` matches for every fixture, checked at import — editing a corpus document or a prompt without regenerating fails the build.

Three bugs the tests and the sweep caught during the build, kept here because they are the interesting part:

1. The extract prompt was joining chunks with a newline and labelling each with its heading — inserting text into the body that the gate would never see, so a quote spanning a boundary could contain characters existing nowhere in the document. A prompt-caused rejection.
2. The export spread `sentence` over an explicit `question_id`, which would have silently won.
3. `data/briefs.ts` refused a fixture whose prompt version had moved. Working as designed, on the first real fixture generated.

## Current state

**Feature-complete, fixtures pending.** The engine, the gate, the routes, both exports and the reader are all built, tested and pushed. What is missing is the ten committed briefs.

Generating them costs 20 model calls (2 per company), and the free tier for `gemini-3.6-flash` allows **20 requests per day** — which the day's earlier work had already spent. So:

- ✅ works now: `npm test`, `npm run sweep`, `npm run build`, the reader with its honest "no cached brief yet" state, paste-documents with a key, both exports for any company that has a brief.
- ⏳ pending: `data/briefs/*.json` for all ten companies, the four screenshots, the citation GIF, and the deployed URL. The sweep names every company it could not check rather than passing quietly.

The gate rejection rate quoted in a portfolio needs to come from a run, so this README will carry the measured number rather than an estimate once the fixtures exist.

## Limitations

- **No live URL fetching**, and the reason is SSRF (above), not effort.
- **Rate limiting is in-memory**, so on Vercel the real limit is `5 × instances`. Fixing it properly means Redis.
- **Attribution templates are blunt.** "The company states that…" reads stiffly against some sentences. Deliberate.
- **No embeddings**; routing is by document kind.
- **One model, `temperature: 0`, not benchmarked across models.** The rejection rate is a property of this model on this corpus.
- **The Approach section is inference, not citation.** It is marked as such in the UI and in the export.
- **Conflict detection is numeric.** Two sources disagreeing in prose are rendered next to each other and left unmerged, because the engine has no basis for merging them.
- **The corpus is synthetic**, so the citations in the demo point at authored text.
- **A generated brief costs two calls**, and the free tier allows twenty a day.

## What I'd Build Next

- **Entailment checking on top of span matching** — the quote exists, but does it actually support the assertion? That is the next real gate and it needs an eval suite (Day 042).
- Cross-document coreference, so conflicts can be detected on entities rather than question ids.
- Live adapters behind the same `SourceDocument` interface, with a real SSRF defense (Days 061–065).
- Multi-model rejection-rate comparison as its own product.
- A reviewer workflow: reject a claim by hand and regenerate the brief around it.

## License

MIT — see [LICENSE](LICENSE).
