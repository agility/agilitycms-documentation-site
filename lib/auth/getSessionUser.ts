"use client";

/**
 * The signed-in probe, fetched once per page load and shared.
 *
 * Two callers want this: the header (to greet the user and swap its actions)
 * and the PostHog probe (to set `agility_signed_in` / identify). Memoising the
 * promise means they share one request instead of racing two.
 *
 * Deliberately NOT a server read. The header is statically rendered and cached
 * at the Netlify edge with a long TTL — see HOSTING.md — which only works
 * because the HTML is byte-identical for every reader. Rendering someone's name
 * into it would either break that caching or serve one person's name to
 * everyone. So the page ships logged-out and this swaps it client-side.
 */

export interface SessionUser {
	signedIn: boolean;
	/** True when the cookie was checked against Classic, not just present. */
	validated?: boolean;
	/** Agility UserID — the same distinct_id the Manager App uses in PostHog. */
	userId?: string;
	/** First name only; the API never returns the email or last name. */
	firstName?: string;
}

const LOGGED_OUT: SessionUser = { signedIn: false };

let inFlight: Promise<SessionUser> | null = null;

/**
 * Resolves to the current session. Never rejects — a failure is reported as
 * logged out, because neither caller should break the page over this.
 */
export function getSessionUser(): Promise<SessionUser> {
	if (typeof window === "undefined") return Promise.resolve(LOGGED_OUT);

	if (!inFlight) {
		inFlight = fetch("/docs/api/me", { cache: "no-store" })
			.then((res) => (res.ok ? (res.json() as Promise<SessionUser>) : LOGGED_OUT))
			.catch(() => LOGGED_OUT);
	}
	return inFlight;
}
