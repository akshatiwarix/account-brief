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

// ── committed brief fixtures ──────────────────────────────────────────────────────────────────

const spanSchema = z.object({ start: z.number().int().min(0), end: z.number().int().min(0) });

/**
 * A fixture's claims must all carry a span. A `null` span in a committed brief would mean a rejected
 * claim was written into the surviving set, so it is a schema error rather than something the UI has
 * to defend against at render time.
 */
const claimSchema = z.object({
  id: z.string().min(1),
  question_id: z.string().min(1),
  assertion: z.string().min(1),
  quote: z.string().min(1),
  span: spanSchema,
  document_id: z.string().min(1),
  subject_company_id: z.string().min(1),
  kind: z.enum(["fact", "number", "opinion", "forward_looking"]),
  stance: z.enum(["company", "third_party", "regulatory"]),
  value: z.object({ n: z.number(), unit: z.string() }).nullable(),
  observed_at: iso,
});

const sentenceSchema = z.object({
  question_id: z.string().min(1),
  text: z.string().min(1),
  /** Non-empty by construction in the engine; asserted here so a hand-edited fixture cannot lie. */
  claim_ids: z.array(z.string().min(1)).min(1),
  attribution: z.enum(["bare", "company_stated", "forward_looking", "regulatory"]),
  as_of: iso.nullable(),
  conflicting: z.boolean(),
  repaired: z.boolean(),
  inferred: z.boolean(),
});

const rejectionSchema = z.object({
  reason: z.enum([
    "quote_not_found",
    "quote_not_found_after_retry",
    "wrong_company",
    "stale",
    "unroutable",
    "no_surviving_citation",
    "forward_looking_in_change_section",
    "over_question_cap",
  ]),
  detail: z.string().min(1),
  claim: claimSchema.partial({ span: true }).optional(),
  sentence_text: z.string().optional(),
  question_id: z.string().optional(),
});

export const briefSchema = z.object({
  company: companySchema,
  sections: z.array(
    z.object({
      section: z.enum(["company", "motion", "change", "pain", "approach"]),
      questions: z.array(
        z.object({
          question_id: z.string().min(1),
          sentences: z.array(sentenceSchema),
          unanswerable: z
            .object({
              missing_kinds: z.array(documentKind),
              reason: z.enum(["unroutable", "no_surviving_claims"]),
            })
            .nullable(),
        }),
      ),
    }),
  ),
  claims: z.array(claimSchema),
  conflicts: z.array(
    z.object({
      question_id: z.string().min(1),
      claim_ids: z.array(z.string()).min(2),
      unit: z.string(),
      spread: z.number(),
    }),
  ),
  rejected: z.array(rejectionSchema),
  coverage: z.object({
    routable: z.number().int().min(0),
    answered: z.number().int().min(0),
    total: z.number().int().min(1),
  }),
  as_of: iso,
  generated_at: iso,
  cost: z
    .object({
      extract_calls: z.number().int().min(0),
      retry_calls: z.number().int().min(0),
      compose_calls: z.number().int().min(0),
      claims_returned: z.number().int().min(0),
      claims_surviving: z.number().int().min(0),
    })
    .nullable(),
});

export const fixtureSchema = z.object({
  inputs_hash: z.string().length(32),
  schema_version: z.number().int().min(1),
  brief: briefSchema,
});

export type Fixture = z.infer<typeof fixtureSchema>;
