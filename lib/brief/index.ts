import { bindSentences, filterForwardLookingFromChange } from "./compose";
import { conflictedClaimIds, detectConflicts } from "./conflict";
import { coverageOf, planRouting } from "./coverage";
import { QUESTIONS, SECTIONS, missingKinds, questionById } from "./questions";
import { resolveClaims } from "./resolve";
import { dropStale } from "./stale";
import type {
  Brief,
  BriefSection,
  Claim,
  Company,
  ComposedSentence,
  Cost,
  Iso,
  QuestionId,
  Rejection,
  Sentence,
  SourceDocument,
} from "./types";

/**
 * `buildBrief` — the engine's only exported function, and the only way a claim becomes a sentence.
 *
 * Everything the model produced arrives here as data: `claims` are assertions about what documents
 * contain, `composed` are candidate sentences. Neither is trusted. In order, this function resolves
 * every quote to a character span, throws away claims about other companies, throws away plans
 * masquerading as changes, throws away claims whose sources are too old to stand behind, finds the
 * disagreements and refuses to settle them, repairs the verbs the model dropped, and drops any
 * sentence left citing nothing.
 *
 * Both directions of the pipeline are deliberate. There is no argument by which a sentence can enter
 * a `Brief` without passing `resolveClaims` — not a flag, not an option, not a second entry point —
 * because `lib/brief/` cannot import a model client and this is the only function that assembles a
 * `Brief`. Day 007 `why-now` consumes this one call.
 *
 * Note the deviation from PLAN.md, which listed the signature as
 * `buildBrief({ company, documents, claims, asOf })`. `composed` has to be an input too: the
 * sentences come from a model, and the alternative — calling one from in here — is exactly the
 * coupling the purity rule exists to forbid.
 */
export interface BuildBriefInput {
  company: Company;
  documents: readonly SourceDocument[];
  /** Raw extraction output. Spans are ignored if present; they are recomputed here. */
  claims: readonly Claim[];
  /** Raw composition output. */
  composed: readonly ComposedSentence[];
  asOf: Iso;
  /** Call accounting from the generation pass. `null` when re-deriving from a fixture. */
  cost?: Cost | null;
  /** Fixed so a rebuild of the same inputs is byte-identical. Defaults to `asOf`. */
  generatedAt?: Iso;
}

export function buildBrief({
  company,
  documents,
  claims,
  composed,
  asOf,
  cost = null,
  generatedAt,
}: BuildBriefInput): Brief {
  const rejected: Rejection[] = [];

  // 1. What could never be answered. Known from the corpus alone, before a token is spent.
  const plan = planRouting(documents);
  rejected.push(...plan.rejections);

  // 2. The gate. Quotes are checked against documents; subjects are checked against the company.
  const gated = resolveClaims({ claims, documents, company_id: company.id });
  rejected.push(...gated.rejected);

  // 3. A plan is not a change.
  const modality = filterForwardLookingFromChange(gated.resolved);
  rejected.push(...modality.rejected);

  // 4. Sources too old to stand behind, and `as of` labels for the ones that are merely aging.
  const freshness = dropStale(modality.kept, asOf);
  rejected.push(...freshness.rejected);

  const surviving = freshness.kept;

  // 5. Disagreements, found and left unresolved.
  const conflicts = detectConflicts(surviving);

  // 6. Bind text to evidence, repair the verbs, drop anything citing nothing.
  const bound = bindSentences({
    composed,
    surviving,
    conflicted: conflictedClaimIds(conflicts),
    asOfLabels: freshness.asOfLabels,
  });
  rejected.push(...bound.rejected);

  // 7. Lay out the sections, enforcing the per-question cap out loud.
  const { sections, answered, capRejections } = layOut(bound.sentences, documents, plan);
  rejected.push(...capRejections);

  return {
    company,
    sections,
    claims: surviving,
    conflicts,
    rejected,
    coverage: coverageOf(plan, answered),
    as_of: asOf,
    generated_at: generatedAt ?? asOf,
    cost,
  };
}

function layOut(
  sentences: readonly Sentence[],
  documents: readonly SourceDocument[],
  plan: ReturnType<typeof planRouting>,
): { sections: BriefSection[]; answered: QuestionId[]; capRejections: Rejection[] } {
  const unroutable = new Set(plan.unroutable.map((entry) => entry.question_id));
  const byQuestion = new Map<QuestionId, Sentence[]>();
  for (const question of QUESTIONS) byQuestion.set(question.id, []);

  for (const sentence of sentences) {
    // Bucketed by the question the compose call answered. A cited claim belonging to a different
    // question is not a reason to discard the sentence — the Approach section legitimately cites
    // across all of them — and what matters, that it cites something which survived, is settled.
    byQuestion.get(sentence.question_id)?.push(sentence);
  }

  const capRejections: Rejection[] = [];
  const answered: QuestionId[] = [];

  const sections = SECTIONS.map((section) => ({
    section: section.id,
    questions: QUESTIONS.filter((question) => question.section === section.id).map((question) => {
      const all = byQuestion.get(question.id) ?? [];
      const kept = all.slice(0, question.max_sentences);

      for (const dropped of all.slice(question.max_sentences)) {
        capRejections.push({
          reason: "over_question_cap",
          detail: `"${question.label}" renders at most ${question.max_sentences} sentences; this one was supported but did not fit.`,
          sentence_text: dropped.text,
          question_id: question.id,
        });
      }

      if (kept.length > 0) answered.push(question.id);

      return {
        question_id: question.id,
        sentences: kept,
        unanswerable:
          kept.length > 0
            ? null
            : {
                missing_kinds: missingKinds(questionById(question.id), documents),
                reason: unroutable.has(question.id)
                  ? ("unroutable" as const)
                  : ("no_surviving_claims" as const),
              },
      };
    }),
  }));

  return { sections, answered, capRejections };
}

export type { Brief } from "./types";
