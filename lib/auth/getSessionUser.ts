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

function load(): Promise<SessionUser> {
	return fetch("/docs/api/me", { cache: "no-store" })
		.then((res) => (res.ok ? (res.json() as Promise<SessionUser>) : LOGGED_OUT))
		.catch(() => LOGGED_OUT);
}

/**
 * Resolves to the current session, reusing the in-flight/last result. Never
 * rejects — a failure is reported as logged out, because neither caller should
 * break the page over this.
 */
export function getSessionUser(): Promise<SessionUser> {
	if (typeof window === "undefined") return Promise.resolve(LOGGED_OUT);
	if (!inFlight) {
		lastFetch = Date.now();
		inFlight = load();
	}
	return inFlight;
}

/**
 * How long after a fetch to ignore further refresh requests. Same idea as SWR's
 * `dedupingInterval`, and the same 5s default: tabbing back and forth should not
 * fire a request per switch, and each one costs a server round trip to Classic.
 */
const DEDUPE_MS = 5000;

/** Module-scoped, so the window is shared by every subscriber — see below. */
let lastFetch = 0;

/**
 * Re-fetch, unless something else already did within the dedupe window.
 *
 * The dedupe lives HERE rather than per-subscriber for a reason: both `Header`
 * and `MobileMenu` mount the hook, so a per-subscriber timer meant one focus
 * event fired two identical requests (measured: delta of 2). Sharing the window
 * collapses them — the second caller gets the first caller's in-flight promise,
 * so every subscriber still updates, from one request.
 */
export function refreshSessionUser(): Promise<SessionUser> {
	if (typeof window === "undefined") return Promise.resolve(LOGGED_OUT);
	const now = Date.now();
	if (inFlight && now - lastFetch < DEDUPE_MS) return inFlight;
	lastFetch = now;
	inFlight = load();
	return inFlight;
}

/**
 * Re-check the session when the tab regains focus, SWR-style.
 *
 * Without this the memo lives for the life of the JS context, so a reader who
 * signs in from another tab keeps seeing the logged-out header until a full
 * reload. Returns an unsubscribe function.
 *
 * Both `visibilitychange` and `focus` are wired up: the first covers tab
 * switches, the second covers returning to the window from another app. They
 * frequently both fire, which is what the dedupe window is for.
 */
export function onSessionRefocus(cb: (user: SessionUser) => void): () => void {
	if (typeof window === "undefined") return () => {};

	const maybeRefresh = () => {
		if (document.visibilityState !== "visible") return;
		// Deduping is handled centrally in refreshSessionUser, so this always
		// resolves — with either a fresh fetch or the shared in-flight one.
		refreshSessionUser().then(cb);
	};

	document.addEventListener("visibilitychange", maybeRefresh);
	window.addEventListener("focus", maybeRefresh);
	return () => {
		document.removeEventListener("visibilitychange", maybeRefresh);
		window.removeEventListener("focus", maybeRefresh);
	};
}
