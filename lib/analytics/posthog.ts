"use client";

import posthog from "posthog-js";
import { getSessionUser } from "lib/auth/getSessionUser";

/*
  PostHog browser analytics for the docs site.

  Cache-Components-safe by construction: init() and every capture run only
  from useEffect / event handlers in "use client" components — never at module
  import or during prerender (no Math.random/Date.now at module scope here).

  Instrumentation is OPT-IN: with no NEXT_PUBLIC_POSTHOG_KEY set, init() and
  track() are no-ops, so the site runs fine uninstrumented (local dev, forks).

  Host-neutral (HOSTING.md): posthog-js is a platform-independent analytics
  client, not a Vercel/Netlify SDK. Ingestion goes straight to the PostHog
  host; no vendor coupling.
*/

let initialized = false;

/**
 * CONSENT — the same three modes as the marketing site's src/lib/analytics/posthog.ts
 * (plans/32 D4 there). Nothing initializes until ClientInit calls setPostHogConsent:
 *   - "full":       analytics permitted. Cookies, identify, as before.
 *   - "cookieless": analytics not permitted, in an OPT-OUT region (a Decline).
 *                   PostHog's `cookieless_mode: "on_reject"`: no cookies or storage,
 *                   a daily server-side hash counts readers, no identify. The
 *                   project's "cookieless server hash mode" is already on (shared
 *                   project with the marketing site).
 *   - "off":        analytics not permitted in an OPT-IN region. Nothing at all.
 */
export type PostHogMode = "full" | "cookieless" | "off";

let mode: PostHogMode | null = null;
let optOutRegion = false;

/** Set from consent by ClientInit. Starts PostHog when it may run, and switches a running one. */
export function setPostHogConsent(next: PostHogMode, { optOutRegion: optOut }: { optOutRegion: boolean }): void {
	optOutRegion = optOut;
	mode = next;
	if (next === "off") {
		// An opt-in region's Decline stops a running PostHog dead (no on_reject there).
		if (initialized) posthog.opt_out_capturing();
		return;
	}
	const first = !initialized;
	const ph = initPostHog();
	if (!ph) return;
	if (next === "full") ph.opt_in_capturing({ captureEventName: false });
	else ph.opt_out_capturing();
	// The page view for the page consent arrived on: ClientInit's route-change
	// capture ran before PostHog could start.
	if (first) track("$pageview");
}

/**
 * Initialize the PostHog client once (idempotent), when consent allows. Returns
 * the client, or null when disabled, not in the browser, or not permitted.
 * Autocapture is on, so element clicks, rageclicks, and form interactions are
 * tracked automatically; we add structured events (search, result clicks) on top
 * for the queries we care about.
 */
export function initPostHog(): typeof posthog | null {
	if (typeof window === "undefined") return null;
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	if (!key) return null;
	if (mode !== "full" && mode !== "cookieless") return null;
	if (!initialized) {
		// Fixed at init: an opt-out region gets on_reject, so a later Decline turns
		// into cookieless counting; an opt-in region doesn't.
		const cookielessOnReject = mode === "cookieless" || optOutRegion;
		posthog.init(key, {
			...(cookielessOnReject ? { cookieless_mode: "on_reject" as const } : {}),
			api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
			ui_host: "https://us.posthog.com",
			// App Router SPA navigations don't fire posthog's default pageview —
			// ClientInit captures $pageview manually on each route change.
			capture_pageview: false,
			capture_pageleave: true,
			autocapture: true,
			persistence: "localStorage+cookie",
			// Docs readers are treated exactly like marketing visitors: anonymous
			// readers get person profiles too, so a journey across agilitycms.com,
			// /docs and app.agilitycms.com is one person rather than a profile that
			// only starts existing at the marketing-site boundary. This used to be
			// "identified_only" to keep event cost down — changed deliberately
			// (Joel, 2026-09-17); the marketing site leaves it at the same default.
			//
			// Identity carries across all three surfaces for free: the Netlify
			// proxy makes agilitycms.com and agilitycms.com/docs the SAME origin,
			// and posthog's cross_subdomain_cookie defaults to true, so the cookie
			// is scoped to .agilitycms.com and app.* picks up the same distinct_id.
		});
		initialized = true;
	}
	return posthog;
}

/** True when a PostHog key is configured. */
export function isPostHogEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
}

/** sessionStorage flag so the probe runs once per session, not per navigation. */
const SIGNED_IN_PROBE_KEY = "aglty-signedin-probed";

/**
 * Once per session, ask /api/me whether this reader is logged into Agility and
 * record it on PostHog as a **super property**, so every subsequent event in the
 * session carries `agility_signed_in`.
 *
 * When the session validates, the Agility UserID comes back too and we identify
 * with it — see the note at the identify() call below. The cookie value itself
 * never leaves the server.
 *
 * `register` (not `register_once`) so a reader who logs in or out mid-session
 * gets the corrected value on their next session rather than being stuck.
 */
export async function identifySignedInState(): Promise<void> {
	// Identifying sets a person profile: only with analytics consent ("full").
	if (typeof window === "undefined" || !initialized || mode !== "full") return;

	try {
		if (sessionStorage.getItem(SIGNED_IN_PROBE_KEY)) return;
	} catch {
		/* private mode — fall through and probe, it is one cheap request */
	}

	try {
		// Shared with the header via a memoised promise, so a page load makes one
		// request rather than two.
		const { signedIn, validated, userId } = await getSessionUser();

		// agility_session_validated keeps a checked session distinguishable from a
		// bare cookie, so the two never get conflated in a funnel.
		posthog.register({
			agility_signed_in: !!signedIn,
			agility_session_validated: !!validated,
		});

		// The Manager App already identifies into THIS SAME PostHog project using
		// the Agility UserID as distinct_id, so identifying with the same value is
		// what actually merges a person across app.agilitycms.com, the marketing
		// site and /docs. Without it they stay three anonymous visitors.
		// Only ever the numeric id — never the email or name Classic also returns.
		if (userId) posthog.identify(userId);

		posthog.capture("session_identified", {
			agility_signed_in: !!signedIn,
			agility_session_validated: !!validated,
		});

		try {
			sessionStorage.setItem(SIGNED_IN_PROBE_KEY, "1");
		} catch {
			/* private mode — we just re-probe next navigation, which is harmless */
		}
	} catch {
		/* analytics must never break the page */
	}
}

/**
 * Capture a custom event. Safe no-op when PostHog isn't initialized, so call
 * sites don't each have to guard on configuration.
 */
export function track(event: string, properties?: Record<string, unknown>): void {
	if (!initialized) return;
	try {
		posthog.capture(event, properties);
	} catch {
		/* analytics must never break the UI */
	}
}

export { posthog };
