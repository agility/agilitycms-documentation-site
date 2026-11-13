"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Intercom } from "@intercom/messenger-js-sdk";
import { setPostHogConsent, track, identifySignedInState } from "lib/analytics/posthog";
import { ensureRegime } from "lib/analytics/consent-store";
import { useConsent } from "lib/analytics/use-consent";

/**
 * Client-side bootstraps that used to live in the Pages-Router Layout.js:
 * Intercom messenger, PostHog analytics, and scroll-to-top on route change
 * (the site scrolls a nested #ScrollContainer, not the window, so the browser
 * doesn't reset it).
 *
 * PostHog follows the cookie banner, as on the marketing site: analytics
 * permitted → full PostHog. Not permitted → in an opt-out region, cookieless
 * counting; in an opt-in region, nothing. Telling those apart needs the region
 * even when a choice is stored, so a reader without analytics consent waits for
 * it (one small request per session, shared with the marketing site).
 *
 * Intercom is the support messenger, not analytics, and is not gated here.
 */
export default function ClientInit() {
	const pathname = usePathname();
	const { permissions, regime } = useConsent();
	const analytics = permissions ? permissions.analytics : null;

	useEffect(() => {
		Intercom({ app_id: "fj9g3mkl" });
	}, []);

	useEffect(() => {
		if (analytics === null) return;
		let cancelled = false;
		void (async () => {
			const r = regime ?? (await ensureRegime());
			if (cancelled) return;
			setPostHogConsent(analytics ? "full" : r === "opt-out" ? "cookieless" : "off", { optOutRegion: r === "opt-out" });
			if (!analytics) return;
			// Once per session: flag whether this reader is logged into Agility, so
			// every event carries agility_signed_in. Deferred to browser idle so the
			// probe never competes with hydration.
			const w = window as typeof window & {
				requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
			};
			if (typeof w.requestIdleCallback === "function") {
				w.requestIdleCallback(() => void identifySignedInState(), { timeout: 2000 });
			} else {
				setTimeout(() => void identifySignedInState(), 1000);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [analytics, regime]);

	// PostHog $pageview on every client-side navigation. capture_pageview is
	// disabled in init because App Router SPA nav doesn't trigger posthog's
	// default pageview; posthog reads window.location at capture time, so the
	// /docs basePath is included automatically. A no-op until consent has
	// started PostHog; the first page's view is sent when it starts.
	useEffect(() => {
		track("$pageview");
	}, [pathname]);

	useEffect(() => {
		const scrollContainer = document.getElementById("ScrollContainer");
		if (scrollContainer) scrollContainer.scrollTop = 0;
	}, [pathname]);

	return null;
}
