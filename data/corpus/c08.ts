import type { CorpusEntry } from "../schema";

/**
 * `c08` — everything is a plan.
 *
 * Northroad's documents are almost entirely forward-looking: expects to, intends to, will begin,
 * targets, plans to. Nothing here has happened yet, and the Change section — "what changed
 * recently?" — must therefore stay empty rather than filling up with announcements of intent.
 *
 * This is the failure mode of every generated brief I have read. "Northroad is expanding into
 * Europe and opening a Lyon depot" reads as fact, ships to a rep, and turns into a cold-call
 * opener about a depot that does not exist. `forward_looking` claims are filtered out of Change
 * before compose, and everywhere else they render as *says it plans to*.
 */
export const c08: CorpusEntry = {
  company: {
    id: "c08",
    name: "Northroad Energy",
    domain: "northroad.example",
    industry: "Fleet electrification",
  },
  documents: [
    {
      id: "c08-d01",
      company_id: "c08",
      kind: "homepage",
      title: "Northroad — electrify the fleet you already run",
      url: "https://northroad.example/",
      published_at: "2026-07-06",
      retrieved_at: "2026-07-28",
      text: `# Electrify the fleet you already run

Northroad plans and operates depot charging for commercial vehicle fleets — the site survey, the hardware procurement, the load management software, and the ongoing energy contract.

We work with logistics operators and municipal fleets running between 40 and 600 vehicles from fixed depots.

Northroad intends to become the default operating partner for depot electrification in North America and Europe.`,
    },
    {
      id: "c08-d02",
      company_id: "c08",
      kind: "press_release",
      title: "Northroad announces European expansion plans",
      url: "https://northroad.example/press/europe",
      published_at: "2026-07-02",
      retrieved_at: "2026-07-28",
      text: `# Northroad announces European expansion plans

TORONTO — Northroad Energy today announced its intention to expand into continental Europe in 2027.

The company expects to open its first European office in Lyon in the first quarter of 2027, subject to closing its planned Series B, and plans to hire approximately 30 people in the region during the year.

Northroad also said it aims to support 5,000 vehicles under active load management by the end of 2027, up from what it describes as a low four-figure number today.

"Everything we have learned in Ontario and Quebec should transfer," said CEO Halim Ferreira. "We expect the regulatory work to be the hard part, not the engineering."`,
    },
    {
      id: "c08-d03",
      company_id: "c08",
      kind: "news",
      title: "Northroad's European plan depends on a round it has not closed",
      url: "https://gridbeat.example/northroad-europe-plan",
      published_at: "2026-07-04",
      retrieved_at: "2026-07-28",
      text: `# Northroad's European plan depends on a round it has not closed

Northroad Energy's announcement this week is unusually conditional for a press release. The Lyon office, the 30 hires and the 5,000-vehicle target are all explicitly tied to a Series B that has not been announced as closed.

That is not a criticism so much as an observation about the sector. Depot electrification is capital-heavy and the software margin does not carry the hardware timeline, so expansion plans in this category tend to be announced twice: once as an intention, once as a fact.

Two operators told us they had been shown the Lyon plan during procurement conversations in June, which suggests the announcement has been doing sales work for a while.`,
    },
    {
      id: "c08-d04",
      company_id: "c08",
      kind: "blog",
      title: "What we will build next",
      url: "https://northroad.example/blog/what-we-will-build",
      published_at: "2026-06-27",
      retrieved_at: "2026-07-28",
      text: `# What we will build next

Our priority for the next eighteen months is depot-level load forecasting, because the utility interconnection is the binding constraint on every project we take on.

We will begin a pilot of forecast-driven charging schedules with two Ontario customers in the autumn, and we expect to make it generally available in 2027 once we have a full winter of data.

We also intend to publish our load model methodology. We think the sector's numbers are optimistic and we would rather argue about a published method than trade brochures.`,
    },
    {
      id: "c08-d05",
      company_id: "c08",
      kind: "careers",
      title: "Careers — Northroad Energy",
      url: "https://northroad.example/careers",
      published_at: "2026-07-09",
      retrieved_at: "2026-07-28",
      text: `# Careers at Northroad

We are 84 people across Toronto and Montreal.

Our sales cycle is long and consultative: a depot project involves the fleet operator, the utility, and usually a municipal permitting office, and takes nine to fifteen months from first conversation to energized site. We are hiring one enterprise account executive and two project engineers.

Subject to closing our next round, we expect to open hiring in Lyon in early 2027.`,
    },
    {
      id: "c08-d06",
      company_id: "c08",
      kind: "pricing",
      title: "How Northroad is priced",
      url: "https://northroad.example/pricing",
      published_at: "2026-07-06",
      retrieved_at: "2026-07-28",
      text: `# How Northroad is priced

Northroad charges a fixed fee for the site study, then a per-vehicle monthly fee for load management, then an energy margin on the supply contract.

## Site study — from $18,000 per depot
Electrical survey, interconnection assessment, and a phased build plan.

## Load management — $46 per vehicle, per month
Scheduling, telemetry, and utility tariff optimization.

We intend to publish standard pricing for multi-depot agreements once we have enough of them to be honest about the number. Today they are quoted individually.`,
    },
    {
      id: "c08-d07",
      company_id: "c08",
      kind: "job_post",
      title: "Project Engineer, Depot Electrification — Northroad",
      url: "https://northroad.example/careers/project-engineer",
      published_at: "2026-07-13",
      retrieved_at: "2026-07-28",
      text: `# Project Engineer, Depot Electrification

Toronto · Delivery · Full-time

You will own depot projects from electrical survey to energization, coordinating with utilities, electrical contractors and the fleet's own operations team.

## What you will do
Run interconnection applications. Size charging hardware against a duty cycle. Own the phased build so a depot can keep operating while it is being rebuilt around the vehicles.

We expect this role to become a regional lead as we open new territories.`,
    },
  ],
};
