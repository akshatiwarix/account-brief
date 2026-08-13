import type { CorpusEntry } from "../schema";

/**
 * `c07` — numbers that live outside prose.
 *
 * The seat limit is in a table caption. The headcount is in a table row. The billing model is in a
 * footnote. None of it is in a sentence, which matters because a quote lifted from a table is where
 * models paraphrase most: they re-flow the pipes, collapse the padding, or quote the caption with
 * the row's number substituted in.
 *
 * That makes `c07` the company that exercises `normalize.ts` hardest — whitespace collapsing is the
 * difference between a legitimate table quote resolving and being rejected — and the one where a
 * fuzzy matcher would look most tempting and do the most damage.
 */
export const c07: CorpusEntry = {
  company: {
    id: "c07",
    name: "Meterwise",
    domain: "meterwise.example",
    industry: "Usage metering and billing",
  },
  documents: [
    {
      id: "c07-d01",
      company_id: "c07",
      kind: "homepage",
      title: "Meterwise — meter it before you bill it",
      url: "https://meterwise.example/",
      published_at: "2026-06-30",
      retrieved_at: "2026-07-28",
      text: `# Meter it before you bill it

Meterwise ingests usage events, aggregates them into billable quantities, and hands your billing system a number it can invoice — with the raw events still queryable behind it.

We sell to engineering and finance teams at usage-priced software companies, typically post-Series A, who have discovered that "we will just count the API calls" is a six-month project.`,
    },
    {
      id: "c07-d02",
      company_id: "c07",
      kind: "pricing",
      title: "Pricing — Meterwise",
      url: "https://meterwise.example/pricing",
      published_at: "2026-06-30",
      retrieved_at: "2026-07-28",
      text: `# Pricing

| Plan | Monthly | Events included | Seats |
| --- | --- | --- | --- |
| Build | $0 | 500,000 | 3 |
| Growth | $900 | 2,000,000 | 25 |
| Scale | $2,600 | 10,000,000 | Unlimited |

*Table 1 — plan limits effective 1 June 2026. Growth includes 25 seats and 2,000,000 events per month; overage is billed at $0.35 per 1,000 events.*

Annual contracts receive two months free. Enterprise agreements above 50,000,000 events per month are priced per contract.

† Overage is calculated on aggregated billable quantities, not on raw ingested events, so a retry does not cost you twice.`,
    },
    {
      id: "c07-d03",
      company_id: "c07",
      kind: "filing_excerpt",
      title: "Meterwise Inc. — selected operating data",
      url: "https://meterwise.example/investors/selected-data",
      published_at: "2026-06-10",
      retrieved_at: "2026-07-28",
      text: `## Selected operating data

| Metric | 30 Jun 2025 | 30 Jun 2026 |
| --- | --- | --- |
| Employees | 71 | 118 |
| Customers | 240 | 402 |
| Events processed (billions) | 14.2 | 51.9 |
| Annual recurring revenue ($m) | 8.1 | 19.4 |

Headcount growth was concentrated in engineering and customer engineering. We employed 118 people as of 30 June 2026, of whom 44 were engaged in research and development.`,
    },
    {
      id: "c07-d04",
      company_id: "c07",
      kind: "changelog",
      title: "Meterwise changelog — July 2026",
      url: "https://meterwise.example/changelog/2026-07",
      published_at: "2026-07-24",
      retrieved_at: "2026-07-28",
      text: `# Changelog — July 2026

## 2026-07-21 — Backfill without double counting
Late-arriving events can now be backfilled into a closed period, and Meterwise reissues the aggregate rather than adding to it.

## 2026-07-15 — Stripe usage records
Aggregated quantities can be pushed directly to Stripe as usage records, on a schedule.

## 2026-07-03 — Query API for raw events
Raw events are now queryable for 90 days on Growth and 400 days on Scale.`,
    },
    {
      id: "c07-d05",
      company_id: "c07",
      kind: "blog",
      title: "Idempotency is a billing feature",
      url: "https://meterwise.example/blog/idempotency",
      published_at: "2026-05-08",
      retrieved_at: "2026-07-28",
      text: `# Idempotency is a billing feature

Our priority for this year is correctness under retry, which sounds like an engineering concern and is in fact the entire product.

A metering system that double counts is worse than no metering system, because the invoice goes out anyway and now your customer is the one who finds the bug. We have spent two quarters on deduplication keys, watermarks and late-arrival handling, and we will spend two more.

The uncomfortable version of this priority: we would rather delay an invoice than send a wrong one, and we have built the product to make that the default.`,
    },
    {
      id: "c07-d06",
      company_id: "c07",
      kind: "press_release",
      title: "Meterwise raises $22M Series B led by Kestrel",
      url: "https://meterwise.example/press/series-b",
      published_at: "2026-06-24",
      retrieved_at: "2026-07-28",
      text: `# Meterwise raises $22M Series B

SAN FRANCISCO — Meterwise has raised $22M in Series B funding led by Kestrel Ventures.

The company will use the round to build out enterprise agreements above 50 million events per month and to hire into customer engineering. Meterwise also announced that Idris Bello has joined as VP Engineering from a payments infrastructure company.

Meterwise processed 51.9 billion events in the twelve months to June 2026.`,
    },
    {
      id: "c07-d07",
      company_id: "c07",
      kind: "review_site",
      title: "Meterwise reviews — engineering and finance",
      url: "https://stackverdict.example/meterwise",
      published_at: "2026-04-05",
      retrieved_at: "2026-07-28",
      text: `# Meterwise reviews

**4.4 / 5 from 58 verified reviews**

Reviewers praise the raw-event queryability: several describe it as the thing that let finance and engineering stop arguing, because both sides can see the same events.

The complaints are consistent. Setup is the first — reviewers describe the initial event schema design as the hardest part and say the documentation assumes you already know what a billable quantity is. Two reviewers report spending more than three weeks on it.

The second is the dashboard, which several reviewers say cannot show a single customer's usage trend over more than 90 days without dropping to the API.`,
    },
  ],
};
