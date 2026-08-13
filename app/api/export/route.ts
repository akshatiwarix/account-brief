import { briefFor } from "@/data/briefs";
import { companyById, documentsFor } from "@/data/corpus";
import { renderMarkdown } from "@/lib/brief/render";

/**
 * The two exports.
 *
 * `brief.md` is the artifact a rep pastes into a CRM note — footnotes resolving to document, kind and
 * date, so a citation survives leaving the app. `claims.json` is the artifact a reviewer audits: every
 * surviving claim with its span, every rejection with its reason, and the conflicts left unresolved.
 *
 * Two, not three. A third export nobody opens is a maintenance burden that looks like a feature.
 *
 * Reading a cached brief costs nothing, so this route is not rate limited and needs no key.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const companyId = url.searchParams.get("company") ?? "";
  const format = url.searchParams.get("format") ?? "md";

  const company = companyById(companyId);
  if (!company) {
    return Response.json({ error: `Unknown company: ${companyId}` }, { status: 404 });
  }

  const brief = briefFor(companyId);
  if (!brief) {
    return Response.json(
      {
        error: `No cached brief for ${companyId}. Generate it with \`npm run generate:briefs -- ${companyId}\`.`,
      },
      { status: 404 },
    );
  }

  const documents = documentsFor(companyId);

  if (format === "json") {
    const body = {
      company: brief.company,
      as_of: brief.as_of,
      generated_at: brief.generated_at,
      coverage: brief.coverage,
      cost: brief.cost,
      /** Surviving claims, each with the character span the citation points at. */
      claims: brief.claims,
      conflicts: brief.conflicts,
      /** Including everything the gate threw away, with the reason. This is the auditable half. */
      rejected: brief.rejected,
      sentences: brief.sections.flatMap((section) =>
        section.questions.flatMap((question) =>
          // `sentence` already carries `question_id`; spreading it last would have silently won, so
          // the section is added around it rather than a second copy of the question being merged in.
          question.sentences.map((sentence) => ({ section: section.section, ...sentence })),
        ),
      ),
      unanswered: brief.sections.flatMap((section) =>
        section.questions
          .filter((question) => question.unanswerable !== null)
          .map((question) => ({
            question_id: question.question_id,
            ...question.unanswerable,
          })),
      ),
      corpus: {
        synthetic: true,
        note: "Authored synthetic corpus. Every domain ends in .example and no real company is quoted.",
        documents: documents.map((document) => ({
          id: document.id,
          kind: document.kind,
          title: document.title,
          url: document.url,
          published_at: document.published_at,
          retrieved_at: document.retrieved_at,
        })),
      },
    };

    return new Response(`${JSON.stringify(body, null, 2)}\n`, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${companyId}-claims.json"`,
      },
    });
  }

  return new Response(renderMarkdown(brief, documents), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${companyId}-brief.md"`,
    },
  });
}
