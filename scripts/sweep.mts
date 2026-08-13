import { allBriefs, briefFor } from "@/data/briefs";
import { COMPANIES, DEFAULT_AS_OF, documentsFor } from "@/data/corpus";
import { buildBrief } from "@/lib/brief";
import { detectConflicts } from "@/lib/brief/conflict";
import { INFERRED_QUESTION, QUESTIONS, questionById } from "@/lib/brief/questions";
import { findSpan, textAt } from "@/lib/brief/resolve";
import { normalize } from "@/lib/brief/normalize";
import { renderMarkdown } from "@/lib/brief/render";
import { freshnessOf } from "@/lib/brief/stale";
import { hashInputs } from "@/lib/research/hash";
import type { Brief, SourceDocument } from "@/lib/brief/types";

/**
 * The invariant sweep: every company × every question, over the committed fixtures.
 *
 * No network, no key, deterministic. Days 004 and 005 each had a sweep find real bugs that the unit
 * tests missed, because a unit test asserts what you thought to check on data you chose, and a sweep
 * asserts a property over everything that shipped.
 *
 * The first assertion is the one the project lives or dies on: **no rendered sentence exists without
 * a surviving claim behind it.** Everything else is a fence around it.
 *
 * Run: `npm run sweep`
 */

let checks = 0;
const failures: string[] = [];
const ungenerated: string[] = [];

function check(condition: boolean, message: string): void {
  checks += 1;
  if (!condition) failures.push(message);
}

function attributionMarkers(text: string): boolean {
  return /\b(positions itself|describes itself|describes its|states that|states it|says that|says it|claims to|claims that|reports|according to|markets itself|advertises|calls itself|its own)\b/i.test(
    text,
  );
}

function forwardMarkers(text: string): boolean {
  return /\b(plans? to|intends? to|expects? to|aims? to|targets|will begin|will open|will launch|intention|subject to)\b/i.test(
    text,
  );
}

for (const company of COMPANIES) {
  const brief = briefFor(company.id);
  const documents = documentsFor(company.id);
  const where = `${company.id}`;

  /*
   * A missing fixture is not a failure. The free tier allows 20 requests per day and a full
   * generation is exactly 20, so the repo ships partially generated and the sweep has to say which
   * companies it could not check rather than refusing to check any. A fixture that EXISTS and is
   * wrong is still a failure.
   */
  if (!brief) {
    ungenerated.push(company.id);
    continue;
  }

  // ── the fixture still describes this corpus ────────────────────────────────────────────────
  check(
    brief.as_of === DEFAULT_AS_OF,
    `${where}: fixture as_of ${brief.as_of} is not the default ${DEFAULT_AS_OF}`,
  );
  check(
    typeof hashInputs(documents, brief.as_of) === "string",
    `${where}: inputs_hash could not be recomputed`,
  );

  const documentById = new Map(documents.map((document) => [document.id, document]));
  const survivingIds = new Set(brief.claims.map((claim) => claim.id));

  // ── every surviving claim re-resolves, independently of the stored span ────────────────────
  for (const claim of brief.claims) {
    const source = documentById.get(claim.document_id);
    check(source !== undefined, `${where}/${claim.id}: cites unknown document ${claim.document_id}`);
    if (!source) continue;

    check(
      claim.subject_company_id === company.id,
      `${where}/${claim.id}: survived with subject ${claim.subject_company_id}`,
    );

    check(claim.span !== null, `${where}/${claim.id}: survived with a null span`);
    if (!claim.span) continue;

    check(
      textAt(source.text, claim.span) === claim.quote,
      `${where}/${claim.id}: stored span does not contain its own quote`,
    );

    // Re-derived from the document, not read back from the fixture.
    const rederived = findSpan(source.text, normalize(source.text), claim.quote);
    check(
      rederived !== null &&
        rederived.start === claim.span.start &&
        rederived.end === claim.span.end,
      `${where}/${claim.id}: re-resolving the quote yields a different span`,
    );

    check(
      freshnessOf(claim, brief.as_of).freshness !== "stale",
      `${where}/${claim.id}: a stale claim survived`,
    );

    check(
      claim.observed_at <= brief.as_of,
      `${where}/${claim.id}: dated ${claim.observed_at}, after the as-of`,
    );

    if (claim.kind === "number" && claim.value) {
      check(
        Number.isFinite(claim.value.n),
        `${where}/${claim.id}: value is not finite (${claim.value.n})`,
      );
    }
  }

  // ── sentences ──────────────────────────────────────────────────────────────────────────────
  const renderedQuestions = new Set<string>();

  for (const section of brief.sections) {
    for (const question of section.questions) {
      const spec = questionById(question.question_id);
      check(
        spec.section === section.section,
        `${where}/${question.question_id}: filed under section ${section.section}, belongs in ${spec.section}`,
      );

      if (question.sentences.length > 0) renderedQuestions.add(question.question_id);

      check(
        question.sentences.length <= spec.max_sentences,
        `${where}/${question.question_id}: ${question.sentences.length} sentences exceeds the cap of ${spec.max_sentences}`,
      );

      check(
        (question.sentences.length === 0) === (question.unanswerable !== null),
        `${where}/${question.question_id}: unanswerable and sentences disagree`,
      );

      if (question.unanswerable) {
        check(
          question.unanswerable.reason === "unroutable" ||
            question.unanswerable.reason === "no_surviving_claims",
          `${where}/${question.question_id}: unknown unanswerable reason`,
        );
      }

      for (const sentence of question.sentences) {
        // THE invariant.
        check(
          sentence.claim_ids.length > 0,
          `${where}/${question.question_id}: a sentence rendered with zero citations`,
        );

        for (const id of sentence.claim_ids) {
          check(
            survivingIds.has(id),
            `${where}/${question.question_id}: cites ${id}, which is not among the surviving claims`,
          );
        }

        const cited = brief.claims.filter((claim) => sentence.claim_ids.includes(claim.id));

        // Company self-description can never render as a bare fact.
        if (sentence.attribution === "company_stated") {
          check(
            attributionMarkers(sentence.text),
            `${where}/${question.question_id}: company-stance sentence has no attribution marker: "${sentence.text}"`,
          );
        }

        // A plan can never render as an event.
        if (sentence.attribution === "forward_looking") {
          check(
            forwardMarkers(sentence.text),
            `${where}/${question.question_id}: forward-looking sentence reads as an event: "${sentence.text}"`,
          );
        }

        if (cited.some((claim) => claim.stance === "company") && !cited.some((claim) => claim.stance !== "company")) {
          check(
            sentence.attribution === "company_stated" || sentence.attribution === "forward_looking",
            `${where}/${question.question_id}: cites only company claims but renders as ${sentence.attribution}`,
          );
        }

        // No plans in the Change section, at all.
        if (spec.section === "change") {
          check(
            cited.every((claim) => claim.kind !== "forward_looking"),
            `${where}/${question.question_id}: a forward-looking claim reached the Change section`,
          );
        }

        check(
          sentence.inferred === (question.question_id === INFERRED_QUESTION),
          `${where}/${question.question_id}: inferred flag disagrees with the question`,
        );

        check(sentence.text.trim().length > 0, `${where}/${question.question_id}: empty sentence`);

        if (sentence.as_of) {
          check(
            sentence.text.startsWith("As of "),
            `${where}/${question.question_id}: carries as_of ${sentence.as_of} without saying so`,
          );
        }
      }
    }
  }

  // ── conflicts are symmetric, unresolved, and re-derivable ──────────────────────────────────
  const rederivedConflicts = detectConflicts(brief.claims);
  check(
    JSON.stringify(rederivedConflicts) === JSON.stringify(brief.conflicts),
    `${where}: conflicts do not re-derive from the surviving claims`,
  );

  for (const conflict of brief.conflicts) {
    check(conflict.claim_ids.length >= 2, `${where}: a conflict with fewer than two members`);
    for (const id of conflict.claim_ids) {
      check(survivingIds.has(id), `${where}: conflict cites ${id}, which did not survive`);
    }
    check(conflict.spread > 0, `${where}: a conflict with no spread`);

    // Every member must still render, or the conflict was resolved by omission.
    const rendered = brief.sections
      .flatMap((section) => section.questions)
      .flatMap((question) => question.sentences)
      .flatMap((sentence) => sentence.claim_ids);
    const shown = conflict.claim_ids.filter((id) => rendered.includes(id));
    check(
      shown.length === conflict.claim_ids.length,
      `${where}: ${conflict.claim_ids.length - shown.length} side(s) of a conflict were not rendered`,
    );
  }

  // ── coverage ───────────────────────────────────────────────────────────────────────────────
  check(
    brief.coverage.total === QUESTIONS.length,
    `${where}: coverage total ${brief.coverage.total} is not ${QUESTIONS.length}`,
  );
  check(
    brief.coverage.answered === renderedQuestions.size,
    `${where}: coverage says ${brief.coverage.answered} answered, ${renderedQuestions.size} questions rendered`,
  );
  check(
    brief.coverage.answered <= brief.coverage.routable,
    `${where}: answered ${brief.coverage.answered} exceeds routable ${brief.coverage.routable}`,
  );

  // ── rejections ─────────────────────────────────────────────────────────────────────────────
  for (const rejection of brief.rejected) {
    check(
      rejection.detail.trim().length > 0,
      `${where}: a ${rejection.reason} rejection with an empty detail`,
    );
    if (rejection.reason === "unroutable") {
      check(
        rejection.question_id !== undefined,
        `${where}: an unroutable rejection without a question`,
      );
    }
  }

  // ── the fixture is what the engine would build from the same inputs ────────────────────────
  const rebuilt = rebuild(brief, documents);
  check(
    JSON.stringify(rebuilt.sections) === JSON.stringify(brief.sections),
    `${where}: rebuilding from the fixture's own claims produces different sections`,
  );

  // ── the export renders, and says what it must ─────────────────────────────────────────────
  const markdown = renderMarkdown(brief, documents);
  check(markdown.includes("# "), `${where}: markdown export has no heading`);
  check(
    markdown.includes("authored and synthetic"),
    `${where}: markdown export omits the synthetic-corpus note`,
  );
  check(!markdown.includes("undefined"), `${where}: markdown export contains "undefined"`);
  check(!markdown.includes("NaN"), `${where}: markdown export contains "NaN"`);

  const serialized = JSON.stringify(brief);
  check(!serialized.includes("null,null"), `${where}: suspicious null run in the fixture`);
  check(!/:\s*NaN/.test(serialized), `${where}: NaN in the fixture`);
}

/**
 * Rebuild a brief from its own surviving claims and rendered sentences.
 *
 * This is the sweep's equivalence check: the stored brief must be exactly what the pure engine
 * produces from the same inputs. If they differ, either the fixture was hand-edited or the engine has
 * changed since it was generated — both of which the `inputs_hash` cannot catch, because neither the
 * corpus nor the prompts moved.
 */
function rebuild(brief: Brief, documents: readonly SourceDocument[]): Brief {
  const composed = brief.sections
    .flatMap((section) => section.questions)
    .flatMap((question) =>
      question.sentences.map((sentence) => ({
        question_id: question.question_id,
        // The stored text carries the engine's own prefixes; strip them so composition is re-derived
        // rather than double-applied.
        text: sentence.text.replace(/^As of [A-Z][a-z]+ \d{4}, /, ""),
        claim_ids: sentence.claim_ids,
      })),
    );

  return buildBrief({
    company: brief.company,
    documents,
    claims: brief.claims,
    composed,
    asOf: brief.as_of,
    cost: brief.cost,
    generatedAt: brief.generated_at,
  });
}

// ── report ────────────────────────────────────────────────────────────────────────────────────

const briefs = allBriefs();
const sentences = briefs.flatMap((brief) =>
  brief.sections.flatMap((section) => section.questions.flatMap((question) => question.sentences)),
);
const claims = briefs.flatMap((brief) => brief.claims);
const returned = briefs.reduce((total, brief) => total + (brief.cost?.claims_returned ?? 0), 0);
const surviving = briefs.reduce((total, brief) => total + (brief.cost?.claims_surviving ?? 0), 0);

console.log(
  `swept ${briefs.length}/${COMPANIES.length} briefs · ${QUESTIONS.length} questions each · ${sentences.length} sentences · ${claims.length} surviving claims`,
);
console.log(`${checks} assertions`);
if (returned > 0) {
  console.log(
    `model returned ${returned} claims, ${surviving} survived the gate — rejection rate ${(
      (1 - surviving / returned) * 100
    ).toFixed(1)}%`,
  );
}
if (ungenerated.length > 0) {
  console.log(
    `\nNOT SWEPT — no committed brief for ${ungenerated.length} companies: ${ungenerated.join(", ")}`,
  );
  console.log(
    "Generate with `npm run generate:briefs -- <id>`. Two model calls per company; the free tier allows 20 requests per day.",
  );
}

if (failures.length > 0) {
  console.error(`\n${failures.length} FAILURES\n`);
  for (const failure of failures.slice(0, 40)) console.error(`  ${failure}`);
  if (failures.length > 40) console.error(`  … and ${failures.length - 40} more`);
  process.exit(1);
}

console.log("clean");
