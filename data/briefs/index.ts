/**
 * Which companies have a committed brief — written by `scripts/generate-briefs.mts`, committed.
 *
 * A directory listing would be simpler and does not survive bundling: `data/briefs/*.json` has to be
 * statically importable for Next to include it, so the set of fixtures is a source file rather than a
 * filesystem read. Keeping it committed also means "nine companies are not generated yet" is a fact in
 * the diff instead of a surprise at runtime.
 *
 * Regenerate with `npm run generate:briefs`. Do not hand-edit.
 */

export const FIXTURES: Readonly<Record<string, unknown>> = {};
