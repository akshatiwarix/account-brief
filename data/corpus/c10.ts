import type { CorpusEntry } from "../schema";

/**
 * `c10` — the conflict that crosses stance.
 *
 * The homepage claims "over 900 enterprise customers". A trade publication, reading the company's
 * own investor update, reports 430 paying customers. Same question, same unit, more than twice
 * apart — a conflict, and both sides survive.
 *
 * `c02`'s conflict is between two company documents at different dates, which a "trust the newest"
 * heuristic resolves. This one is between the company and a third party, which a "trust the third
 * party" heuristic resolves. Both heuristics are wrong for the same reason: the disagreement was
 * the finding. The reviews also contradict the homepage on onboarding time in prose rather than in
 * numbers, which renders as two attributed sentences that sit next to each other and disagree —
 * deliberately not merged, because the engine has no basis for merging them.
 */
export const c10: CorpusEntry = {
  company: {
    id: "c10",
    name: "Brightsill",
    domain: "brightsill.example",
    industry: "Field service management",
  },
  documents: [
    {
      id: "c10-d01",
      company_id: "c10",
      kind: "homepage",
      title: "Brightsill — dispatch, parts and proof of work",
      url: "https://brightsill.example/",
      published_at: "2026-06-14",
      retrieved_at: "2026-07-28",
      text: `# Dispatch, parts and proof of work

Brightsill runs field service operations end to end: scheduling technicians, tracking van stock, and capturing photographic proof of work that survives a warranty dispute.

Over 900 enterprise customers rely on Brightsill to run their field operations, from regional HVAC contractors to national facilities groups.

## Live in days, not months
Most teams are live in a single day. Import your technicians, your service catalogue and your customer list, and dispatch the same afternoon.

We sell to service operations leaders at companies running between 25 and 800 field technicians.`,
    },
    {
      id: "c10-d02",
      company_id: "c10",
      kind: "news",
      title: "Brightsill's customer count does not match its investor update",
      url: "https://servicewire.example/brightsill-customer-count",
      published_at: "2026-07-08",
      retrieved_at: "2026-07-28",
      text: `# Brightsill's customer count does not match its investor update

Brightsill's homepage claims over 900 enterprise customers. An investor update circulated in June, which we have reviewed, puts the figure at 430 paying customers.

The gap appears to be definitional rather than deceptive: a company spokesperson told us the website figure counts organizations that have ever activated an account, including those on expired trials and dormant franchise locations counted individually.

Definitional or not, it is the kind of gap that matters in a procurement conversation, and Brightsill is not the only vendor in this category doing it. Buyers should ask which number is on the invoice.`,
    },
    {
      id: "c10-d03",
      company_id: "c10",
      kind: "review_site",
      title: "Brightsill reviews — service operations leaders",
      url: "https://stackverdict.example/brightsill",
      published_at: "2026-05-02",
      retrieved_at: "2026-07-28",
      text: `# Brightsill reviews

**3.8 / 5 from 129 verified reviews**

Dispatch and proof-of-work capture are well liked. Several reviewers describe the photo trail as having ended warranty disputes outright.

Onboarding is the dominant complaint and it is not close. One operations director writes that onboarding took our team eleven weeks, against a promise of same-day setup, because importing an existing service catalogue required a data cleanup nobody warned them about. Two other reviewers describe multi-week imports.

Van stock reconciliation is the second complaint: reviewers say the parts count drifts from reality within a month and has to be recounted manually every quarter.

Pricing transparency comes third, with several reviewers noting that the published per-technician rate excludes the parts module most of them ended up needing.`,
    },
    {
      id: "c10-d04",
      company_id: "c10",
      kind: "pricing",
      title: "Pricing — Brightsill",
      url: "https://brightsill.example/pricing",
      published_at: "2026-06-14",
      retrieved_at: "2026-07-28",
      text: `# Pricing

## Dispatch — $52 per technician, per month
Scheduling, mobile app, and proof-of-work capture.

## Operations — $79 per technician, per month
Adds van stock tracking, parts reconciliation, and service contract management.

## Enterprise
Above 300 technicians, pricing is agreed per contract and includes a named implementation manager.

Office staff seats are billed at $18 per user, per month on all plans.`,
    },
    {
      id: "c10-d05",
      company_id: "c10",
      kind: "careers",
      title: "Careers — Brightsill",
      url: "https://brightsill.example/careers",
      published_at: "2026-07-01",
      retrieved_at: "2026-07-28",
      text: `# Careers at Brightsill

We are 265 people, headquartered in Manchester with regional teams in Atlanta and Melbourne.

Our motion is sales-led with a field component: account executives run the cycle, and a solutions consultant visits the depot. We are hiring four account executives, two solutions consultants, and — the largest single opening on this page — six implementation specialists.

Implementation is where we are investing this year, for reasons our reviews will tell you.`,
    },
    {
      id: "c10-d06",
      company_id: "c10",
      kind: "changelog",
      title: "Brightsill release notes — July 2026",
      url: "https://brightsill.example/releases/2026-07",
      published_at: "2026-07-17",
      retrieved_at: "2026-07-28",
      text: `# Release notes — July 2026

## 2026-07-15 — Guided catalogue import
Service catalogue import now runs as a guided flow with validation before commit, replacing the spreadsheet template.

## 2026-07-10 — Cycle counting for van stock
Van stock can be cycle-counted from the mobile app, with variances raised as tasks instead of silently corrected.

## 2026-07-01 — Contract renewal reminders
Service contracts nearing expiry now raise a task for the account owner 60 days out.`,
    },
    {
      id: "c10-d07",
      company_id: "c10",
      kind: "press_release",
      title: "Brightsill acquires Tallowpath to add parts procurement",
      url: "https://brightsill.example/press/tallowpath",
      published_at: "2026-06-03",
      retrieved_at: "2026-07-28",
      text: `# Brightsill acquires Tallowpath

MANCHESTER — Brightsill has acquired Tallowpath, a parts procurement platform, for an undisclosed sum. Tallowpath's 14 employees join Brightsill's operations product team.

The acquisition adds supplier catalogues and purchase order workflow to Brightsill's van stock module, closing the loop between a part being consumed on a job and being reordered.

Brightsill said the combined product will be available to Operations plan customers at no additional cost.`,
    },
    {
      id: "c10-d08",
      company_id: "c10",
      kind: "blog",
      title: "We are rebuilding onboarding, and saying why",
      url: "https://brightsill.example/blog/rebuilding-onboarding",
      published_at: "2026-06-20",
      retrieved_at: "2026-07-28",
      text: `# We are rebuilding onboarding, and saying why

Our priority for the second half of this year is time to first dispatch, and we are publishing the number we are trying to fix.

Median time from contract signature to first dispatched job is currently 23 days. Our marketing has said "live in a day" for two years. Both of those statements are technically true — the software is ready in a day, and the customer's service catalogue usually is not — and the gap between them is our problem, not the customer's.

So: a guided import, validation before commit, and six new implementation specialists. We will publish the median again in January.`,
    },
  ],
};
