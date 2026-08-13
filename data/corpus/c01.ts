import type { CorpusEntry } from "../schema";

/**
 * `c01` — the happy path. Rich, clean, and the only company where all 12 questions land.
 *
 * It exists so the other nine traps are read as traps rather than as the tool being broken: if
 * every brief in the corpus were thin, a reviewer could not tell a working gate from a useless one.
 */
export const c01: CorpusEntry = {
  company: {
    id: "c01",
    name: "Ledgerloop",
    domain: "ledgerloop.example",
    industry: "Accounting automation",
  },
  documents: [
    {
      id: "c01-d01",
      company_id: "c01",
      kind: "homepage",
      title: "Ledgerloop — close the books without the spreadsheet week",
      url: "https://ledgerloop.example/",
      published_at: "2026-06-01",
      retrieved_at: "2026-07-28",
      text: `# Close the books without the spreadsheet week

Ledgerloop reconciles bank feeds, invoices and your general ledger in a single pass, then hands your controller a signed audit trail instead of a folder of exports.

## Built for the team that owns the close

Ledgerloop is built for controllers and accounting managers at companies between 200 and 2,000 employees — large enough that the month-end close spans three systems, small enough that nobody has built an internal tool for it.

We are the reconciliation layer for the modern finance stack, and the fastest way to a clean close in the industry.

## How it works

Connect your bank, your billing system and your ledger. Ledgerloop matches transactions on amount, date and counterparty, escalates only what it cannot match, and writes journal entries back to the ledger with a reference to the evidence it used.`,
    },
    {
      id: "c01-d02",
      company_id: "c01",
      kind: "pricing",
      title: "Pricing — Ledgerloop",
      url: "https://ledgerloop.example/pricing",
      published_at: "2026-07-01",
      retrieved_at: "2026-07-28",
      text: `# Pricing

## Starter — $49 per user, per month
Up to two ledger connections. Email support. Billed annually.

## Growth — $149 per user, per month
Unlimited connections, approval workflows, and the audit trail export. Most teams start here.

## Enterprise — contact sales
Volume pricing, SSO, custom retention, and a named implementation lead. Enterprise plans are quoted per contract and require a call with our sales team; there is no self-serve option at this tier.

All plans are priced per seat. There is no usage component, because a finance team that closes faster should not pay more for it.`,
    },
    {
      id: "c01-d03",
      company_id: "c01",
      kind: "careers",
      title: "Careers at Ledgerloop",
      url: "https://ledgerloop.example/careers",
      published_at: "2026-07-01",
      retrieved_at: "2026-07-28",
      text: `# Work at Ledgerloop

We are a sales-led company. Every deal above the Starter tier involves an account executive, and our SDR team books the first call — we do not expect finance leaders to evaluate reconciliation software on a credit card.

## Open teams

Revenue is our largest hiring area this half: three account executives, two SDRs and a revenue operations lead. Engineering is hiring two backend engineers for the matching engine.

We work from Chicago and Lisbon, with roughly a third of the company remote.`,
    },
    {
      id: "c01-d04",
      company_id: "c01",
      kind: "blog",
      title: "Why we are spending 2026 on close time, not features",
      url: "https://ledgerloop.example/blog/close-time-2026",
      published_at: "2026-05-30",
      retrieved_at: "2026-07-28",
      text: `# Why we are spending 2026 on close time, not features

Our priority this year is a single number: days to close. Everything else on the roadmap is downstream of it.

We surveyed 140 controllers on Ledgerloop in March. The median close took 8.5 days, and 60% of that time was spent on exceptions — transactions the system could not match and a human had to chase.

So we are not shipping a dashboard this year. We are shipping fewer exceptions. The team has been asked to treat any feature that does not reduce exception volume as a distraction, which is an uncomfortable rule to work under and the right one.`,
    },
    {
      id: "c01-d05",
      company_id: "c01",
      kind: "press_release",
      title: "Ledgerloop raises $28M Series B and appoints Dana Osei as VP Revenue",
      url: "https://ledgerloop.example/press/series-b",
      published_at: "2026-06-12",
      retrieved_at: "2026-07-28",
      text: `# Ledgerloop raises $28M Series B

CHICAGO — Ledgerloop today announced a $28M Series B led by Fernhill Partners, with participation from existing investors. The round brings total funding to $46M.

The company also announced that Dana Osei has been appointed VP Revenue. Osei joins from a mid-market billing platform where she built the enterprise sales function.

"The next two quarters are about moving upmarket," said Osei. "We are taking Ledgerloop from the mid-market into enterprise finance teams, and that means a different motion, a different security review, and a different kind of contract."

Ledgerloop will use the round to expand its implementation team and to open a New York office.`,
    },
    {
      id: "c01-d06",
      company_id: "c01",
      kind: "filing_excerpt",
      title: "Ledgerloop Inc. — annual disclosure excerpt (employees and customers)",
      url: "https://ledgerloop.example/investors/disclosure-2026",
      published_at: "2026-05-05",
      retrieved_at: "2026-07-28",
      text: `## Item 1. Business — Employees

As of 31 March 2026 we employed 412 people, of whom 118 were engaged in research and development and 96 in sales and marketing. We had 1,340 paying customers at the same date.

## Item 1A. Risk Factors — Concentration

Our ten largest customers accounted for 21% of revenue in the period. A loss of one or more of these customers, or a failure to renew at comparable contract value, could materially affect our results.`,
    },
    {
      id: "c01-d07",
      company_id: "c01",
      kind: "news",
      title: "Ledgerloop's Series B is a bet that reconciliation is a wedge",
      url: "https://fiscalwire.example/ledgerloop-series-b",
      published_at: "2026-06-13",
      retrieved_at: "2026-07-28",
      text: `# Ledgerloop's Series B is a bet that reconciliation is a wedge

Ledgerloop closed a $28M Series B this week, and the interesting detail is not the number but the hire announced alongside it.

Bringing in a VP Revenue from an enterprise billing platform tells you where the company thinks its next dollar is. Ledgerloop has been a mid-market product with mid-market pricing; enterprise finance teams buy differently, and the security review alone tends to add a quarter to the cycle.

Analysts we spoke to were split on whether the wedge holds. Reconciliation is a real pain and a narrow one, and narrow wedges have a habit of running out of room right around the point where the sales team gets expensive.`,
    },
    {
      id: "c01-d08",
      company_id: "c01",
      kind: "review_site",
      title: "Ledgerloop reviews — Controllers' verdict",
      url: "https://stackverdict.example/ledgerloop",
      published_at: "2026-04-18",
      retrieved_at: "2026-07-28",
      text: `# Ledgerloop reviews

**4.3 / 5 from 87 verified reviews**

## What reviewers like
Matching accuracy is the consistent praise. Several reviewers describe cutting two to three days off the close in the first quarter.

## What reviewers complain about
The audit trail export is slow — one controller reports waiting over four minutes for a quarter's worth of entries, and two others describe it timing out entirely on larger ledgers.

Support response time is the second recurring complaint. Multiple reviewers say tickets take three to four days to get a substantive reply, which is a long time when the books are open.

Finally, the approval workflow cannot express a two-of-three approver rule, which several finance teams say forced them back into email for sign-off.`,
    },
    {
      id: "c01-d09",
      company_id: "c01",
      kind: "changelog",
      title: "Ledgerloop changelog — July 2026",
      url: "https://ledgerloop.example/changelog/2026-07",
      published_at: "2026-07-20",
      retrieved_at: "2026-07-28",
      text: `# Changelog — July 2026

## 2026-07-18 — Exception bundling
Unmatched transactions from the same counterparty now arrive as one exception instead of many. Early accounts saw exception counts fall by roughly 40%.

## 2026-07-09 — Streaming audit trail export
The audit trail export now streams, so a quarter of entries starts downloading immediately instead of building in memory first. This was the most-reported complaint in our review inbox.

## 2026-07-02 — NetSuite journal write-back
Journal entries can now be written back to NetSuite directly, joining the existing Xero and QuickBooks integrations.`,
    },
    {
      id: "c01-d10",
      company_id: "c01",
      kind: "job_post",
      title: "Enterprise Account Executive — Ledgerloop",
      url: "https://ledgerloop.example/careers/enterprise-ae",
      published_at: "2026-07-10",
      retrieved_at: "2026-07-28",
      text: `# Enterprise Account Executive

Chicago or New York · Revenue · Full-time

You will own new enterprise business in North America, carrying a $1.1M annual quota against finance teams at companies above 2,000 employees. This is a new segment for us and the first two enterprise logos closed in the last quarter.

## What you will do
Run a consultative cycle with controllers, CFOs and IT security. Partner with an SDR on outbound into a named account list. Work with our implementation lead on proof-of-concept scoping.

## What we look for
Five or more years selling finance software to enterprise buyers, and comfort with a security review as part of the cycle.`,
    },
  ],
};
