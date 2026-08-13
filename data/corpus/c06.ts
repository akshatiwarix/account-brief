import type { CorpusEntry } from "../schema";

/**
 * `c06` — the misattribution trap.
 *
 * Sparkfold's careers page and job post talk at length about Zafira Sheets, a competitor whose
 * customers Sparkfold migrates. A quote lifted from those documents can be perfectly verbatim, land
 * a perfect span, and still be a claim about the wrong company: "Zafira Sheets has more than 30,000
 * teams" is true of Zafira and says nothing about Sparkfold.
 *
 * Span resolution cannot catch this — the quote *is* in the document. `subject_company_id` is what
 * catches it, which is why the extraction schema forces the model to name who each claim is about
 * and the engine rejects any claim whose subject is not the company being briefed. Every grounding
 * pipeline that verifies quotes but not subjects has this hole.
 */
export const c06: CorpusEntry = {
  company: {
    id: "c06",
    name: "Sparkfold",
    domain: "sparkfold.example",
    industry: "Spreadsheet migration tooling",
  },
  documents: [
    {
      id: "c06-d01",
      company_id: "c06",
      kind: "homepage",
      title: "Sparkfold — turn a spreadsheet into an application",
      url: "https://sparkfold.example/",
      published_at: "2026-06-18",
      retrieved_at: "2026-07-28",
      text: `# Turn a spreadsheet into an application

Sparkfold reads a working spreadsheet — formulas, validation rules, the lot — and produces a database-backed internal app with the same behaviour.

We sell to operations teams at companies between 100 and 1,500 employees who are running something load-bearing in a shared spreadsheet and know it.

Sparkfold has migrated more than 2,000 spreadsheets into production applications.`,
    },
    {
      id: "c06-d02",
      company_id: "c06",
      kind: "careers",
      title: "Careers — Sparkfold",
      url: "https://sparkfold.example/careers",
      published_at: "2026-07-03",
      retrieved_at: "2026-07-28",
      text: `# Work at Sparkfold

We are 64 people, remote across eight countries, with a quarterly week together in Porto.

## Who we compete with

Most of our pipeline is teams leaving Zafira Sheets. Zafira Sheets has more than 30,000 teams on its platform and employs around 900 people, and it remains the default choice for a team that wants a grid rather than an application. We win when the spreadsheet has outgrown the grid.

You will hear us talk about Zafira constantly. Understanding why their customers stay as long as they do is most of the job.

## How we sell
Product-led. Teams import a spreadsheet on the free tier, and our two account executives get involved above ten seats.`,
    },
    {
      id: "c06-d03",
      company_id: "c06",
      kind: "job_post",
      title: "Migration Engineer — Sparkfold",
      url: "https://sparkfold.example/careers/migration-engineer",
      published_at: "2026-07-16",
      retrieved_at: "2026-07-28",
      text: `# Migration Engineer

Remote (EU timezones) · Engineering · Full-time

You will own the hardest migrations we take on: spreadsheets with more than 50 sheets, cross-workbook references, and macros nobody has read in four years.

## What you will work on
Most incoming files come from Zafira Sheets, whose formula dialect differs from ours in about thirty places. You will extend our translation layer, and you will be the person who decides when a formula cannot be translated faithfully and has to be flagged instead of guessed.

Zafira announced a native app builder in May 2026, so expect the competitive picture to move under you.

## What we look for
Deep spreadsheet knowledge. Comfort saying "this cannot be translated" instead of shipping something that silently differs.`,
    },
    {
      id: "c06-d04",
      company_id: "c06",
      kind: "pricing",
      title: "Pricing — Sparkfold",
      url: "https://sparkfold.example/pricing",
      published_at: "2026-06-18",
      retrieved_at: "2026-07-28",
      text: `# Pricing

## Free
One app, three editors, 1,000 rows. No time limit.

## Team — $24 per editor, per month
Unlimited apps, 250,000 rows, and version history.

## Business — $60 per editor, per month
Permissions, audit log, and the migration assistant for spreadsheets above 50 sheets.

Viewers are always free, on every plan. We charge for the people who build, not the people who read.`,
    },
    {
      id: "c06-d05",
      company_id: "c06",
      kind: "blog",
      title: "A formula we refuse to translate",
      url: "https://sparkfold.example/blog/refuse-to-translate",
      published_at: "2026-05-21",
      retrieved_at: "2026-07-28",
      text: `# A formula we refuse to translate

Our priority this year is translation fidelity, and the clearest expression of that priority is the list of things we will not convert.

Volatile functions are the obvious case. A cell that recalculates on every open behaves one way in a grid and another way in an application with a request lifecycle, and a migration that quietly picks one is a migration that will produce a wrong number in six months.

So we flag it, we explain it, and we make the operations lead decide. It costs us conversion rate. We think it is the only defensible choice.`,
    },
    {
      id: "c06-d06",
      company_id: "c06",
      kind: "changelog",
      title: "Sparkfold changelog — June and July 2026",
      url: "https://sparkfold.example/changelog/summer-2026",
      published_at: "2026-07-22",
      retrieved_at: "2026-07-28",
      text: `# Changelog — June and July 2026

## 2026-07-19 — Cross-workbook references
Imports now follow references between workbooks in the same upload, instead of leaving them as broken links.

## 2026-07-04 — Translation report
Every migration now produces a report listing each formula that could not be translated faithfully, with the reason.

## 2026-06-12 — Row limit raised on Team
Team plans now include 250,000 rows, up from 100,000.`,
    },
    {
      id: "c06-d07",
      company_id: "c06",
      kind: "news",
      title: "The spreadsheet-to-app category gets crowded",
      url: "https://gridwatch.example/spreadsheet-to-app-2026",
      published_at: "2026-06-01",
      retrieved_at: "2026-07-28",
      text: `# The spreadsheet-to-app category gets crowded

Zafira Sheets shipped a native app builder in May, and the companies whose whole product was "get your data out of Zafira" now have a harder story to tell.

Sparkfold is the interesting case. Its bet is fidelity rather than escape: the pitch is not that spreadsheets are bad but that a specific spreadsheet has outgrown the grid, and that translating it faithfully is a genuinely hard engineering problem.

Users we spoke to were mixed. Two described the translation report as the reason they trusted the migration. One called the free tier's row limit "aggressive enough to feel like a demo", and said the upgrade prompt arrived before they had finished evaluating.`,
    },
  ],
};
