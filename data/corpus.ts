import type { Company, SourceDocument } from "@/lib/brief/types";

import { corpusEntrySchema, type CorpusEntry } from "./schema";
import { c01 } from "./corpus/c01";
import { c02 } from "./corpus/c02";
import { c03 } from "./corpus/c03";
import { c04 } from "./corpus/c04";
import { c05 } from "./corpus/c05";
import { c06 } from "./corpus/c06";
import { c07 } from "./corpus/c07";
import { c08 } from "./corpus/c08";
import { c09 } from "./corpus/c09";
import { c10 } from "./corpus/c10";

/**
 * The corpus, validated at import time. A bad hand-edit fails the build rather than a request.
 *
 * The whole corpus is authored and synthetic. Every domain ends in `.example`, which RFC 2606
 * reserves, so nothing here resolves and nothing here is quoting a real company. That is a choice
 * with a real cost — a reviewer cannot click a citation through to a live page — and it is made
 * because the ten traps below have to be engineered. There is no real corpus that happens to
 * contain a careers page naming a competitor's product, a customer count that disagrees with an
 * investor update, and a pricing page eighteen months out of date, all at once.
 *
 * The demonstration that this works on unseen text is paste-documents, not the corpus.
 */

/** The default as-of for every committed brief. Fixed so fixtures are reproducible. */
export const DEFAULT_AS_OF = "2026-08-01";

const ENTRIES: readonly CorpusEntry[] = [c01, c02, c03, c04, c05, c06, c07, c08, c09, c10].map(
  (entry) => corpusEntrySchema.parse(entry),
);

export const COMPANIES: readonly Company[] = ENTRIES.map((entry) => entry.company);

export const DOCUMENTS: readonly SourceDocument[] = ENTRIES.flatMap((entry) => entry.documents);

export function companyById(id: string): Company | undefined {
  return COMPANIES.find((company) => company.id === id);
}

export function documentsFor(companyId: string): SourceDocument[] {
  return DOCUMENTS.filter((document) => document.company_id === companyId);
}

export function documentById(id: string): SourceDocument | undefined {
  return DOCUMENTS.find((document) => document.id === id);
}

/**
 * What each company is in the corpus to prove. Rendered in the UI next to the company picker, so a
 * reviewer knows which trap they are looking at instead of wondering whether the brief is broken.
 */
export const TRAPS: Readonly<Record<string, string>> = {
  c01: "The happy path — all twelve questions answerable",
  c02: "Two headcounts, five months apart. Neither is chosen",
  c03: "4,000 customers and 42,000 seats — different units, not a conflict",
  c04: "Pricing eighteen months old, and a 2022 announcement past every horizon",
  c05: "First-party sources only. The Pain section stays honestly empty",
  c06: "A careers page about a competitor. Right quote, wrong company",
  c07: "The numbers live in table rows, captions and a footnote",
  c08: "Everything is a plan. The Change section stays empty",
  c09: "Two documents. Nine questions unanswerable, known before spending a token",
  c10: "The company says 900 customers, the press says 430",
};
