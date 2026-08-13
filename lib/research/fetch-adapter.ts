import type { SourceDocument } from "@/lib/brief/types";

/**
 * The live adapter, deliberately unexported and never called.
 *
 * PLAN.md originally had this wired to a route: give the tool a domain, it fetches the homepage, the
 * pricing page and the careers page, and runs the gate on real text. It is not wired, and the reason
 * is on the record rather than in a commit message.
 *
 * **A public endpoint that fetches an arbitrary user-supplied URL server-side is an SSRF hole.** On
 * Vercel it can be pointed at instance metadata and link-local addresses. Closing it properly means:
 * a scheme allowlist; resolving DNS yourself and rejecting private, loopback, link-local and
 * IPv4-mapped ranges; re-validating after every redirect rather than trusting the first hop; a
 * response size cap; a timeout; and even then DNS rebinding between the check and the connect is a
 * live edge. That is a day of careful work by itself, and shipping it half-done on a public repo is
 * worse than not shipping it.
 *
 * So the demonstration that this works on unseen text is **paste-documents**: a human fetches the
 * page, pastes the text, and the gate runs on input it has never seen. Same proof, none of the attack
 * surface. Live sourcing with a real SSRF defense is Days 061–065, which exist for exactly that.
 *
 * The function below is kept as the shape of that seam — the interface a live source would implement
 * — so the eventual adapter has somewhere to land and this note stays attached to it.
 */

interface FetchPlan {
  domain: string;
  paths: readonly string[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchDocuments(_plan: FetchPlan): Promise<SourceDocument[]> {
  throw new Error(
    "Not implemented, on purpose. Server-side fetching of a user-supplied URL is SSRF; see the note at the top of this file. Use paste-documents instead.",
  );
}

export type { FetchPlan };
