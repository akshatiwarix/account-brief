import { QUESTIONS, SECTIONS } from "@/lib/brief/questions";

/**
 * Scaffold placeholder. Replaced by the three-pane brief reader in the UI commit; it renders the
 * question set so the scaffold commit proves the engine's contract is importable from a server
 * component rather than only from tests.
 */
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Account Brief</h1>
      <p className="mt-2 max-w-prose text-sm text-neutral-600 dark:text-neutral-400">
        Every sentence in a brief resolves to a character span in a source document, or it does not
        render. Scaffold in place; the corpus, the gate and the reader land in the commits that
        follow.
      </p>

      <ol className="mt-10 space-y-6">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {section.label}
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {QUESTIONS.filter((question) => question.section === section.id).map((question) => (
                <li key={question.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span>{question.label}</span>
                  <span className="font-mono text-xs text-neutral-500">
                    {question.answerable_from.length > 0
                      ? question.answerable_from.join(" · ")
                      : "inferred over surviving claims"}
                  </span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </main>
  );
}
