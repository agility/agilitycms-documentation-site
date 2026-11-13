"use client";

import { useEffect, useRef } from "react";
import type { Permissions } from "lib/analytics/consent";
import { useConsent } from "lib/analytics/use-consent";

/**
 * Loads Google Tag Manager only when the visitor's consent allows it — partner of
 * the marketing site's src/components/analytics/gtm-loader.client.tsx. Replaces
 * @next/third-parties' GoogleTagManager, which loaded unconditionally.
 *
 * - Consent Mode v2 defaults are pushed BEFORE gtm.js, from the visitor's actual
 *   permissions, with `ads_data_redaction` when ads are denied. Google's tags read
 *   them; the other vendors are told directly (tellVendors).
 * - GTM-NJW8WMX's non-Google tags check consent themselves (container v97), so a
 *   mixed choice (analytics yes, marketing no) loads GTM and each tag decides.
 * - Before a choice: opt-out regions load, opt-in regions don't.
 * - A choice made on the page updates consent at once. A Decline after GTM loaded
 *   can't unload what already ran, so it updates consent, revokes in each vendor,
 *   and later pages don't load GTM.
 *
 * WHEN: at hydration, as this site always has. (The marketing site defers GTM to
 * the first interaction for its Lighthouse score; that is a separate choice.)
 * GA4 reaches these pages through GTM's Google Ads tag, which Google bundles with
 * G-938BW3FYEX.
 */

type Win = typeof window & {
	dataLayer?: unknown[];
	clarity?: (...args: unknown[]) => void;
	fbq?: (...args: unknown[]) => void;
	uetq?: unknown[];
};

const gtag: (...args: unknown[]) => void = function () {
	const w = window as Win;
	w.dataLayer = w.dataLayer || [];
	// gtag commands must be pushed as an Arguments object, not an array.
	w.dataLayer.push(arguments);
};

const consentState = (p: Permissions) => {
	const ads = p.marketing ? "granted" : "denied";
	return {
		ad_storage: ads,
		ad_user_data: ads,
		ad_personalization: ads,
		analytics_storage: p.analytics ? "granted" : "denied",
		functionality_storage: "granted",
		security_storage: "granted",
	};
};

const allowed = (p: Permissions) => p.analytics || p.marketing;

/** Tell the non-Google vendors directly; their tags may not read Consent Mode. Never throws. */
function tellVendors(p: Permissions): void {
	const w = window as Win;
	try {
		w.clarity?.("consentv2", {
			ad_Storage: p.marketing ? "granted" : "denied",
			analytics_Storage: p.analytics ? "granted" : "denied",
		});
	} catch {}
	try {
		w.fbq?.("consent", p.marketing ? "grant" : "revoke");
	} catch {}
	try {
		if (Array.isArray(w.uetq)) w.uetq.push("consent", "update", { ad_storage: p.marketing ? "granted" : "denied" });
	} catch {}
}

export default function GtmLoader({ gtmId }: { gtmId: string }) {
	const { permissions } = useConsent();
	const loaded = useRef(false);

	useEffect(() => {
		if (!permissions) return;

		if (!loaded.current) {
			if (!allowed(permissions)) return;
			gtag("consent", "default", consentState(permissions));
			if (!permissions.marketing) gtag("set", "ads_data_redaction", true);
			loaded.current = true;
			const w = window as Win;
			w.dataLayer = w.dataLayer || [];
			w.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
			const script = document.createElement("script");
			script.async = true;
			script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`;
			document.head.appendChild(script);
			return;
		}

		// Already loaded: a choice was made on this page.
		gtag("consent", "update", consentState(permissions));
		if (!permissions.marketing) gtag("set", "ads_data_redaction", true);
		tellVendors(permissions);
	}, [permissions, gtmId]);

	return null;
}
