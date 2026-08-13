import type { Brief } from "@/lib/brief/types";
import { SCHEMA_VERSION, hashInputs } from "@/lib/research/hash";

import { FIXTURES } from "./briefs/index";
import { documentsFor } from "./corpus";
import { fixtureSchema } from "./schema";

/**
 * The committed briefs, validated and hash-checked at import time.
 *
 * This is what makes the demo keyless: a visitor with no API key sees ten complete briefs, every
 * rejected pane, every conflict and both exports. Without it, "a research tool" with no key can only
 * show an empty state, which is not a demonstration of anything.
 *
 * A cached artifact is only honest if it still corresponds to its inputs. Edit a corpus document or a
 * prompt without regenerating and the brief is quoting text that no longer exists — the app still
 * renders, the citations still look plausible, and the repo is lying. So the hash is recomputed here,
 * at import, and a mismatch throws during the build rather than serving a stale page.
 *
 * `npm run generate:briefs` is the only way to clear it.
 *
 * **The set may be partial**, and which companies are in it lives in `data/briefs/index.ts`, written
 * by the generation script and committed. A company with no fixture renders as "no cached brief"
 * naming the reason — deliberately, rather than being hidden from the picker. The free tier for this
 * model allows 20 requests per day, so a full ten-company generation is a day's entire quota and the
 * repo has to be able to ship honestly half-generated.
 */

function load(): Map<string, Brief> {
  const loaded = new Map<string, Brief>();

  for (const [companyId, raw] of Object.entries(FIXTURES)) {
    const parsed = fixtureSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(
        `data/briefs/${companyId}.json does not match the fixture schema. Regenerate with \`npm run generate:briefs -- ${companyId}\`.\n${parsed.error.message}`,
      );
    }

    const fixture = parsed.data;

    if (fixture.schema_version !== SCHEMA_VERSION) {
      throw new Error(
        `data/briefs/${companyId}.json was generated against schema version ${fixture.schema_version}; this build expects ${SCHEMA_VERSION}. Regenerate it.`,
      );
    }

    const expected = hashInputs(documentsFor(companyId), fixture.brief.as_of);
    if (fixture.inputs_hash !== expected) {
      throw new Error(
        `data/briefs/${companyId}.json is stale: its inputs_hash is ${fixture.inputs_hash}, but the corpus, questions, prompts and model now hash to ${expected}. Regenerate with \`npm run generate:briefs -- ${companyId}\`.`,
      );
    }

    // The Zod shape is structurally identical to `Brief`; the cast is the one place the two meet.
    loaded.set(companyId, fixture.brief as unknown as Brief);
  }

  return loaded;
}

const BRIEFS = load();

export function briefFor(companyId: string): Brief | undefined {
  return BRIEFS.get(companyId);
}

export function allBriefs(): Brief[] {
  return [...BRIEFS.values()];
}

/** Which companies have a cached brief. The UI shows the rest as ungenerated rather than hiding them. */
export function generatedCompanyIds(): string[] {
  return [...BRIEFS.keys()].sort();
}
