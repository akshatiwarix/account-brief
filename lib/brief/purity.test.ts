import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The load-bearing constraint of this codebase: `lib/brief/**` imports nothing non-relative. Not
 * `next`, not `react`, not `zod`, not `@google/genai`, not `@/data`.
 *
 * In Days 001–005 this rule bought testability and portability. Here it buys something stronger:
 * **a module that cannot import a model client cannot generate a claim.** The gate is unbypassable
 * because the only way a claim enters `lib/brief/` is as a function argument that has already been
 * through `resolve.ts`. Widening this rule would reopen that path, so there is no allowlist —
 * if the engine needs a package, the code belongs in `lib/research/` or a route handler.
 *
 * Test files are excluded from the scan: they import `vitest` and `node:fs`, and they do not ship.
 */

const ENGINE_DIR = join(process.cwd(), "lib", "brief");

/** `import … from "x"`, `export … from "x"`, `import("x")`, and bare `import "x"`. */
const SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(?\s*)["']([^"']+)["']/g;

function sourceFiles(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      found.push(...sourceFiles(path));
      continue;
    }
    if (!entry.endsWith(".ts")) continue;
    if (entry.endsWith(".test.ts")) continue;
    found.push(path);
  }
  return found;
}

function specifiersIn(source: string): string[] {
  const withoutBlockComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  const withoutLineComments = withoutBlockComments.replace(/^\s*\/\/.*$/gm, "");
  return [...withoutLineComments.matchAll(SPECIFIER)].map((match) => match[1] ?? "");
}

describe("engine purity", () => {
  const files = sourceFiles(ENGINE_DIR);

  it("finds engine source to scan", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files.map((file) => [file.slice(process.cwd().length + 1), file] as const))(
    "%s imports only relative paths",
    (_label, file) => {
      const offenders = specifiersIn(readFileSync(file, "utf8")).filter(
        (specifier) => !specifier.startsWith("."),
      );
      expect(offenders).toEqual([]);
    },
  );
});
