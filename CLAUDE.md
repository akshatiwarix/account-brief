# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

**Planned, not yet built.** Only `PLAN.md`, `LICENSE` and `.gitignore` exist. The ten-commit task
order in `PLAN.md` is the build sequence; follow it rather than inventing one.

`PLAN.md` is the source of truth for scope, the data model, the 12 questions, the gate's matching
rules, attribution templates, conflict and staleness policy, the corpus trap table, sweep
invariants and the definition of done. **Read it before writing code.** It records 24 settled
decisions from a four-round design interview — treat them as decided, not as open questions to
relitigate.

This is Day 006 of a 100-day build challenge. The master backlog lives outside this repo (on the
user's Desktop) and must never be committed here. Each day is its own standalone repo.

## The thesis, in one paragraph

The brief is the output; **the gate is the product**. Every model-extracted claim carries a
mandatory verbatim `quote`. Deterministic code — never the model — resolves that quote to a
character span in the source document; a claim whose quote does not resolve is dead before it can
be cited. Composed sentences must cite at least one surviving claim. The model's output is an
*input* to a pure engine that cannot call a model, so no code path exists from claim to rendered
sentence that skips resolution. When changing anything in `lib/brief/`, the question to ask is
whether the change opens such a path.

## Commands

Land these in `package.json` at scaffold time; they mirror Days 001–005 so a reviewer types the
same thing in every repo.

```bash
npm run dev                      # dev server
npm run build                    # production build — run before claiming done
npm test                         # vitest run (globs lib/**/*.test.ts only)
npm run test:watch               # watch mode
npm run sweep                    # invariant sweep, every company × every question, no network
npm run eval                     # live re-extraction against trap companies — needs a key
npm run generate:briefs          # the only writer of data/briefs/*.json
npm run typecheck                # next typegen && tsc --noEmit
npm run lint                     # eslint
npx vitest run lib/brief/resolve.test.ts             # single file
npx vitest run -t "quote that does not resolve"      # single test by name
```

`npm` is the committed package manager — README and lockfile stay npm even if bun is used
locally, because `npm install && npm run dev` is what a reviewer types without reading.

Three setup facts inherited from Days 001–005:

- Vitest config belongs in `vitest.config.mts` (`.mts`, not `.ts` — the extension is what stops
  Vite's config loader warning about ESM-in-CJS), and it globs `lib/**/*.test.ts` only. Tests
  outside `lib/` will not run.
- `tsc` alone fails on a clean checkout because `LayoutProps` and friends are generated into
  `.next/types`, so `typecheck` must run `next typegen` first. Never "fix" that error by editing
  `app/layout.tsx`.
- `tsconfig.json` sets `noUncheckedIndexedAccess` on top of `strict` — array and record access
  yields `T | undefined`. Handle it; do not reach for `!`.

Scripts run through `vite-node -c vitest.config.mts` rather than bare `node`, because the engine
uses extensionless relative imports that Node's ESM resolver rejects and the `@/` alias lives in
the Vitest config.

## Architecture

```
                    ┌─ read cached brief ─► data/briefs/<id>.json (Zod + hash at import)
Browser ────────────┤   (server components, nothing recomputes client-side)
                    └─ POST /api/brief ─► Zod ─► key check ─► rate limit
                                            ├─ lib/research  extract → retry once → compose
                                            └─ lib/brief     buildBrief() — the gate, pure
```

`lib/brief/` is the engine: `types.ts`, `questions.ts`, `normalize.ts`, `chunk.ts`, `resolve.ts`,
`conflict.ts`, `stale.ts`, `compose.ts`, `coverage.ts`, `render.ts`, `index.ts`. Around it sit
`lib/research/` (Gemini calls, versioned prompts, response schemas, retry, cost accounting, hash,
rate limiter, paste validation), `data/`, `app/api/brief`, `app/`.

**`lib/brief/` imports nothing non-relative** — not `next`, not `react`, not `zod`, not
`@google/genai`, not `@/data`. `purity.test.ts` enforces it by scanning for bare import
specifiers, with no allowlist. If a change to the engine needs a package, move the code to
`lib/research/` or the route handler instead of widening the rule. This is not stylistic: it is
what makes the gate unbypassable, since a module that cannot import a model client cannot
generate a claim.

**`buildBrief({ company, documents, claims, asOf })` is the only exported engine function.**
Day 007 `why-now` consumes that one call, the same way Day 005 exposed `buildBoard`. Route
handlers and components must not reach into `resolve.ts` or `compose.ts` directly.

**No client-side engine.** Day 005 shipped its engine to the browser because a date scrubber makes
a request-per-frame a stutter-per-frame. There is no scrubber here — briefs are committed fixtures
— so pages are server components and nothing recomputes in the browser. Do not port Day 005's
client-side pattern over.

**`data/briefs/*.json` are fixtures with an `inputs_hash`** over document texts, the question set
and routing table, `PROMPT_VERSION`, the model ID and the schema version. `data/briefs.ts`
recomputes it at import time and fails the build on mismatch. So editing corpus text or a prompt
without regenerating is a build failure, by design. `scripts/generate-briefs.mts` is the only
writer.

## Rules that are easy to break by accident

- **Never add fuzzy quote matching.** Normalized exact matching only. A similarity threshold is
  the exact knob that lets a paraphrase pass as a quote. If the rejection rate looks bad, tighten
  the extraction prompt or use the one retry — never loosen the matcher.
- **Normalization must stay reversible.** `normalize.ts` emits a `sourceIndex[]` map so spans
  resolve back into the untouched document. Any new folding rule must maintain that map, or
  citation highlighting silently drifts.
- **Compose never sees document text**, only surviving claims. Passing documents into the compose
  call would let it cite what the gate already killed.
- **A `company`-stance claim must never render with a bare assertive verb.** The engine repairs
  the sentence (prefixes attribution, sets `repaired: true`) rather than dropping it; the sweep
  asserts the invariant. Keep both halves.
- **Conflicts are never auto-resolved.** Both sides render with both dates. Recency is displayed,
  not applied.
- **Rejections always carry a non-empty `detail`.** The rejected pane is a shipped feature, not
  debug output.
- **No live URL fetching.** `lib/research/fetch-adapter.ts` is deliberately unexported and
  unwired; a public fetch-any-URL endpoint is SSRF. Paste-documents is the live path.

## Gemini conventions (inherited from Days 001–005)

`@google/genai`, model `gemini-3.6-flash`, `responseMimeType: "application/json"` with a native
`responseSchema`, then Zod as the trust boundary — a schema is a request, a validator is a
guarantee. `ThinkingLevel.MINIMAL` on both calls: this is constrained extraction against a fixed
schema, not reasoning, and the free tier's per-minute quota is what limits the live demo.
`temperature: 0`, for reproducibility of `inputs_hash` and the eval scoreboard, not for quality.

Missing key → **501** with a message pointing at the cached briefs. Model failure → **502**. The
app must render all ten briefs, all rejected panes and both exports with `GEMINI_API_KEY` unset.

## Next.js 16

**Next.js 16 differs from training data.** `AGENTS.md` (regenerated by `next dev`) points at
`node_modules/next/dist/docs/`. Read the relevant guide there before writing route handlers or
server components rather than reaching for remembered Next 13/14 patterns.
