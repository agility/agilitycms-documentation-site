"use client";

import posthog from "posthog-js";

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
 * Initialize the PostHog client once (idempotent). Returns the client, or
 * null when disabled / not in the browser. Autocapture is on, so element
 * clicks, rageclicks, and form interactions are tracked automatically; we add
 * structured events (search, result clicks) on top for the queries we care
 * about.
 */
export function initPostHog(): typeof posthog | null {
	if (typeof window === "undefined") return null;
	const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
	if (!key) return null;
	if (!initialized) {
		posthog.init(key, {
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
 * Super property, not identify(): the probe only learns *that* someone is logged
 * in, never *who* — the OWIN ticket is opaque to us and its value never leaves
 * the server. Calling identify() with no real user id would invent identities
 * and fragment the person records this is meant to join up.
 *
 * `register` (not `register_once`) so a reader who logs in or out mid-session
 * gets the corrected value on their next session rather than being stuck.
 */
export async function identifySignedInState(): Promise<void> {
	if (typeof window === "undefined" || !initialized) return;

	try {
		if (sessionStorage.getItem(SIGNED_IN_PROBE_KEY)) return;
	} catch {
		/* private mode — fall through and probe, it is one cheap request */
	}

	try {
		// same-origin: at the apex this is /docs/api/me behind the Netlify proxy,
		// which forwards cookies. Credentials are same-origin by default.
		const res = await fetch("/docs/api/me", { cache: "no-store" });
		if (!res.ok) return;
		const { signedIn, validated, userId } = (await res.json()) as {
			signedIn: boolean;
			validated?: boolean;
			userId?: string;
		};

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
