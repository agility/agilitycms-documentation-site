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
			// Anonymous visitors still produce pageview/event counts; only create
			// person profiles once someone is identified (keeps event cost down).
			person_profiles: "identified_only",
		});
		initialized = true;
	}
	return posthog;
}

/** True when a PostHog key is configured. */
export function isPostHogEnabled(): boolean {
	return !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
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
