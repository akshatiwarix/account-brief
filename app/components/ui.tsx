import type { ReactNode } from "react";

/** Small shared primitives. Server components throughout — nothing here needs state. */

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "bad" | "good" | "info";
  title?: string;
}) {
  const tones = {
    neutral:
      "border-neutral-300 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400",
    warn: "border-amber-400 text-amber-700 dark:border-amber-500/60 dark:text-amber-400",
    bad: "border-rose-400 text-rose-700 dark:border-rose-500/60 dark:text-rose-400",
    good: "border-emerald-400 text-emerald-700 dark:border-emerald-500/60 dark:text-emerald-400",
    info: "border-sky-400 text-sky-700 dark:border-sky-500/60 dark:text-sky-400",
  } as const;

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded border px-1.5 py-px text-[10px] font-medium uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-500 dark:text-neutral-500">
      {children}
    </h2>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/40 ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * The coverage meter. Two numbers, not one: how many questions the corpus could answer at all, and
 * how many ended up with a supported sentence. The gap between them is the honest part.
 */
export function CoverageMeter({
  answered,
  routable,
  total,
}: {
  answered: number;
  routable: number;
  total: number;
}) {
  const pct = (value: number) => `${Math.round((value / total) * 100)}%`;

  return (
    <div className="space-y-1">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="font-semibold tabular-nums">
          {answered} / {total}
        </span>
        <span className="text-neutral-500">questions answered</span>
      </div>
      <div
        className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800"
        role="img"
        aria-label={`${answered} of ${total} questions answered; ${routable} were answerable from the available sources`}
      >
        <div
          className="absolute inset-y-0 left-0 bg-neutral-300 dark:bg-neutral-700"
          style={{ width: pct(routable) }}
        />
        <div
          className="absolute inset-y-0 left-0 bg-neutral-900 dark:bg-neutral-100"
          style={{ width: pct(answered) }}
        />
      </div>
      <p className="text-[11px] text-neutral-500">
        {routable} of {total} were answerable from the sources on hand
        {routable > answered ? ` · ${routable - answered} had sources but no supported sentence` : ""}
      </p>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-sm italic text-neutral-500 dark:text-neutral-500">{children}</p>;
}
