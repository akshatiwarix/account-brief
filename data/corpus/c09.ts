import type { CorpusEntry } from "../schema";

/**
 * `c09` — two documents, and most of the brief is missing.
 *
 * A homepage and a job post can answer what they sell, who they sell to, how they go to market, and
 * something about direction and hiring. They cannot answer scale, pricing shape, recent changes,
 * what shipped, stated priorities, or what anyone outside the company thinks — six of the eleven
 * extractable questions are `unroutable`, and the coverage meter says so before a token is spent.
 *
 * This is the company that proves the tool is willing to return almost nothing. Every summarizer
 * given these two documents produces a full page — that page is invention, and it is confident,
 * and a rep cannot tell it apart from the `c01` brief.
 */
export const c09: CorpusEntry = {
  company: {
    id: "c09",
    name: "Quillhaus",
    domain: "quillhaus.example",
    industry: "Contract drafting",
  },
  documents: [
    {
      id: "c09-d01",
      company_id: "c09",
      kind: "homepage",
      title: "Quillhaus — draft from your own precedent",
      url: "https://quillhaus.example/",
      published_at: "2026-07-12",
      retrieved_at: "2026-07-28",
      text: `# Draft from your own precedent

Quillhaus drafts contracts from the clauses your legal team has already negotiated, not from a generic template library. It indexes your executed agreements, finds the closest precedent, and produces a first draft with the fallback positions your team has actually accepted before.

## Who it is for
In-house legal teams of two to twenty lawyers, at companies where sales is waiting on redlines.

Quillhaus is designed to be adopted by the lawyer, not mandated by the general counsel — the first draft is a suggestion and every clause shows the executed agreement it came from.`,
    },
    {
      id: "c09-d02",
      company_id: "c09",
      kind: "job_post",
      title: "Founding Account Executive — Quillhaus",
      url: "https://quillhaus.example/careers/founding-ae",
      published_at: "2026-07-20",
      retrieved_at: "2026-07-28",
      text: `# Founding Account Executive

Remote (US) · Revenue · Full-time

You will be our first commercial hire. Today the founders run every deal; you will take that over and build the motion from a standing start.

## What you will do
Own the full cycle into in-house legal teams, from outbound through security review to signature. Expect to sell to a general counsel who has been pitched legal AI a dozen times this year and is tired of it.

## What we look for
Experience selling into legal, and comfort being the only salesperson in the building. This is a founder-led motion becoming a sales-led one, and you will feel every part of that transition.`,
    },
  ],
};
