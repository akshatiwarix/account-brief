import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { COMPANIES, DEFAULT_AS_OF, documentsFor } from "@/data/corpus";
import { generateBrief } from "@/lib/research/generate";
import { SCHEMA_VERSION, hashInputs } from "@/lib/research/hash";
import { countByReason } from "@/lib/brief/render";

/**
 * The only writer of `data/briefs/*.json`.
 *
 * Run with a key to regenerate every committed fixture, or one company at a time:
 *
 *   npm run generate:briefs
 *   npm run generate:briefs -- c02
 *
 * Each fixture carries the `inputs_hash` of the corpus, questions, prompts and model that produced
 * it, so `data/briefs.ts` can refuse to serve a brief whose inputs have moved.
 *
 * What it prints is as much the point as what it writes: claims returned, claims surviving, and the
 * rejection count by reason. That is the number the README quotes, and it has to come from a run
 * rather than from a hope.
 */

const OUT_DIR = join(process.cwd(), "data", "briefs");

function loadKey(): string | undefined {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  // `vite-node` does not read .env.local the way `next dev` does, and asking the user to export a
  // variable that already exists in the repo is a worse experience than reading the file.
  try {
    const file = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    return /^GEMINI_API_KEY=(.+)$/m.exec(file)?.[1]?.trim();
  } catch {
    return undefined;
  }
}

const apiKey = loadKey();
if (!apiKey) {
  console.error(
    "No GEMINI_API_KEY. Set it in the environment or in .env.local — this script is the only path that spends quota.",
  );
  process.exit(1);
}

const only = process.argv.slice(2).filter((argument) => /^c\d{2}$/.test(argument));
const targets = only.length > 0 ? COMPANIES.filter((company) => only.includes(company.id)) : COMPANIES;

mkdirSync(OUT_DIR, { recursive: true });

let totalReturned = 0;
let totalSurviving = 0;
const totalsByReason = new Map<string, number>();

for (const company of targets) {
  const documents = documentsFor(company.id);
  process.stdout.write(`${company.id} ${company.name} — ${documents.length} documents … `);

  const result = await generateBrief({
    company,
    documents,
    apiKey,
    asOf: DEFAULT_AS_OF,
    // Pinned to the as-of rather than to now, so regenerating an unchanged company produces an
    // identical file and shows up as no diff.
    generatedAt: DEFAULT_AS_OF,
  });

  if (!result.ok) {
    console.error(`\n  failed (${result.status}): ${result.error}`);
    process.exit(1);
  }

  const brief = result.brief;
  const fixture = {
    inputs_hash: hashInputs(documents, DEFAULT_AS_OF),
    schema_version: SCHEMA_VERSION,
    brief,
  };

  writeFileSync(join(OUT_DIR, `${company.id}.json`), `${JSON.stringify(fixture, null, 2)}\n`);

  const cost = brief.cost;
  totalReturned += cost?.claims_returned ?? 0;
  totalSurviving += cost?.claims_surviving ?? 0;
  for (const [reason, count] of countByReason(brief)) {
    totalsByReason.set(reason, (totalsByReason.get(reason) ?? 0) + count);
  }

  console.log(
    `${cost?.claims_returned ?? 0} claims → ${cost?.claims_surviving ?? 0} surviving · ` +
      `${brief.coverage.answered}/${brief.coverage.total} answered · ` +
      `${cost?.extract_calls ?? 0} extract (+${cost?.retry_calls ?? 0} retry) · ` +
      `${brief.rejected.length} rejected`,
  );
}

writeIndex();

const rate = totalReturned === 0 ? 0 : 1 - totalSurviving / totalReturned;
console.log("\n— totals —");
console.log(`claims returned by the model: ${totalReturned}`);
console.log(`claims that survived the gate: ${totalSurviving}`);
console.log(`gate rejection rate: ${(rate * 100).toFixed(1)}%`);
for (const [reason, count] of [...totalsByReason.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${count} × ${reason}`);
}

/**
 * Rewrite `data/briefs/index.ts` from whatever fixtures are on disk.
 *
 * The set of committed briefs has to be statically importable to survive bundling, so it is a source
 * file rather than a directory read. Rewriting it here — from the directory, not from this run's
 * targets — is what lets a partial generation be committed truthfully: generate five companies today
 * and the index names five.
 */
function writeIndex(): void {
  const present = readdirSync(OUT_DIR)
    .filter((entry) => /^c\d{2}\.json$/.test(entry))
    .map((entry) => entry.replace(/\.json$/, ""))
    .sort();

  const imports = present.map((id) => `import ${id} from "./${id}.json";`).join("\n");
  const entries = present.map((id) => `  ${id},`).join("\n");

  const body = `/**
 * Which companies have a committed brief — written by \`scripts/generate-briefs.mts\`, committed.
 *
 * A directory listing would be simpler and does not survive bundling: \`data/briefs/*.json\` has to be
 * statically importable for Next to include it, so the set of fixtures is a source file rather than a
 * filesystem read. Keeping it committed also means "these companies are not generated yet" is a fact
 * in the diff instead of a surprise at runtime.
 *
 * Regenerate with \`npm run generate:briefs\`. Do not hand-edit.
 */
${imports ? `\n${imports}\n` : ""}
export const FIXTURES: Readonly<Record<string, unknown>> = {${
    entries ? `\n${entries}\n` : ""
  }};
`;

  writeFileSync(join(OUT_DIR, "index.ts"), body);
  console.log(`\nindex: ${present.length}/10 companies generated${present.length < 10 ? ` (${present.join(", ")})` : ""}`);
}
