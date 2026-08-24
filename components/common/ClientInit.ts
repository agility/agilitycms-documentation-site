"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Intercom } from "@intercom/messenger-js-sdk";
import { initPostHog, track } from "lib/analytics/posthog";

/**
 * Client-side bootstraps that used to live in the Pages-Router Layout.js:
 * Intercom messenger, PostHog analytics, and scroll-to-top on route change
 * (the site scrolls a nested #ScrollContainer, not the window, so the browser
 * doesn't reset it).
 */
export default function ClientInit() {
	const pathname = usePathname();

	useEffect(() => {
		Intercom({ app_id: "fj9g3mkl" });
		initPostHog();
	}, []);

	// PostHog $pageview on every client-side navigation. capture_pageview is
	// disabled in init because App Router SPA nav doesn't trigger posthog's
	// default pageview; posthog reads window.location at capture time, so the
	// /docs basePath is included automatically. No-op until a key is set.
	useEffect(() => {
		initPostHog();
		track("$pageview");
	}, [pathname]);

	useEffect(() => {
		const scrollContainer = document.getElementById("ScrollContainer");
		if (scrollContainer) scrollContainer.scrollTop = 0;
	}, [pathname]);

	return null;
}
