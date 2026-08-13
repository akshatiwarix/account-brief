import Link from "next/link";

import type { Brief, Claim, SourceDocument } from "@/lib/brief/types";

import { Badge, Empty, SectionLabel } from "./ui";

/**
 * The source pane: a document rendered whole, with the cited span highlighted in place.
 *
 * This is the payoff of storing real character offsets. The highlight is not a search performed in the
 * browser and not a fuzzy re-find — it is `text.slice(0, start)`, `slice(start, end)`, `slice(end)`,
 * computed on the server from the same span the gate produced. If the offsets were wrong, this pane
 * would visibly highlight the wrong words, which is why the round-trip test over every document exists.
 */
export function SourcePane({
  brief,
  documents,
  selectedClaim,
  href,
}: {
  brief: Brief;
  documents: readonly SourceDocument[];
  selectedClaim: Claim | null;
  href: (params: { claim?: string; tab?: string }) => string;
}) {
  const claimsByDocument = new Map<string, Claim[]>();
  for (const claim of brief.claims) {
    const list = claimsByDocument.get(claim.document_id) ?? [];
    list.push(claim);
    claimsByDocument.set(claim.document_id, list);
  }

  const active = selectedClaim
    ? documents.find((document) => document.id === selectedClaim.document_id)
    : undefined;

  if (!active || !selectedClaim) {
    return (
      <div className="space-y-4 p-4">
        <SectionLabel>Sources</SectionLabel>
        <Empty>
          Click any citation in the brief to open its document here, scrolled to the exact characters
          the sentence rests on.
        </Empty>
        <ul className="space-y-1.5">
          {documents.map((document) => {
            const cited = claimsByDocument.get(document.id)?.length ?? 0;
            return (
              <li key={document.id} className="flex items-baseline justify-between gap-3 text-xs">
                <span className="min-w-0">
                  <span className="text-neutral-500">{document.kind.replace(/_/g, " ")}</span>{" "}
                  <span className="truncate">{document.title}</span>
                </span>
                <span className="shrink-0 tabular-nums text-neutral-500">
                  {cited} {cited === 1 ? "claim" : "claims"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  const before = active.text.slice(0, selectedClaim.span!.start);
  const inside = active.text.slice(selectedClaim.span!.start, selectedClaim.span!.end);
  const after = active.text.slice(selectedClaim.span!.end);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SectionLabel>Source</SectionLabel>
            <p className="mt-1 truncate text-sm font-medium">{active.title}</p>
            <p className="mt-0.5 text-[11px] text-neutral-500">
              {active.kind.replace(/_/g, " ")} · {active.published_at ?? `undated, retrieved ${active.retrieved_at}`} ·{" "}
              {active.url}
            </p>
          </div>
          <Link
            href={href({ tab: "sources" })}
            className="shrink-0 text-[11px] text-neutral-500 underline hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            clear
          </Link>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="info">
            characters {selectedClaim.span!.start}–{selectedClaim.span!.end}
          </Badge>
          <Badge tone="neutral">{selectedClaim.stance.replace(/_/g, " ")}</Badge>
          <Badge tone="neutral">{selectedClaim.kind.replace(/_/g, " ")}</Badge>
        </div>

        <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
          The sentence in the brief restated this as: {selectedClaim.assertion}
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        <pre className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-neutral-700 dark:text-neutral-300">
          {before}
          <mark className="span" id={`span-${selectedClaim.id}`}>
            {inside}
          </mark>
          {after}
        </pre>
      </div>
    </div>
  );
}
