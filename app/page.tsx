import Link from "next/link";

import { allBriefs, briefFor, generatedCompanyIds } from "@/data/briefs";
import { COMPANIES, DEFAULT_AS_OF, TRAPS, companyById, documentsFor } from "@/data/corpus";
import type { Brief } from "@/lib/brief/types";

import { BriefView } from "./components/BriefView";
import { CompanyPicker } from "./components/CompanyPicker";
import { PastePanel } from "./components/PastePanel";
import { RejectedPane } from "./components/RejectedPane";
import { SourcePane } from "./components/SourcePane";
import { Badge, CoverageMeter, Panel, SectionLabel } from "./components/ui";

/**
 * One server-rendered page. No client engine, no fetch on mount, no spinner.
 *
 * Day 005 shipped its engine to the browser because a date scrubber makes a request-per-frame a
 * stutter-per-frame. There is no scrubber here — briefs are committed fixtures — so selection is
 * expressed in the URL and every pane is rendered on the server. A citation is a link, which means the
 * span highlight works with JavaScript disabled and is shareable as a URL.
 */

export const metadata = {
  title: "Account Brief — every sentence has a source span",
};

interface HomeProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const generated = generatedCompanyIds();
  const briefs = new Map<string, Brief>(allBriefs().map((brief) => [brief.company.id, brief]));

  const requested = first(params.company);
  // Default to the first company that actually has a brief, so the landing state is never an
  // explanation of why there is nothing to see.
  const companyId = requested ?? generated[0] ?? COMPANIES[0]!.id;
  const company = companyById(companyId) ?? COMPANIES[0]!;
  const documents = documentsFor(company.id);
  const brief = briefFor(company.id);

  const tab = first(params.tab) === "rejected" ? "rejected" : "sources";
  const claimId = first(params.claim) ?? null;
  const selectedClaim = brief?.claims.find((claim) => claim.id === claimId) ?? null;

  const href = ({ claim, tab: nextTab }: { claim?: string; tab?: string }) => {
    const next = new URLSearchParams({ company: company.id });
    if (claim) next.set("claim", claim);
    if (nextTab) next.set("tab", nextTab);
    return `/?${next.toString()}`;
  };

  return (
    <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 lg:px-8">
      <header className="mb-6 border-b border-neutral-200 pb-5 dark:border-neutral-800">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="text-lg font-semibold tracking-tight">Account Brief</h1>
          <p className="text-[11px] text-neutral-500">
            as of {DEFAULT_AS_OF} · corpus authored and synthetic, every domain ends in{" "}
            <code className="font-mono">.example</code> ·{" "}
            {generated.length}/{COMPANIES.length} briefs generated
          </p>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
          Every sentence below resolves to a character span in a source document, or it does not
          render. Click any citation to see the exact characters it rests on. The{" "}
          <Link href={href({ tab: "rejected" })} className="underline decoration-dotted">
            rejected pane
          </Link>{" "}
          shows what the gate threw away.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)_minmax(0,26rem)]">
        <div className="space-y-6">
          <CompanyPicker selectedId={company.id} briefs={briefs} />

          {brief && (
            <Panel className="space-y-3 p-3">
              <CoverageMeter
                answered={brief.coverage.answered}
                routable={brief.coverage.routable}
                total={brief.coverage.total}
              />
              <div className="flex flex-wrap gap-1.5 border-t border-neutral-200 pt-2 dark:border-neutral-800">
                <Badge tone="neutral" title={`Generated ${brief.generated_at}`}>
                  cached
                </Badge>
                <Badge tone="neutral">{documents.length} documents</Badge>
                {brief.conflicts.length > 0 && (
                  <Badge tone="warn">
                    {brief.conflicts.length} conflict{brief.conflicts.length === 1 ? "" : "s"}
                  </Badge>
                )}
                <Badge tone={brief.rejected.length > 0 ? "bad" : "good"}>
                  {brief.rejected.length} rejected
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-neutral-200 pt-2 text-[11px] dark:border-neutral-800">
                <a
                  href={`/api/export?company=${company.id}&format=md`}
                  className="underline decoration-dotted hover:decoration-solid"
                >
                  brief.md
                </a>
                <a
                  href={`/api/export?company=${company.id}&format=json`}
                  className="underline decoration-dotted hover:decoration-solid"
                >
                  claims.json
                </a>
              </div>
            </Panel>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-4">
            <h2 className="text-base font-semibold">{company.name}</h2>
            <p className="text-[11px] text-neutral-500">
              {company.industry} · {company.domain} · {TRAPS[company.id]}
            </p>
          </div>

          {brief ? (
            <BriefView
              brief={brief}
              documents={documents}
              selectedClaimId={claimId}
              href={href}
            />
          ) : (
            <Ungenerated companyId={company.id} documentCount={documents.length} />
          )}
        </div>

        <Panel className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-hidden">
          {brief ? (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex gap-px border-b border-neutral-200 p-1 dark:border-neutral-800">
                {(["sources", "rejected"] as const).map((name) => (
                  <Link
                    key={name}
                    href={href({ tab: name, claim: name === "sources" ? claimId ?? undefined : undefined })}
                    className={`flex-1 rounded px-2 py-1 text-center text-[11px] font-medium uppercase tracking-wide transition-colors ${
                      tab === name
                        ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                        : "text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                    }`}
                  >
                    {name}
                    {name === "rejected" && brief.rejected.length > 0 && (
                      <span className="ml-1 tabular-nums">{brief.rejected.length}</span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-hidden">
                {tab === "rejected" ? (
                  <RejectedPane brief={brief} />
                ) : (
                  <SourcePane
                    brief={brief}
                    documents={documents}
                    selectedClaim={selectedClaim}
                    href={href}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <SectionLabel>Sources</SectionLabel>
              <ul className="mt-2 space-y-1.5">
                {documents.map((document) => (
                  <li key={document.id} className="text-xs">
                    <span className="text-neutral-500">{document.kind.replace(/_/g, " ")}</span>{" "}
                    {document.title}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <PastePanel />
    </main>
  );
}

/**
 * The honest empty state. Named reason, exact command, and the constraint that caused it — rather than
 * a spinner, a mock brief, or this company quietly missing from the picker.
 */
function Ungenerated({ companyId, documentCount }: { companyId: string; documentCount: number }) {
  return (
    <Panel className="p-4">
      <SectionLabel>No cached brief for this company yet</SectionLabel>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        The corpus has {documentCount} documents for it, and the engine is in place — nothing has been
        generated against them.
      </p>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
        Generating a brief costs two model calls: one extraction over all of a company&rsquo;s
        documents, one composition over the claims that survived. The free tier for{" "}
        <code className="font-mono text-[12px]">gemini-3.6-flash</code> allows{" "}
        <strong>20 requests per day</strong>, so the full ten-company corpus is exactly one
        day&rsquo;s quota.
      </p>
      <pre className="mt-3 overflow-x-auto rounded bg-neutral-100 p-2 font-mono text-[12px] dark:bg-neutral-800/60">
        npm run generate:briefs -- {companyId}
      </pre>
      <p className="mt-2 text-[11px] text-neutral-500">
        The result is committed, hash-locked against the corpus that produced it, and served without a
        key. A stale fixture fails the build rather than rendering.
      </p>
    </Panel>
  );
}
