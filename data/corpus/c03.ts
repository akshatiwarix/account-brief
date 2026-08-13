import type { CorpusEntry } from "../schema";

/**
 * `c03` — the false-conflict trap.
 *
 * "more than 4,000 customers" and "42,000 seats under contract" are both `scale` claims, ten times
 * apart, and are not in conflict: they count different things. A conflict detector that compares
 * numbers without comparing units flags this and starts crying wolf on every brief, at which point
 * the `conflicting` marker becomes noise and a reviewer learns to ignore it — including on `c02`,
 * where it matters.
 *
 * The unit table in `conflict.ts` is what makes this a non-event, and `conflict.test.ts` pins it.
 */
export const c03: CorpusEntry = {
  company: {
    id: "c03",
    name: "Palewind",
    domain: "palewind.example",
    industry: "Customer support platform",
  },
  documents: [
    {
      id: "c03-d01",
      company_id: "c03",
      kind: "homepage",
      title: "Palewind — support that reads the whole thread",
      url: "https://palewind.example/",
      published_at: "2026-06-20",
      retrieved_at: "2026-07-28",
      text: `# Support that reads the whole thread

Palewind is a customer support platform for teams whose conversations do not fit in a ticket. It threads email, chat and in-app messages into one conversation, and keeps the history when a customer changes channel.

More than 4,000 customers run their support on Palewind, from two-person startups to public companies.

## Who it is for
Support leaders at B2B software companies, typically with between 5 and 200 agents.`,
    },
    {
      id: "c03-d02",
      company_id: "c03",
      kind: "pricing",
      title: "Pricing — Palewind",
      url: "https://palewind.example/pricing",
      published_at: "2026-06-20",
      retrieved_at: "2026-07-28",
      text: `# Pricing

## Team — $29 per agent, per month
Shared inbox, threading, and one knowledge base.

## Scale — $59 per agent, per month
Adds SLA tracking, round-robin assignment, and the reporting API.

## Enterprise — from $18,000 per year
Annual contract, SSO, data residency, and an assigned support engineer. Contact our team for a quote.

Every plan is per agent. We do not charge per conversation, because a pricing model that punishes you for talking to your customers is a strange thing to sell to a support team.`,
    },
    {
      id: "c03-d03",
      company_id: "c03",
      kind: "filing_excerpt",
      title: "Palewind Holdings — contracted seats and revenue excerpt",
      url: "https://palewind.example/investors/excerpt-q2-2026",
      published_at: "2026-06-05",
      retrieved_at: "2026-07-28",
      text: `## Key operating metrics

At the end of the quarter we had 42,000 seats under contract, an increase of 18% year over year. Net revenue retention was 112%.

Annual recurring revenue was $61.4 million at quarter end. Seats under contract is our primary volume metric and is not directly comparable to the customer counts published on our website, which count organizations rather than licensed agents.`,
    },
    {
      id: "c03-d04",
      company_id: "c03",
      kind: "press_release",
      title: "Palewind opens Sydney office to serve APAC support teams",
      url: "https://palewind.example/press/apac",
      published_at: "2026-05-28",
      retrieved_at: "2026-07-28",
      text: `# Palewind opens Sydney office

SYDNEY — Palewind has opened an office in Sydney, its first in the Asia-Pacific region, and appointed Wei Tan as Regional Director.

The company says APAC accounted for 14% of new business in the last two quarters, largely inbound, and that the office is a response to demand rather than an attempt to create it.

Palewind also announced data residency in Australia for Enterprise customers, which had been the most common blocker in regional deals.`,
    },
    {
      id: "c03-d05",
      company_id: "c03",
      kind: "blog",
      title: "We are cutting our own reply time targets",
      url: "https://palewind.example/blog/reply-time",
      published_at: "2026-04-30",
      retrieved_at: "2026-07-28",
      text: `# We are cutting our own reply time targets

Our priority for the rest of the year is first-reply time on our own support desk, not our customers'.

We publish our numbers quarterly and last quarter we were slower than the median team on our own platform, which is an embarrassing thing to discover in your own reporting tool. Median first reply was 6 hours 40 minutes. The target for Q4 is under 2 hours.

We are not adding headcount to get there. We are rewriting our macros and killing three of our own internal handoffs.`,
    },
    {
      id: "c03-d06",
      company_id: "c03",
      kind: "review_site",
      title: "Palewind reviews — support leaders",
      url: "https://stackverdict.example/palewind",
      published_at: "2026-02-14",
      retrieved_at: "2026-07-28",
      text: `# Palewind reviews

**4.5 / 5 from 214 verified reviews**

Threading is the headline. Reviewers repeatedly describe it as the reason they switched, and several say it removed the duplicate-ticket problem entirely.

Complaints are narrower than in most of this category. Reporting is the main one: reviewers say the built-in reports cannot answer "how long did this customer wait across all channels", which is odd given threading is the product's core idea, and that the reporting API is the only way to get it.

A second complaint is the mobile app, which multiple reviewers describe as read-only in practice.`,
    },
    {
      id: "c03-d07",
      company_id: "c03",
      kind: "job_post",
      title: "Solutions Engineer, APAC — Palewind",
      url: "https://palewind.example/careers/solutions-engineer-apac",
      published_at: "2026-07-02",
      retrieved_at: "2026-07-28",
      text: `# Solutions Engineer, APAC

Sydney · Revenue · Full-time

You will pair with account executives on Enterprise deals across Australia, New Zealand and Singapore, running technical evaluations and migration planning for support teams moving off legacy help desks.

Expect to spend half your time on migrations. Most of our Enterprise deals involve moving several years of ticket history, and the customers who stall are the ones who cannot see how that history will land.

Data residency questions come up in nearly every regional deal; you will be the person who answers them.`,
    },
  ],
};
