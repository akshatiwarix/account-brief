import { INFERRED_QUESTION, SECTIONS, questionById } from "./questions";
import type { Brief, SourceDocument } from "./types";

/**
 * `brief.md` — the artifact a rep pastes into a CRM note.
 *
 * Two rules make this export worth having rather than a lossy screenshot of the app.
 *
 * Footnotes are numbered by first appearance and resolve to the document, its kind and its date, so
 * the citation survives leaving the app. A footnote that says only "source: homepage" is decoration;
 * one that says "homepage, published 2026-06-14" is checkable by a human who has never seen this
 * tool.
 *
 * Absence is exported too. Every unanswered question is written out as an explicit line naming what
 * was missing. Dropping empty questions would produce a document that reads complete, which is the
 * one property this brief must not have.
 */
export function renderMarkdown(brief: Brief, documents: readonly SourceDocument[]): string {
  const byId = new Map(documents.map((document) => [document.id, document]));
  const claimById = new Map(brief.claims.map((claim) => [claim.id, claim]));

  /** Footnote numbers, assigned in order of first citation. */
  const footnotes: { number: number; document: SourceDocument }[] = [];
  const numberFor = new Map<string, number>();

  function footnote(documentId: string): number | null {
    const existing = numberFor.get(documentId);
    if (existing !== undefined) return existing;
    const document = byId.get(documentId);
    if (!document) return null;
    const number = footnotes.length + 1;
    footnotes.push({ number, document });
    numberFor.set(documentId, number);
    return number;
  }

  const lines: string[] = [];

  lines.push(`# ${brief.company.name} — account brief`);
  lines.push("");
  lines.push(
    `${brief.company.industry} · ${brief.company.domain} · as of ${brief.as_of} · ${brief.coverage.answered} of ${brief.coverage.total} questions answered`,
  );
  lines.push("");
  lines.push(
    "Every sentence below cites a character span in a source document. Sentences that could not be supported were removed rather than softened.",
  );
  lines.push("");

  for (const section of SECTIONS) {
    const entry = brief.sections.find((candidate) => candidate.section === section.id);
    if (!entry) continue;

    lines.push(`## ${section.label}`);
    lines.push("");

    for (const question of entry.questions) {
      const spec = questionById(question.question_id);
      lines.push(`### ${spec.label}`);
      lines.push("");

      if (question.sentences.length === 0) {
        const missing = question.unanswerable?.missing_kinds ?? [];
        lines.push(
          missing.length > 0
            ? `_Not answerable from available sources — no ${missing.join(" or ")} document._`
            : "_Not answerable from available sources._",
        );
        lines.push("");
        continue;
      }

      for (const sentence of question.sentences) {
        const markers = sentence.claim_ids
          .map((id) => claimById.get(id)?.document_id)
          .filter((documentId): documentId is string => documentId !== undefined)
          .map((documentId) => footnote(documentId))
          .filter((number): number is number => number !== null);

        // Deduplicated: three claims from one document produce one footnote marker, not three.
        const unique = [...new Set(markers)].sort((a, b) => a - b);
        const suffix = unique.map((number) => `[^${number}]`).join("");
        const flags = [
          sentence.conflicting ? "**conflicting**" : null,
          question.question_id === INFERRED_QUESTION ? "_inference, not a citation_" : null,
        ].filter((flag): flag is string => flag !== null);

        lines.push(`- ${sentence.text}${suffix}${flags.length > 0 ? ` — ${flags.join(", ")}` : ""}`);
      }
      lines.push("");
    }
  }

  if (brief.conflicts.length > 0) {
    lines.push("## Unresolved disagreements");
    lines.push("");
    for (const conflict of brief.conflicts) {
      const values = conflict.claim_ids
        .map((id) => claimById.get(id))
        .filter((claim) => claim !== undefined)
        // Oldest first. `claim_ids` is sorted by id for determinism, which reads as arbitrary here;
        // chronological order lets a reader see the disagreement develop without implying a winner.
        .sort((a, b) => a!.observed_at.localeCompare(b!.observed_at))
        .map((claim) => `${claim!.value?.n ?? "?"} ${conflict.unit} (${claim!.observed_at})`)
        .join(" vs ");
      lines.push(
        `- **${questionById(conflict.question_id).label}** — ${values}. Not resolved: the sources disagree and the tool has no basis for choosing.`,
      );
    }
    lines.push("");
  }

  lines.push("## What was rejected");
  lines.push("");
  if (brief.rejected.length === 0) {
    lines.push("_Nothing was rejected for this company._");
  } else {
    for (const [reason, count] of countByReason(brief)) {
      lines.push(`- ${count} × \`${reason}\``);
    }
  }
  lines.push("");

  if (footnotes.length > 0) {
    lines.push("---");
    lines.push("");
    for (const { number, document } of footnotes) {
      const date = document.published_at ?? document.retrieved_at;
      lines.push(`[^${number}]: ${document.title} — ${document.kind}, ${date}. ${document.url}`);
    }
    lines.push("");
  }

  lines.push(
    `_Generated ${brief.generated_at} from ${documents.length} documents. Corpus is authored and synthetic; every domain ends in .example._`,
  );

  return `${lines.join("\n")}\n`;
}

export function countByReason(brief: Brief): [string, number][] {
  const counts = new Map<string, number>();
  for (const rejection of brief.rejected) {
    counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}
