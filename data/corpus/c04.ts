import type { CorpusEntry } from "../schema";

/**
 * `c04` — the staleness trap, in both of its forms.
 *
 * The pricing page was last published 2025-02-10. Against a 365-day freshness budget and an as-of
 * of 2026-08-01 that is 537 days old: inside 3× the budget, so it renders with an `As of February
 * 2025` prefix rather than being silently presented as current. The 2022 launch announcement is
 * 1,600 days old, past 3× every budget that routes to it, and drops as `stale`.
 *
 * The distinction is the point. "Their pricing was $2,400 a robot eighteen months ago" is useful.
 * "Their pricing is $2,400 a robot" is a rep walking into a call with a stale number and no idea.
 */
export const c04: CorpusEntry = {
  company: {
    id: "c04",
    name: "Tinbox Robotics",
    domain: "tinbox.example",
    industry: "Warehouse robotics software",
  },
  documents: [
    {
      id: "c04-d01",
      company_id: "c04",
      kind: "homepage",
      title: "Tinbox — the control layer for mixed robot fleets",
      url: "https://tinbox.example/",
      published_at: "2026-06-08",
      retrieved_at: "2026-07-28",
      text: `# The control layer for mixed robot fleets

Tinbox runs warehouse robots from different vendors on one traffic model, so a site can add a new fleet without re-planning its floor.

We work with third-party logistics operators and retail distribution centres running between 20 and 400 robots per site.

Tinbox is vendor-neutral by design. We do not build robots and we never will.`,
    },
    {
      id: "c04-d02",
      company_id: "c04",
      kind: "pricing",
      title: "Pricing — Tinbox",
      url: "https://tinbox.example/pricing",
      published_at: "2025-02-10",
      retrieved_at: "2026-07-28",
      text: `# Pricing

Tinbox is licensed per robot, per year.

## Site licence — $2,400 per robot, per year
Traffic model, fleet dashboard, and vendor adapters for the three fleets we support at general availability.

## Multi-site — from $180,000 per year
Cross-site orchestration and a shared traffic model. Priced per contract.

Pilots run for 90 days at a fixed $30,000, credited against the first year of a site licence.`,
    },
    {
      id: "c04-d03",
      company_id: "c04",
      kind: "press_release",
      title: "Tinbox launches out of stealth with vendor-neutral fleet control",
      url: "https://tinbox.example/press/launch",
      published_at: "2022-03-01",
      retrieved_at: "2026-07-28",
      text: `# Tinbox launches out of stealth

AUSTIN — Tinbox today launched out of stealth with $9M in seed funding and support for two robot vendors.

At launch, Tinbox is priced at $3,000 per robot per year and is available to operators in North America only. The company employs 22 people.

"Every warehouse ends up with robots from more than one vendor, and then nobody owns the traffic," said co-founder Priya Raghavan.`,
    },
    {
      id: "c04-d04",
      company_id: "c04",
      kind: "careers",
      title: "Careers — Tinbox",
      url: "https://tinbox.example/careers",
      published_at: "2026-07-05",
      retrieved_at: "2026-07-28",
      text: `# Careers at Tinbox

We are 96 people, based in Austin with a hardware integration lab in Rotterdam.

Sales at Tinbox is a long, technical, on-site motion: a deal involves a floor walk, a simulation against the customer's own layout, and a 90-day pilot. We are hiring one enterprise account executive and two deployment engineers.

Our engineering team is hiring for the traffic model, which is the hardest and least glamorous part of the product.`,
    },
    {
      id: "c04-d05",
      company_id: "c04",
      kind: "blog",
      title: "The bottleneck is never the robot",
      url: "https://tinbox.example/blog/bottleneck",
      published_at: "2026-05-14",
      retrieved_at: "2026-07-28",
      text: `# The bottleneck is never the robot

Our priority for the next two quarters is throughput per aisle, because that is the number our customers are actually judged on.

Operators buy robots expecting a linear return and get a curve that flattens around the point where two fleets start queueing for the same aisle. Adding robots after that point makes throughput worse, which is a counter-intuitive result and one we can now demonstrate in simulation before a customer spends the money.

We would rather sell a site 40 robots that work than 90 that fight.`,
    },
    {
      id: "c04-d06",
      company_id: "c04",
      kind: "news",
      title: "Tinbox signs its largest 3PL deployment yet",
      url: "https://palletpress.example/tinbox-3pl",
      published_at: "2026-07-11",
      retrieved_at: "2026-07-28",
      text: `# Tinbox signs its largest 3PL deployment yet

Tinbox has signed a six-site agreement with a European third-party logistics operator, its largest deployment to date and the first outside North America at scale.

The deal is notable for what it says about the market: the operator runs three robot vendors across those sites and, according to two people familiar with the evaluation, chose Tinbox specifically to avoid committing to one of them.

Whether vendor-neutrality survives contact with the robot makers is the open question. At least one major vendor has begun restricting API access to partners who certify exclusively.`,
    },
  ],
};
