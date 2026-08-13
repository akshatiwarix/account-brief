import { GoogleGenAI, ThinkingLevel } from "@google/genai";

import { chunkDocument } from "@/lib/brief/chunk";
import { buildBrief } from "@/lib/brief";
import { detectConflicts } from "@/lib/brief/conflict";
import { QUESTIONS, extractableQuestions, routeDocuments } from "@/lib/brief/questions";
import { resolveClaims } from "@/lib/brief/resolve";
import type {
  Brief,
  Claim,
  Company,
  ComposedSentence,
  Cost,
  Iso,
  SourceDocument,
} from "@/lib/brief/types";

import {
  COMPOSE_SYSTEM_PROMPT,
  EXTRACT_SYSTEM_PROMPT,
  composeRequest,
  extractRequest,
  retryRequest,
} from "./prompts";
import {
  COMPOSE_RESPONSE_SCHEMA,
  EXTRACT_RESPONSE_SCHEMA,
  composeResponseSchema,
  extractResponseSchema,
} from "./schemas";

/**
 * The generation pass: extract, check, retry once, compose, build.
 *
 * The order is the design. Extraction runs per document per section, so a question with no answering
 * document costs nothing. Resolution runs *before* composition, so the compose call receives only
 * claims that survived and is structurally unable to cite a fabricated quote. `buildBrief` then
 * re-resolves everything from scratch, which is not redundant: it means a `Brief` is valid because
 * the pure engine says so, not because this file was careful.
 */

export const MODEL = "gemini-3.6-flash";

export interface GenerateInput {
  company: Company;
  documents: readonly SourceDocument[];
  apiKey: string;
  asOf: Iso;
  /** Fixed by the caller so a regenerated fixture differs only where the model differed. */
  generatedAt?: Iso;
}

export type GenerateResult =
  | { ok: true; brief: Brief }
  | { ok: false; status: number; error: string };

export async function generateBrief({
  company,
  documents,
  apiKey,
  asOf,
  generatedAt,
}: GenerateInput): Promise<GenerateResult> {
  const ai = new GoogleGenAI({ apiKey });
  const cost: Cost = {
    extract_calls: 0,
    retry_calls: 0,
    compose_calls: 0,
    claims_returned: 0,
    claims_surviving: 0,
  };

  /*
   * Routing still runs first, and still costs nothing: a question no document can answer is not put
   * in the request at all. What changed from PLAN.md is the call shape — one request per company
   * rather than one per (document, section) — because the free tier for this model allows 20 requests
   * per day, which makes a 78-call generation unrunnable. See `prompts.ts` for what that trade buys
   * back.
   */
  const bodies = documents.map((document) => ({ document, chunks: chunkDocument(document) }));
  const asked = extractableQuestions()
    .map((question) => ({
      question,
      documentIds: routeDocuments(question, documents).map((document) => document.id),
    }))
    .filter((entry) => entry.documentIds.length > 0);

  const claims: Claim[] = [];

  if (asked.length > 0) {
    const request = extractRequest(company, bodies, asked);

    const outcome = await extractOnce(ai, request);
    cost.extract_calls += 1;
    if (!outcome.ok) return outcome;

    let batch = toClaims(outcome.claims, company, documents);
    cost.claims_returned += batch.length;

    // The gate, run early, purely to decide whether a retry is worth spending.
    const checked = resolveClaims({ claims: batch, documents, company_id: company.id });
    const missed = checked.rejected
      .filter((rejection) => rejection.reason === "quote_not_found")
      .map((rejection) => rejection.claim)
      .filter((claim): claim is Claim => claim !== undefined)
      .map((claim) => ({ document_id: claim.document_id, quote: claim.quote }));

    if (missed.length > 0) {
      const second = await extractOnce(ai, retryRequest(request, missed));
      cost.retry_calls += 1;
      if (!second.ok) return second;

      // The retry replaces the batch rather than adding to it. Merging both would double-count the
      // claims that were already fine and invite duplicate sentences.
      batch = toClaims(second.claims, company, documents, "r");
      cost.claims_returned += batch.length;
    }

    claims.push(...batch);
  }

  const surviving = resolveClaims({ claims, documents, company_id: company.id }).resolved;
  cost.claims_surviving = surviving.length;

  let composed: ComposedSentence[] = [];
  if (surviving.length > 0) {
    const request = composeRequest(
      company,
      surviving,
      detectConflicts(surviving),
      documents,
      QUESTIONS,
    );
    const outcome = await composeOnce(ai, request);
    cost.compose_calls += 1;
    if (!outcome.ok) return outcome;
    composed = outcome.sentences;
  }

  return {
    ok: true,
    brief: buildBrief({ company, documents, claims, composed, asOf, cost, generatedAt }),
  };
}

// ── the two calls ─────────────────────────────────────────────────────────────────────────────

type ExtractOutcome =
  | { ok: true; claims: ReturnType<typeof extractResponseSchema.parse>["claims"] }
  | { ok: false; status: number; error: string };

async function extractOnce(ai: GoogleGenAI, request: string): Promise<ExtractOutcome> {
  const text = await call(ai, EXTRACT_SYSTEM_PROMPT, request, EXTRACT_RESPONSE_SCHEMA);
  if (!text.ok) return text;

  const parsed = extractResponseSchema.safeParse(text.json);
  if (!parsed.success) {
    return { ok: false, status: 502, error: `Extraction did not match the schema: ${parsed.error.message}` };
  }
  return { ok: true, claims: parsed.data.claims };
}

type ComposeOutcome =
  | { ok: true; sentences: ComposedSentence[] }
  | { ok: false; status: number; error: string };

async function composeOnce(ai: GoogleGenAI, request: string): Promise<ComposeOutcome> {
  const text = await call(ai, COMPOSE_SYSTEM_PROMPT, request, COMPOSE_RESPONSE_SCHEMA);
  if (!text.ok) return text;

  const parsed = composeResponseSchema.safeParse(text.json);
  if (!parsed.success) {
    return { ok: false, status: 502, error: `Composition did not match the schema: ${parsed.error.message}` };
  }
  return { ok: true, sentences: parsed.data.sentences };
}

/**
 * Backoff for the free tier's per-minute quota only.
 *
 * Generating all ten fixtures is ~140 calls, which will hit a per-minute limit on any free key. A
 * quota refusal is not a failure of the request, so it is retried; a schema error or a bad key is,
 * and is returned immediately. Waiting on the wrong class of error would turn a typo in an API key
 * into a two-minute hang.
 */
const QUOTA_BACKOFF_MS = [2_000, 10_000, 30_000];

function isQuotaError(message: string): boolean {
  return /429|RESOURCE_EXHAUSTED|rate limit|quota|503|UNAVAILABLE|overloaded/i.test(message);
}

async function call(
  ai: GoogleGenAI,
  systemInstruction: string,
  contents: string,
  responseSchema: object,
): Promise<{ ok: true; json: unknown } | { ok: false; status: number; error: string }> {
  let text: string | undefined;
  let lastError = "unknown error";

  for (let attempt = 0; attempt <= QUOTA_BACKOFF_MS.length; attempt += 1) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
          // Not for quality: for reproducibility. The fixtures' `inputs_hash` and the eval scoreboard
          // are only meaningful if the same inputs produce the same output.
          temperature: 0,
          // Constrained extraction against a fixed schema, not reasoning. Day 001 measured this
          // taking thought tokens to zero, and the free tier's per-minute quota is what limits the
          // live demo.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
        },
      });
      text = response.text;
      break;
    } catch (cause) {
      lastError = cause instanceof Error ? cause.message : "unknown error";
      const wait = QUOTA_BACKOFF_MS[attempt];
      if (!isQuotaError(lastError) || wait === undefined) {
        return { ok: false, status: 502, error: `The model call failed: ${lastError}` };
      }
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  if (text === undefined) {
    return { ok: false, status: 502, error: `The model call failed after retries: ${lastError}` };
  }
  if (!text) return { ok: false, status: 502, error: "The model returned an empty response." };

  try {
    return { ok: true, json: JSON.parse(text) };
  } catch {
    return { ok: false, status: 502, error: "The model returned something that is not JSON." };
  }
}

// ── model output → engine input ───────────────────────────────────────────────────────────────

/**
 * The subject the model named becomes an id here, and the engine — not the model — decides whether
 * that id is the company being briefed.
 *
 * Anything that is not recognisably this company becomes a slug, which `resolveClaims` rejects as
 * `wrong_company`. That asymmetry is the point: a model that says "Zafira Sheets" gets its claim
 * dropped, and a model that lies and says "Sparkfold" about a Zafira sentence still has to produce a
 * Sparkfold-supporting quote, which the gate then fails to find.
 */
export function subjectIdFor(subject: string, company: Company): string {
  const folded = subject.trim().toLowerCase();
  const name = company.name.toLowerCase();
  const bare = company.domain.replace(/\.example$/, "").toLowerCase();

  const isSelf =
    folded === name ||
    folded === bare ||
    folded === company.domain.toLowerCase() ||
    folded === "the company" ||
    folded === "itself" ||
    // "Ledgerloop Inc.", "Cadence Freight (the company)" — a prefix match on the registered name is
    // safe; a substring match anywhere is not, because "not Ledgerloop" contains "Ledgerloop".
    folded.startsWith(`${name} `) ||
    folded.startsWith(`${name},`);

  return isSelf ? company.id : `other:${folded.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function toClaims(
  raw: ReturnType<typeof extractResponseSchema.parse>["claims"],
  company: Company,
  documents: readonly SourceDocument[],
  suffix = "",
): Claim[] {
  const byId = new Map(documents.map((document) => [document.id, document]));

  return raw.map((entry, index) => {
    const document = byId.get(entry.document_id);

    return {
      id: `${entry.document_id}-${entry.question_id}-${suffix}${String(index).padStart(2, "0")}`,
      question_id: entry.question_id,
      assertion: entry.assertion,
      quote: entry.quote,
      span: null,
      document_id: entry.document_id,
      subject_company_id: subjectIdFor(entry.subject, company),
      kind: entry.kind,
      stance: entry.stance,
      value:
        entry.kind === "number" &&
        typeof entry.value_n === "number" &&
        typeof entry.value_unit === "string" &&
        entry.value_unit.length > 0
          ? { n: entry.value_n, unit: entry.value_unit }
          : null,
      /*
       * The named document's date, never today. A claim is as old as the page it came from.
       *
       * An invented document id has no date, and dating it to the as-of would make a fabricated
       * citation look maximally fresh. It gets the epoch instead, which is past every horizon — so
       * even in the impossible case where such a claim resolved, staleness would kill it. The
       * expected path is that `resolveClaims` rejects it as `quote_not_found` first.
       */
      observed_at: document ? document.published_at ?? document.retrieved_at : "1970-01-01",
    };
  });
}
