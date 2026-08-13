import Link from "next/link";

import { COMPANIES, TRAPS } from "@/data/corpus";
import type { Brief } from "@/lib/brief/types";

import { SectionLabel } from "./ui";

/**
 * The company list, with each company's trap named.
 *
 * Naming the trap is unusual for a demo and load-bearing here: a reviewer looking at `c09`'s mostly
 * empty brief needs to know that emptiness is the point. Without the label, a thin brief reads as a
 * broken tool, and the most interesting behaviour in the repo looks like a bug.
 *
 * Companies with no committed brief stay in the list, marked. Hiding them would make the app look
 * complete when it is not.
 */
export function CompanyPicker({
  selectedId,
  briefs,
}: {
  selectedId: string;
  briefs: Map<string, Brief>;
}) {
  return (
    <nav className="space-y-2">
      <SectionLabel>Companies</SectionLabel>
      <ul className="space-y-px">
        {COMPANIES.map((company) => {
          const brief = briefs.get(company.id);
          const selected = company.id === selectedId;

          return (
            <li key={company.id}>
              <Link
                href={`/?company=${company.id}`}
                aria-current={selected ? "page" : undefined}
                className={`block rounded px-2 py-1.5 transition-colors ${
                  selected
                    ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{company.name}</span>
                  <span
                    className={`shrink-0 text-[10px] tabular-nums ${
                      selected ? "opacity-80" : "text-neutral-500"
                    }`}
                  >
                    {brief ? `${brief.coverage.answered}/${brief.coverage.total}` : "—"}
                  </span>
                </span>
                <span
                  className={`mt-0.5 block text-[11px] leading-snug ${
                    selected ? "opacity-80" : "text-neutral-500"
                  }`}
                >
                  {brief ? TRAPS[company.id] : "no cached brief yet"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
