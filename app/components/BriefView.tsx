import Link from "next/link";

import { INFERRED_QUESTION, SECTIONS, questionById } from "@/lib/brief/questions";
import type { Brief, Claim, SourceDocument } from "@/lib/brief/types";

import { Badge, Empty, SectionLabel } from "./ui";

/**
 * The brief itself.
 *
 * Every sentence renders its citations as links that select a claim, which opens the source pane on
 * the exact character span. That is the whole argument of the project expressed as an affordance: a
 * citation here is a character range, not a footnote, and a reader can check any sentence in one
 * click.
 *
 * The other three affordances are the ones every other brief tool leaves out — `conflicting` where
 * sources disagree, `as of` where a source is aging, and `inference` on the one section that reasons
 * rather than cites.
 */
export function BriefView({
  brief,
  documents,
  selectedClaimId,
  href,
}: {
  brief: Brief;
  documents: readonly SourceDocument[];
  selectedClaimId: string | null;
  href: (params: { claim?: string; tab?: string }) => string;
}) {
  const claimById = new Map(brief.claims.map((claim) => [claim.id, claim]));
  const documentById = new Map(documents.map((document) => [document.id, document]));

  return (
    <div className="space-y-8">
      {brief.conflicts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/5">
          <SectionLabel>Unresolved disagreements</SectionLabel>
          <ul className="mt-2 space-y-2 text-sm">
            {brief.conflicts.map((conflict) => {
              const members = conflict.claim_ids
                .map((id) => claimById.get(id))
                .filter((claim): claim is Claim => claim !== undefined)
                .sort((a, b) => a.observed_at.localeCompare(b.observed_at));

              return (
                <li key={`${conflict.question_id}-${conflict.unit}`}>
                  <span className="font-medium">{questionById(conflict.question_id).label}</span>{" "}
                  <span className="text-neutral-600 dark:text-neutral-400">
                    {members.map((claim, index) => (
                      <span key={claim.id}>
                        {index > 0 && " vs "}
                        <Link
                          href={href({ claim: claim.id, tab: "sources" })}
                          className="underline decoration-dotted underline-offset-2 hover:decoration-solid"
                        >
                          {claim.value?.n.toLocaleString() ?? "?"} {conflict.unit}
                        </Link>{" "}
                        <span className="text-neutral-500">({claim.observed_at})</span>
                      </span>
                    ))}
                  </span>
                  <p className="mt-0.5 text-[11px] text-neutral-500">
                    Not resolved. The sources disagree and the tool has no basis for choosing;
                    recency is shown, not applied.
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {SECTIONS.map((section) => {
        const entry = brief.sections.find((candidate) => candidate.section === section.id);
        if (!entry) return null;

        return (
          <section key={section.id} className="space-y-4">
            <SectionLabel>{section.label}</SectionLabel>

            <div className="space-y-5">
              {entry.questions.map((question) => {
                const spec = questionById(question.question_id);

                return (
                  <div key={question.question_id}>
                    <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {spec.label}
                      {question.question_id === INFERRED_QUESTION && (
                        <span className="ml-2 align-middle">
                          <Badge tone="info" title="Reasoned over the cited claims rather than quoted from a document">
                            inference
                          </Badge>
                        </span>
                      )}
                    </h3>

                    {question.sentences.length === 0 ? (
                      <div className="mt-1">
                        <Empty>
                          Not answerable from available sources
                          {question.unanswerable && question.unanswerable.missing_kinds.length > 0
                            ? ` — no ${question.unanswerable.missing_kinds.join(" or ")} document`
                            : ""}
                          .
                        </Empty>
                        {question.unanswerable?.reason === "no_surviving_claims" && (
                          <p className="mt-0.5 text-[11px] text-neutral-500">
                            Sources existed for this question; nothing extracted from them survived the
                            gate.
                          </p>
                        )}
                      </div>
                    ) : (
                      <ul className="mt-1.5 space-y-2">
                        {question.sentences.map((sentence, index) => {
                          const cited = sentence.claim_ids
                            .map((id) => claimById.get(id))
                            .filter((claim): claim is Claim => claim !== undefined);

                          return (
                            <li
                              key={`${question.question_id}-${index}`}
                              className="text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200"
                            >
                              <span>{sentence.text}</span>{" "}
                              <span className="whitespace-nowrap">
                                {cited.map((claim) => {
                                  const document = documentById.get(claim.document_id);
                                  const selected = claim.id === selectedClaimId;

                                  return (
                                    <Link
                                      key={claim.id}
                                      href={`${href({ claim: claim.id, tab: "sources" })}#span-${claim.id}`}
                                      title={`${document?.title ?? claim.document_id} — ${document?.kind ?? "document"}, ${claim.observed_at}. Click to see the exact span.`}
                                      className={`mx-px rounded px-1 align-super text-[10px] font-semibold tabular-nums transition-colors ${
                                        selected
                                          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                                          : "bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700"
                                      }`}
                                    >
                                      {document?.kind.replace(/_/g, " ") ?? "source"}
                                    </Link>
                                  );
                                })}
                              </span>
                              {(sentence.conflicting || sentence.as_of || sentence.repaired) && (
                                <span className="ml-1.5 inline-flex gap-1 align-middle">
                                  {sentence.conflicting && <Badge tone="warn">conflicting</Badge>}
                                  {sentence.as_of && (
                                    <Badge
                                      tone="warn"
                                      title={`The oldest source behind this sentence is dated ${sentence.as_of}, past this question's freshness budget.`}
                                    >
                                      aging
                                    </Badge>
                                  )}
                                  {sentence.repaired && (
                                    <Badge
                                      tone="neutral"
                                      title="The model wrote this as a plain assertion. Its only sources are the company describing itself, so the engine restored the attribution."
                                    >
                                      attribution repaired
                                    </Badge>
                                  )}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
