"use client";

import { useState } from "react";

import type { Brief, DocumentKind } from "@/lib/brief/types";

/**
 * Paste real pages and watch the gate run on text it has never seen.
 *
 * The corpus is authored, which is what makes its ten traps possible and also means a reader cannot
 * click a citation through to a real source. This panel is the answer to that: bring your own
 * documents, get a brief where every sentence is span-verified against text you supplied.
 *
 * It is a paste rather than a URL, and that is a security decision rather than a laziness one — a
 * public endpoint that fetches a user-supplied URL server-side is SSRF. `lib/research/fetch-adapter.ts`
 * carries the full reasoning.
 *
 * The only client component in the app. It renders the result without span highlighting, because the
 * highlight needs offsets against a document the server holds; the counts, the attribution and the
 * rejections are all here, which is where the interesting behaviour is anyway.
 */

const KINDS: DocumentKind[] = [
  "homepage",
  "pricing",
  "careers",
  "blog",
  "press_release",
  "filing_excerpt",
  "news",
  "review_site",
  "changelog",
  "job_post",
];

interface Draft {
  kind: DocumentKind;
  title: string;
  published_at: string;
  text: string;
}

const EMPTY: Draft = { kind: "homepage", title: "", published_at: "", text: "" };

export function PastePanel() {
  const [name, setName] = useState("");
  const [domain, setDomain] = useState("");
  const [industry, setIndustry] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([{ ...EMPTY }]);
  const [state, setState] = useState<"idle" | "running">("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);

  function update(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((draft, at) => (at === index ? { ...draft, ...patch } : draft)),
    );
  }

  async function run() {
    setState("running");
    setError(null);
    setBrief(null);

    try {
      const response = await fetch("/api/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company: { name, domain, industry: industry || "Unknown" },
          documents: drafts
            .filter((draft) => draft.text.trim().length >= 40)
            .map((draft) => ({
              kind: draft.kind,
              title: draft.title || `${draft.kind} of ${domain}`,
              url: "",
              published_at: /^\d{4}-\d{2}-\d{2}$/.test(draft.published_at)
                ? draft.published_at
                : null,
              text: draft.text,
            })),
        }),
      });

      const payload = (await response.json()) as { brief?: Brief; error?: string };
      if (!response.ok) {
        setError(payload.error ?? `Request failed (${response.status}).`);
        return;
      }
      setBrief(payload.brief ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed.");
    } finally {
      setState("idle");
    }
  }

  const ready =
    name.trim().length > 0 &&
    domain.trim().length > 0 &&
    drafts.some((draft) => draft.text.trim().length >= 40);

  return (
    <section className="mt-10 border-t border-neutral-200 pt-6 dark:border-neutral-800">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500">
        Run it on your own pages
      </h2>
      <p className="mt-1.5 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
        Paste a real company&rsquo;s homepage, pricing page or reviews. Two model calls, and every
        sentence you get back was checked character-for-character against the text you supplied. Needs{" "}
        <code className="font-mono text-[12px]">GEMINI_API_KEY</code> on the server; without one this
        returns a 501 and the cached briefs above are unaffected.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Company name"
          className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="domain.com"
          className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
        <input
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          placeholder="Industry (optional)"
          className="rounded border border-neutral-300 bg-transparent px-2 py-1.5 text-sm dark:border-neutral-700"
        />
      </div>

      <div className="mt-3 space-y-3">
        {drafts.map((draft, index) => (
          <div key={index} className="rounded border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={draft.kind}
                onChange={(event) => update(index, { kind: event.target.value as DocumentKind })}
                className="rounded border border-neutral-300 bg-transparent px-1.5 py-1 text-xs dark:border-neutral-700"
              >
                {KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {kind.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
              <input
                value={draft.title}
                onChange={(event) => update(index, { title: event.target.value })}
                placeholder="Page title"
                className="min-w-0 flex-1 rounded border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
              />
              <input
                value={draft.published_at}
                onChange={(event) => update(index, { published_at: event.target.value })}
                placeholder="YYYY-MM-DD"
                className="w-28 rounded border border-neutral-300 bg-transparent px-2 py-1 font-mono text-xs dark:border-neutral-700"
              />
              {drafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDrafts((current) => current.filter((_, at) => at !== index))}
                  className="text-xs text-neutral-500 underline"
                >
                  remove
                </button>
              )}
            </div>
            <textarea
              value={draft.text}
              onChange={(event) => update(index, { text: event.target.value })}
              rows={5}
              placeholder="Paste the page text. At least 40 characters, at most 40,000."
              className="mt-2 w-full rounded border border-neutral-300 bg-transparent p-2 font-mono text-xs dark:border-neutral-700"
            />
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={drafts.length >= 12}
          onClick={() => setDrafts((current) => [...current, { ...EMPTY }])}
          className="rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 dark:border-neutral-700"
        >
          add a document
        </button>
        <button
          type="button"
          disabled={!ready || state === "running"}
          onClick={run}
          className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {state === "running" ? "running the gate…" : "build the brief"}
        </button>
        <span className="text-[11px] text-neutral-500">
          {drafts.length}/12 documents · 5 generations per 10 minutes per IP
        </span>
      </div>

      {error && (
        <p className="mt-3 rounded border border-rose-300 bg-rose-50/60 p-2 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/5 dark:text-rose-400">
          {error}
        </p>
      )}

      {brief && <PasteResult brief={brief} />}
    </section>
  );
}

function PasteResult({ brief }: { brief: Brief }) {
  const sentences = brief.sections.flatMap((section) =>
    section.questions.flatMap((question) =>
      question.sentences.map((sentence) => ({ question: question.question_id, sentence })),
    ),
  );

  const counts = new Map<string, number>();
  for (const rejection of brief.rejected) {
    counts.set(rejection.reason, (counts.get(rejection.reason) ?? 0) + 1);
  }

  return (
    <div className="mt-4 rounded border border-neutral-200 p-3 dark:border-neutral-800">
      <p className="text-[11px] text-neutral-500">
        {brief.coverage.answered}/{brief.coverage.total} answered ·{" "}
        {brief.cost?.claims_returned ?? 0} claims returned, {brief.cost?.claims_surviving ?? 0}{" "}
        survived the gate · {brief.cost?.extract_calls ?? 0} extract
        {brief.cost && brief.cost.retry_calls > 0 ? ` (+${brief.cost.retry_calls} retry)` : ""} ·{" "}
        {brief.rejected.length} rejected
      </p>

      <ul className="mt-2 space-y-1.5">
        {sentences.map(({ question, sentence }, index) => (
          <li key={index} className="text-sm">
            <span className="font-mono text-[10px] text-neutral-500">{question}</span>{" "}
            {sentence.text}
            {sentence.conflicting && <span className="ml-1 text-[10px] text-amber-600">conflicting</span>}
            {sentence.repaired && (
              <span className="ml-1 text-[10px] text-neutral-500">attribution repaired</span>
            )}
          </li>
        ))}
        {sentences.length === 0 && (
          <li className="text-sm italic text-neutral-500">
            Nothing survived the gate. Every rejection is listed below with its reason — this is the
            honest outcome when a model cannot quote what it asserted.
          </li>
        )}
      </ul>

      {brief.rejected.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[11px] text-neutral-500">
            {[...counts.entries()].map(([reason, count]) => `${count} × ${reason}`).join(" · ")}
          </summary>
          <ul className="mt-2 space-y-1">
            {brief.rejected.map((rejection, index) => (
              <li key={index} className="text-[11px] text-neutral-600 dark:text-neutral-400">
                <span className="font-mono">{rejection.reason}</span> — {rejection.detail}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
