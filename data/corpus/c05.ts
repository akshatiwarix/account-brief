import type { CorpusEntry } from "../schema";

/**
 * `c05` — first-party only. Every document is written by the company; there is no `review_site` and
 * no `news`, so `third_party_complaints` is `unroutable` and the Pain section renders half empty.
 *
 * Two things are on display. First, the attribution gate: this corpus is almost entirely
 * `stance: "company"`, so nearly every sentence in the brief must render as *positions itself as* /
 * *states that* rather than as fact. A brief on this company that reads confidently is a brief that
 * has laundered an ad. Second, an honest empty section — the alternative, which every summarizer
 * does, is to answer "what do others complain about" out of the homepage's own copy.
 */
export const c05: CorpusEntry = {
  company: {
    id: "c05",
    name: "Verdanta",
    domain: "verdanta.example",
    industry: "Sustainability reporting",
  },
  documents: [
    {
      id: "c05-d01",
      company_id: "c05",
      kind: "homepage",
      title: "Verdanta — audit-ready sustainability reporting",
      url: "https://verdanta.example/",
      published_at: "2026-06-25",
      retrieved_at: "2026-07-28",
      text: `# Audit-ready sustainability reporting

Verdanta collects emissions, energy and supply chain data from the systems a company already runs, and produces disclosure-ready reports for CSRD, ISSB and SEC climate rules.

We are the leading platform for regulated sustainability disclosure, trusted by the most demanding reporting teams in Europe.

## Who we serve
Sustainability and finance teams at companies in scope for mandatory disclosure — typically listed groups above 500 employees with operations in more than one jurisdiction.

Verdanta is the fastest path from raw data to a signed-off report, full stop.`,
    },
    {
      id: "c05-d02",
      company_id: "c05",
      kind: "pricing",
      title: "Pricing — Verdanta",
      url: "https://verdanta.example/pricing",
      published_at: "2026-06-25",
      retrieved_at: "2026-07-28",
      text: `# Pricing

Verdanta is sold as an annual subscription, scoped by reporting entity.

## Single entity — from $34,000 per year
One reporting entity, one framework, unlimited users.

## Group — from $95,000 per year
Consolidated reporting across entities, multi-framework mapping, and assurance workpapers.

Every engagement begins with a scoping call. We do not publish a self-serve tier, because a disclosure that has to survive an auditor is not a credit-card purchase.`,
    },
    {
      id: "c05-d03",
      company_id: "c05",
      kind: "blog",
      title: "Assurance is the whole game in 2026",
      url: "https://verdanta.example/blog/assurance-2026",
      published_at: "2026-06-02",
      retrieved_at: "2026-07-28",
      text: `# Assurance is the whole game in 2026

Our priority this year is limited assurance readiness. Every other roadmap item is subordinate to it.

Reporting teams have spent two years learning to produce a number. The next two years are about producing the evidence trail behind it, because an assurance provider does not accept a number without a lineage.

We believe the teams who win are the ones who treat every figure as something an auditor will ask about, and we have rebuilt our data lineage view on that assumption.`,
    },
    {
      id: "c05-d04",
      company_id: "c05",
      kind: "careers",
      title: "Careers — Verdanta",
      url: "https://verdanta.example/careers",
      published_at: "2026-07-08",
      retrieved_at: "2026-07-28",
      text: `# Careers at Verdanta

We are 148 people across Amsterdam, Munich and Toronto.

Our sales motion is consultative and slow by design: a typical group deal involves the sustainability lead, the group controller and an external assurance provider, and takes two quarters. We are hiring two enterprise account executives and a director of partnerships for the audit firms.

We are also hiring three data engineers for supply chain ingestion, which is where most of our implementation time goes.`,
    },
    {
      id: "c05-d05",
      company_id: "c05",
      kind: "changelog",
      title: "Verdanta release notes — Q2 2026",
      url: "https://verdanta.example/releases/q2-2026",
      published_at: "2026-07-01",
      retrieved_at: "2026-07-28",
      text: `# Release notes — Q2 2026

## Lineage view
Every figure in a report now opens into the raw records behind it, including the transformation applied at each step.

## CSRD gap report
Compares your current data coverage against the disclosure requirements in scope for your entity and lists what is missing.

## Supplier questionnaire portal
Suppliers can now submit primary data directly instead of returning spreadsheets by email.`,
    },
    {
      id: "c05-d06",
      company_id: "c05",
      kind: "press_release",
      title: "Verdanta partners with three assurance providers",
      url: "https://verdanta.example/press/assurance-partners",
      published_at: "2026-05-19",
      retrieved_at: "2026-07-28",
      text: `# Verdanta partners with three assurance providers

AMSTERDAM — Verdanta has signed partnership agreements with three assurance providers covering the Netherlands, Germany and Canada.

Under the agreements, workpapers generated in Verdanta are accepted directly into each firm's review process. The company describes this as removing the most painful week of the reporting cycle.

Verdanta says demand for group-level consolidated reporting has more than doubled year over year.`,
    },
    {
      id: "c05-d07",
      company_id: "c05",
      kind: "job_post",
      title: "Enterprise Account Executive, DACH — Verdanta",
      url: "https://verdanta.example/careers/ae-dach",
      published_at: "2026-07-14",
      retrieved_at: "2026-07-28",
      text: `# Enterprise Account Executive, DACH

Munich · Revenue · Full-time

You will sell into listed groups headquartered in Germany, Austria and Switzerland that are in scope for CSRD, carrying a €1.4M annual quota.

Expect a two-quarter cycle with three buying groups in the room: sustainability, group finance, and the external auditor. Our best AEs are the ones who can hold a technical conversation about consolidation boundaries without reaching for a solutions engineer.

We are moving up-market this year: the target account list is groups above 5,000 employees, where we previously focused on the 500 to 5,000 band.`,
    },
  ],
};
