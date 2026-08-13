import { Type } from "@google/genai";
import { z } from "zod";

import { QUESTIONS } from "@/lib/brief/questions";
import type { QuestionId } from "@/lib/brief/types";

/**
 * Native structured output constrains generation; Zod is the trust boundary. Both, because a schema
 * is a request and a validator is a guarantee — the same posture as Days 001–005.
 *
 * `span` is absent from both schemas on purpose. The model is never asked where its quote is, only
 * what it says; the offset is computed by `resolve.ts` from the document itself. Letting the model
 * report a span would be letting it grade its own homework.
 */

const questionIds = QUESTIONS.map((question) => question.id) as [QuestionId, ...QuestionId[]];

// ── extraction ────────────────────────────────────────────────────────────────────────────────

export const EXTRACT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ["claims"],
  properties: {
    claims: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["question_id", "document_id", "assertion", "quote", "subject", "kind", "stance"],
        properties: {
          question_id: { type: Type.STRING, enum: [...questionIds] },
          document_id: {
            type: Type.STRING,
            description: "The id of the document this quote was copied from.",
          },
          assertion: { type: Type.STRING },
          quote: {
            type: Type.STRING,
            description: "Copied character-for-character from that document. One contiguous run.",
          },
          subject: {
            type: Type.STRING,
            description: "The company this claim is about. Not always the company being researched.",
          },
          kind: {
            type: Type.STRING,
            enum: ["fact", "number", "opinion", "forward_looking"],
          },
          stance: { type: Type.STRING, enum: ["company", "third_party", "regulatory"] },
          value_n: { type: Type.NUMBER, nullable: true },
          value_unit: { type: Type.STRING, nullable: true },
        },
      },
    },
  },
} as const;

export const extractResponseSchema = z.object({
  claims: z
    .array(
      z.object({
        question_id: z.enum(questionIds),
        document_id: z.string().min(1).max(64),
        assertion: z.string().min(1).max(500),
        quote: z.string().min(1).max(1000),
        subject: z.string().min(1).max(200),
        kind: z.enum(["fact", "number", "opinion", "forward_looking"]),
        stance: z.enum(["company", "third_party", "regulatory"]),
        value_n: z.number().finite().nullable().optional(),
        value_unit: z.string().max(60).nullable().optional(),
      }),
    )
    // One call now covers a whole company, so the cap is per company rather than per document. A
    // hundred and twenty claims from eleven documents is a runaway, not a thorough read.
    .max(120),
});

export type ExtractResponse = z.infer<typeof extractResponseSchema>;

// ── composition ───────────────────────────────────────────────────────────────────────────────

export const COMPOSE_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  required: ["sentences"],
  properties: {
    sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ["question_id", "text", "claim_ids"],
        properties: {
          question_id: { type: Type.STRING, enum: [...questionIds] },
          text: { type: Type.STRING },
          claim_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
} as const;

export const composeResponseSchema = z.object({
  sentences: z
    .array(
      z.object({
        question_id: z.enum(questionIds),
        text: z.string().min(1).max(600),
        claim_ids: z.array(z.string().max(64)).max(8),
      }),
    )
    .max(60),
});

export type ComposeResponse = z.infer<typeof composeResponseSchema>;

// ── paste ─────────────────────────────────────────────────────────────────────────────────────

const iso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dates are date-only");

/**
 * Pasted documents. Caps are deliberately low: this route spends someone else's quota, and the
 * demonstration only needs a handful of pages.
 *
 * Text is NFC-normalised here rather than in the engine, which is what lets `normalize.ts` fold
 * single code points and keep its offset map honest.
 */
export const pasteDocumentSchema = z.object({
  kind: z.enum([
    "homepage",
    "pricing",
    "careers",
    "blog",
    "press_release",
    "filing_excerpt",
    "news",
    "review_site",
    "changelog",
    "job_post",
  ]),
  title: z.string().min(1).max(300),
  url: z.string().max(2000).default(""),
  published_at: iso.nullable().default(null),
  text: z
    .string()
    .min(40)
    .max(40_000)
    .transform((text) => text.normalize("NFC")),
});

export const pasteRequestSchema = z.object({
  company: z.object({
    name: z.string().min(1).max(200),
    domain: z.string().min(1).max(200),
    industry: z.string().min(1).max(200).default("Unknown"),
  }),
  documents: z.array(pasteDocumentSchema).min(1).max(12),
  as_of: iso.optional(),
});

export const briefRequestSchema = z.union([
  z.object({ company_id: z.string().regex(/^c\d{2}$/) }),
  pasteRequestSchema,
]);

export type PasteRequest = z.infer<typeof pasteRequestSchema>;
export type BriefRequest = z.infer<typeof briefRequestSchema>;
