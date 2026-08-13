import { companyById, documentsFor, DEFAULT_AS_OF } from "@/data/corpus";
import { generateBrief } from "@/lib/research/generate";
import {
  DEFAULT_LIMIT,
  DEFAULT_WINDOW_MS,
  createRateLimiter,
} from "@/lib/research/rate-limit";
import { briefRequestSchema } from "@/lib/research/schemas";
import type { SourceDocument } from "@/lib/brief/types";

/**
 * `POST /api/brief` — the only route that spends quota, and therefore the only one that is gated.
 *
 * Two bodies: `{ company_id }` regenerates a bundled company live, and `{ company, documents }` runs
 * the gate over text the corpus has never seen. The second one is the demonstration that this works on
 * real input, and it is a paste rather than a URL fetch on purpose: a public endpoint that fetches an
 * arbitrary user-supplied URL server-side is SSRF. See `lib/research/fetch-adapter.ts`.
 *
 * No key → 501 with a message pointing at the cached briefs, not a 500 and not a silent mock. The rest
 * of the app works without one.
 */

const BODY_LIMIT_BYTES = 500_000;

const take = createRateLimiter({ limit: DEFAULT_LIMIT, windowMs: DEFAULT_WINDOW_MS });

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No GEMINI_API_KEY is configured on this server. Everything else works without it — the ten cached briefs, their rejected panes and both exports are all served from committed fixtures.",
      },
      { status: 501 },
    );
  }

  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > BODY_LIMIT_BYTES) {
    return Response.json(
      { error: `Body too large: ${declared} bytes, limit ${BODY_LIMIT_BYTES}.` },
      { status: 413 },
    );
  }

  const raw = await request.text();
  if (raw.length > BODY_LIMIT_BYTES) {
    return Response.json(
      { error: `Body too large: ${raw.length} bytes, limit ${BODY_LIMIT_BYTES}.` },
      { status: 413 },
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Body is not valid JSON." }, { status: 400 });
  }

  const parsed = briefRequestSchema.safeParse(json);
  if (!parsed.success) {
    // Naming the offending field, so a rejected paste is fixable rather than mysterious.
    const issue = parsed.error.issues[0];
    return Response.json(
      {
        error: issue
          ? `${issue.path.join(".") || "body"}: ${issue.message}`
          : "Body did not match the expected shape.",
      },
      { status: 400 },
    );
  }

  // Rate limited after validation, so a malformed request does not burn someone's allowance, and
  // before the model call, which is the thing worth protecting.
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const limit = take(ip);
  if (!limit.allowed) {
    return Response.json(
      {
        error: `Rate limited. ${DEFAULT_LIMIT} generations per ${DEFAULT_WINDOW_MS / 60_000} minutes — this route spends the deployment's model quota.`,
        retry_after_seconds: limit.retry_after_seconds,
      },
      { status: 429, headers: { "retry-after": String(limit.retry_after_seconds) } },
    );
  }

  const body = parsed.data;

  if ("company_id" in body) {
    const company = companyById(body.company_id);
    if (!company) {
      return Response.json({ error: `Unknown company: ${body.company_id}` }, { status: 404 });
    }

    const result = await generateBrief({
      company,
      documents: documentsFor(company.id),
      apiKey,
      asOf: DEFAULT_AS_OF,
      generatedAt: DEFAULT_AS_OF,
    });

    return result.ok
      ? Response.json({ brief: result.brief, source: "live" })
      : Response.json({ error: result.error }, { status: result.status });
  }

  const asOf = body.as_of ?? DEFAULT_AS_OF;
  const company = {
    id: "pasted",
    name: body.company.name,
    domain: body.company.domain,
    industry: body.company.industry,
  };

  const documents: SourceDocument[] = body.documents.map((document, index) => ({
    id: `pasted-d${String(index + 1).padStart(2, "0")}`,
    company_id: company.id,
    kind: document.kind,
    title: document.title,
    url: document.url,
    published_at: document.published_at,
    // Pasted text has no retrieval date of its own; the as-of is the honest upper bound, and an
    // undated document then ages from it rather than from today.
    retrieved_at: asOf,
    text: document.text,
  }));

  const result = await generateBrief({ company, documents, apiKey, asOf, generatedAt: asOf });

  return result.ok
    ? Response.json({ brief: result.brief, documents, source: "live" })
    : Response.json({ error: result.error }, { status: result.status });
}
