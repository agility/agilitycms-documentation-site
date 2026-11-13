"use client";

import { useEffect } from "react";

/**
 * The Google tag (GA4), loaded at hydration — the partner of the marketing
 * site's GtmLoader (agility-website-nextjs-2026, PR #407). Both load the same
 * tag the same way, so the docs and marketing pages report alike.
 *
 * WHY. G-938BW3FYEX (property 354952039, the one we report from) used to reach
 * these pages only inside GTM's Google Ads tag: Google combines the two in one
 * Google tag (GT-M34BDV7). Once that combination is split, so that the marketing
 * site's ad pixels can wait for the first interaction, GTM stops sending GA4 page
 * views here. This sends them directly instead.
 *
 * WHERE FROM. On agilitycms.com, from /api/gw, the marketing site's Google tag
 * gateway (a Netlify edge function on the same domain; /docs is proxied there).
 * It serves the tag first-party, with the visitor's location forwarded to
 * Google. Any other host (docs.agilitycms.com, the Vercel deployment) has no
 * gateway, so the tag comes from googletagmanager.com.
 *
 * Inert unless GOOGLE_TAG_ID is set. Set it ONLY together with splitting
 * G-938BW3FYEX from AW-962699110 in the Google tag settings, or every page view
 * counts twice (GTM's Ads tag would still carry it).
 *
 * CONSENT. None, matching how this site loads GTM today (unconditionally, via
 * @next/third-parties). The marketing site pushes Consent Mode defaults from its
 * cookie banner first; this site has no banner. That gap predates this change.
 */

/** Hosts where the marketing site's gateway answers /api/gw. */
const GATEWAY_HOSTS = new Set(["agilitycms.com", "www.agilitycms.com"]);
const GATEWAY_PATH = "/api/gw";

type Win = typeof window & { dataLayer?: unknown[] };

/** Where to load the tag from: the gateway on the apex, Google anywhere else. */
export function googleTagSrc(tagId: string, gateway: boolean, hostname: string): string {
	const id = encodeURIComponent(tagId);
	return gateway && GATEWAY_HOSTS.has(hostname)
		? `${GATEWAY_PATH}/?id=${id}`
		: `https://www.googletagmanager.com/gtag/js?id=${id}`;
}

let requested = false;

export default function GoogleTag({ tagId, gateway = false }: { tagId: string; gateway?: boolean }) {
	useEffect(() => {
		// Once per page load: client navigations re-render the layout, and GA4's
		// enhanced measurement already records those as page views.
		if (requested) return;
		requested = true;
		const w = window as Win;
		w.dataLayer = w.dataLayer || [];
		const gtag: (...args: unknown[]) => void = function () {
			// gtag commands must be pushed as an Arguments object, not an array.
			w.dataLayer!.push(arguments);
		};
		gtag("js", new Date());
		gtag("config", tagId);
		const script = document.createElement("script");
		script.async = true;
		script.src = googleTagSrc(tagId, gateway, window.location.hostname);
		document.head.appendChild(script);
	}, [tagId, gateway]);

	return null;
}
