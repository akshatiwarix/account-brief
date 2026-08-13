import type { CorpusEntry } from "../schema";

/**
 * `c02` — the conflict trap.
 *
 * The careers page (2026-04-02) says 200 people. The funding announcement (2026-06-15) says 340.
 * Both are `scale` claims in the unit `people`, 70% apart, so `conflict.ts` must render both with
 * both dates and pick neither. The older side is also 121 days old against a 120-day freshness
 * budget, so it renders with an `As of April 2026` prefix — conflict and staleness in one row.
 *
 * A model asked to summarize this company will pick 340 and never mention 200. That is the failure
 * this company exists to make visible.
 */
export const c02: CorpusEntry = {
  company: {
    id: "c02",
    name: "Cadence Freight",
    domain: "cadencefreight.example",
    industry: "Freight logistics software",
  },
  documents: [
    {
      id: "c02-d01",
      company_id: "c02",
      kind: "homepage",
      title: "Cadence Freight — every load, one timeline",
      url: "https://cadencefreight.example/",
      published_at: "2026-05-11",
      retrieved_at: "2026-07-28",
      text: `# Every load, one timeline

Cadence Freight gives shippers a single live timeline for every load — tender, pickup, dwell, delivery and invoice — across all of their carriers.

We sell to logistics teams at mid-market shippers who move between 500 and 20,000 loads a year and are running that operation on a carrier portal, a spreadsheet and a phone.

Cadence is the most complete visibility layer available to a shipper today.`,
    },
    {
      id: "c02-d02",
      company_id: "c02",
      kind: "pricing",
      title: "Pricing — Cadence Freight",
      url: "https://cadencefreight.example/pricing",
      published_at: "2026-05-11",
      retrieved_at: "2026-07-28",
      text: `# Pricing

Cadence is priced on load volume, not seats, because a logistics team should not have to ration logins.

## Lane — $0.90 per load
Live tracking, exception alerts, and carrier scorecards. Minimum 500 loads per year.

## Network — $0.65 per load
Everything in Lane, plus invoice audit and API access. Minimum 5,000 loads per year.

## Enterprise
Above 25,000 loads a year, pricing is negotiated per contract. Talk to sales.`,
    },
    {
      id: "c02-d03",
      company_id: "c02",
      kind: "careers",
      title: "Careers — Cadence Freight",
      url: "https://cadencefreight.example/careers",
      published_at: "2026-04-02",
      retrieved_at: "2026-07-28",
      text: `# Join Cadence Freight

We are a team of 200 people across Memphis, Rotterdam and Singapore, and we are hiring across engineering, implementation and revenue.

## How we sell
Our motion is sales-assisted: shippers start with a paid pilot on a single lane, and an implementation manager runs the first 90 days. We are hiring two solutions engineers to support that pilot process.

## What it is like here
Logistics is unglamorous and specific. The people who do well here have opinions about dwell time.`,
    },
    {
      id: "c02-d04",
      company_id: "c02",
      kind: "press_release",
      title: "Cadence Freight raises $54M Series C",
      url: "https://cadencefreight.example/press/series-c",
      published_at: "2026-06-15",
      retrieved_at: "2026-07-28",
      text: `# Cadence Freight raises $54M Series C

MEMPHIS — Cadence Freight has raised $54M in Series C funding led by Halyard Growth.

The company now employs 340 employees and tracked 11 million loads in the last twelve months. Cadence will use the funding to expand its European operations and to build out invoice audit into a standalone product line.

"We have spent four years earning the right to sit between shippers and carriers," said founder and CEO Marisol Vance. "This round is about the invoice, which is where the disputes actually live."`,
    },
    {
      id: "c02-d05",
      company_id: "c02",
      kind: "changelog",
      title: "Cadence Freight product updates — Q2 2026",
      url: "https://cadencefreight.example/changelog/q2-2026",
      published_at: "2026-06-30",
      retrieved_at: "2026-07-28",
      text: `# Product updates — Q2 2026

## Invoice audit (beta)
Cadence now reconciles carrier invoices against the tendered rate and flags accessorial charges that were never authorized. Shipped to 40 beta accounts in June.

## Dwell alerts
Configurable dwell thresholds per facility, with escalation to a named contact.

## Carrier scorecard export
Scorecards can now be exported as CSV for quarterly business reviews.`,
    },
    {
      id: "c02-d06",
      company_id: "c02",
      kind: "news",
      title: "Freight visibility consolidates as Cadence raises again",
      url: "https://laneledger.example/cadence-series-c",
      published_at: "2026-06-16",
      retrieved_at: "2026-07-28",
      text: `# Freight visibility consolidates as Cadence raises again

Cadence Freight's $54M Series C lands in a market that has spent two years shrinking. Three competitors have been acquired since 2024, and shippers we spoke to describe visibility as table stakes rather than a product.

That is the strategic problem the round is meant to solve. Moving into invoice audit puts Cadence into a category with a measurable return — disputed accessorials are real money — and out of one where the answer to "why pay for this" is getting harder to give.`,
    },
    {
      id: "c02-d07",
      company_id: "c02",
      kind: "review_site",
      title: "Cadence Freight reviews — logistics teams weigh in",
      url: "https://stackverdict.example/cadence-freight",
      published_at: "2026-03-22",
      retrieved_at: "2026-07-28",
      text: `# Cadence Freight reviews

**4.0 / 5 from 61 verified reviews**

Reviewers consistently praise carrier onboarding: several describe getting a regional carrier live in under a week, which is fast for this category.

The complaints cluster in two places. Alert fatigue is the first — one logistics manager describes receiving 300 dwell alerts in a single week before learning how to tune thresholds, and calls the defaults "unusable out of the box".

The second is reporting. Multiple reviewers say the scorecard cannot be sliced by facility, which is the cut most shippers actually want, and that getting a custom view requires a support ticket and a wait.`,
    },
  ],
};
