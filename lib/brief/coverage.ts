import { QUESTIONS, missingKinds, routeDocuments } from "./questions";
import type { Coverage, DocumentKind, QuestionId, Rejection, SourceDocument } from "./types";

/**
 * Coverage, computed twice — before spending anything, and after.
 *
 * `routable` is known from the corpus alone: a question whose answering document kinds are all absent
 * cannot be answered, and no model call will change that. Rejecting it up front means gaps cost zero
 * tokens and, more importantly, that the gap is a *computed* fact rather than something noticed
 * afterwards by reading a thin brief.
 *
 * `answered` is what actually rendered. The distance between the two numbers is the honest part: it
 * says "we had sources for eleven questions and could only support nine sentences", which is a
 * different and more interesting statement than either number alone.
 */

export interface RoutingPlan {
  /** Questions with at least one document of an answering kind. */
  routable: QuestionId[];
  /** Questions with none, and what was missing. */
  unroutable: { question_id: QuestionId; missing_kinds: DocumentKind[] }[];
  rejections: Rejection[];
}

export function planRouting(documents: readonly SourceDocument[]): RoutingPlan {
  const routable: QuestionId[] = [];
  const unroutable: { question_id: QuestionId; missing_kinds: DocumentKind[] }[] = [];
  const rejections: Rejection[] = [];

  for (const question of QUESTIONS) {
    // The inferred question routes to no documents by design; it is answerable whenever anything
    // else survived, so it is never counted as unroutable.
    if (question.answerable_from.length === 0) {
      routable.push(question.id);
      continue;
    }

    if (routeDocuments(question, documents).length > 0) {
      routable.push(question.id);
      continue;
    }

    const missing = missingKinds(question, documents);
    unroutable.push({ question_id: question.id, missing_kinds: missing });
    rejections.push({
      reason: "unroutable",
      detail: `No ${missing.join(" or ")} document for this company, so "${question.label}" was never sent to a model.`,
      question_id: question.id,
    });
  }

  return { routable, unroutable, rejections };
}

export function coverageOf(plan: RoutingPlan, answeredQuestions: readonly QuestionId[]): Coverage {
  return {
    routable: plan.routable.length,
    answered: new Set(answeredQuestions).size,
    total: QUESTIONS.length,
  };
}
