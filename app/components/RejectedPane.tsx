import { countByReason } from "@/lib/brief/render";
import type { Brief, RejectionReason } from "@/lib/brief/types";

import { Badge, SectionLabel } from "./ui";

/**
 * What did not make it, grouped by reason.
 *
 * This pane is worth more than the brief. A brief with no rejected pane is indistinguishable from a
 * brief produced by a model that was simply asked to be careful — the only way to show that a gate
 * exists is to show what it caught. So an empty pane says "nothing was rejected for this company"
 * rather than disappearing, because that is information too.
 */
const EXPLANATIONS: Record<RejectionReason, string> = {
  quote_not_found:
    "The model's quote was not a contiguous run of the document it named. Paraphrase, re-punctuation, or text stitched across a gap.",
  quote_not_found_after_retry:
    "Still not found after one retry that echoed the failing quotes back verbatim. The claim is dropped.",
  wrong_company:
    "The quote resolved, but the claim is about a different company. Span verification alone cannot catch this.",
  stale: "The source is past three times its question's freshness budget.",
  unroutable:
    "No document of a kind that could answer this question. Rejected before any model call, so it cost nothing.",
  no_surviving_citation:
    "A composed sentence whose every citation had already been rejected. This is the hallucination the project exists to stop.",
  forward_looking_in_change_section:
    "A stated intention cannot answer what changed recently. Filtered before composition, not after.",
  over_question_cap:
    "Supported, but past the question's sentence limit. Recorded rather than silently truncated.",
};

export function RejectedPane({ brief }: { brief: Brief }) {
  const counts = countByReason(brief);

  if (brief.rejected.length === 0) {
    return (
      <div className="space-y-2 p-4">
        <SectionLabel>Rejected</SectionLabel>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Nothing was rejected for this company. Every question routed, every quote resolved, and every
          composed sentence kept a citation.
        </p>
      </div>
    );
  }

  const grouped = new Map<RejectionReason, typeof brief.rejected>();
  for (const rejection of brief.rejected) {
    const list = grouped.get(rejection.reason) ?? [];
    list.push(rejection);
    grouped.set(rejection.reason, list);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <SectionLabel>Rejected — {brief.rejected.length}</SectionLabel>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {counts.map(([reason, count]) => (
            <Badge key={reason} tone={toneFor(reason as RejectionReason)}>
              {count} × {reason.replace(/_/g, " ")}
            </Badge>
          ))}
        </div>
        {brief.cost && (
          <p className="mt-2 text-[11px] text-neutral-500">
            {brief.cost.claims_returned} claims returned by the model, {brief.cost.claims_surviving}{" "}
            survived · {brief.cost.extract_calls} extract call
            {brief.cost.extract_calls === 1 ? "" : "s"}
            {brief.cost.retry_calls > 0 ? ` (+${brief.cost.retry_calls} retry)` : ""} ·{" "}
            {brief.cost.compose_calls} compose
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        {[...grouped.entries()].map(([reason, rejections]) => (
          <div key={reason}>
            <h3 className="font-mono text-[11px] font-semibold text-neutral-800 dark:text-neutral-200">
              {reason} <span className="text-neutral-500">({rejections.length})</span>
            </h3>
            <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
              {EXPLANATIONS[reason]}
            </p>

            <ul className="mt-2 space-y-2">
              {rejections.map((rejection, index) => (
                <li
                  key={`${reason}-${index}`}
                  className="rounded border border-neutral-200 p-2 text-[11px] dark:border-neutral-800"
                >
                  <p className="text-neutral-700 dark:text-neutral-300">{rejection.detail}</p>
                  {rejection.claim && (
                    <p className="mt-1 font-mono text-neutral-500">
                      {rejection.claim.document_id} · {rejection.claim.question_id}
                      {rejection.claim.quote && (
                        <>
                          {" · "}
                          <span className="italic">
                            &ldquo;{truncate(rejection.claim.quote)}&rdquo;
                          </span>
                        </>
                      )}
                    </p>
                  )}
                  {rejection.sentence_text && (
                    <p className="mt-1 italic text-neutral-500">
                      dropped sentence: &ldquo;{truncate(rejection.sentence_text)}&rdquo;
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function toneFor(reason: RejectionReason): "bad" | "warn" | "neutral" {
  if (reason === "quote_not_found_after_retry" || reason === "wrong_company") return "bad";
  if (reason === "quote_not_found" || reason === "no_surviving_citation") return "warn";
  return "neutral";
}

function truncate(text: string): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 140 ? `${flat.slice(0, 137)}…` : flat;
}
