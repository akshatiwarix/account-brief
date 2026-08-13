import { z } from "zod";

import { DOCUMENT_KINDS } from "@/lib/brief/types";
import type { DocumentKind } from "@/lib/brief/types";

/**
 * Zod at the corpus boundary. The engine's types (`lib/brief/types.ts`) are the contract; these
 * schemas are the runtime check that the authored corpus still satisfies it.
 *
 * The corpus is authored as TypeScript modules with template literals rather than as one big
 * `corpus.json`. That is a deliberate deviation from the plan: ~68 documents of authored prose in
 * JSON means every paragraph break is a `\n` escape, which makes the most reviewable artifact in
 * the repo unreadable in a diff. Parsing still happens at import time, so a bad edit fails the
 * build rather than a request — which was the actual point of the JSON.
 */

const iso = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "dates are date-only, no times anywhere in this repo");

const documentKind = z.enum(DOCUMENT_KINDS as [DocumentKind, ...DocumentKind[]]);

export const companySchema = z.object({
  id: z.string().regex(/^c\d{2}$/),
  name: z.string().min(1),
  // Every domain is `.example`. RFC 2606 reserves it, so nothing here can accidentally resolve.
  domain: z.string().regex(/\.example$/, "corpus domains must end in .example"),
  industry: z.string().min(1),
});

export const sourceDocumentSchema = z
  .object({
    id: z.string().regex(/^c\d{2}-d\d{2}$/),
    company_id: z.string().regex(/^c\d{2}$/),
    kind: documentKind,
    title: z.string().min(1),
    url: z.string().regex(/^https:\/\/[^\s]*\.example(\/[^\s]*)?$/),
    published_at: iso.nullable(),
    retrieved_at: iso,
    text: z.string().min(40),
  })
  .refine((document) => document.id.startsWith(document.company_id), {
    message: "document id must be prefixed with its owning company id",
  })
  .refine(
    (document) => document.published_at === null || document.published_at <= document.retrieved_at,
    { message: "a document cannot be published after it was retrieved" },
  );

export const corpusEntrySchema = z.object({
  company: companySchema,
  documents: z.array(sourceDocumentSchema).min(2),
});

export type CorpusEntry = z.infer<typeof corpusEntrySchema>;
