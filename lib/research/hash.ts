import { createHash } from "node:crypto";

import { QUESTIONS } from "@/lib/brief/questions";
import type { SourceDocument } from "@/lib/brief/types";

import { MODEL } from "./generate";
import { PROMPT_VERSION } from "./prompts";

/**
 * `inputs_hash` — what makes a committed fixture honest.
 *
 * A cached brief is only evidence if it corresponds to the corpus, the questions, the prompts and the
 * model that produced it. Edit a document's text and the old brief is quoting something that no
 * longer exists; edit a prompt and the brief was generated under different instructions. Both are
 * silent failures — the app still renders, the citations still look fine, and the repo is lying.
 *
 * So every input that could change the output goes into a hash, `data/briefs.ts` recomputes it at
 * import time, and a mismatch fails the build. Regeneration is the only way to clear it.
 *
 * This lives in `lib/research/` because it needs `node:crypto`, and `lib/brief/` may not import it.
 * That boundary is doing real work here: hashing is a property of the *generation pass*, not of the
 * engine, and a pure function should not know what a fixture is.
 */

export const SCHEMA_VERSION = 3;

export function hashInputs(documents: readonly SourceDocument[], asOf: string): string {
  const canonical = JSON.stringify({
    schema_version: SCHEMA_VERSION,
    prompt_version: PROMPT_VERSION,
    model: MODEL,
    as_of: asOf,
    // Sorted, so a reordered corpus file is not a different input.
    documents: [...documents]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((document) => ({
        id: document.id,
        kind: document.kind,
        published_at: document.published_at,
        text: document.text,
      })),
    questions: QUESTIONS.map((question) => ({
      id: question.id,
      section: question.section,
      seek: question.seek,
      answerable_from: question.answerable_from,
      freshness_days: question.freshness_days,
      max_sentences: question.max_sentences,
    })),
  });

  return createHash("sha256").update(canonical).digest("hex").slice(0, 32);
}
