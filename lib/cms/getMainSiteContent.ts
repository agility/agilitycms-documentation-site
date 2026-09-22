import "server-only";

import { cacheLife, cacheTag } from "next/cache";

/**
 * Content read from the MAIN marketing instance (`MAIN_AGILITY_SITE_GUID` —
 * the 2026 agilitycms.com rebuild), not the docs instance.
 *
 * This reintroduces a cross-instance dependency that the 2026-07 redesign
 * deliberately removed, so it is deliberately one-way and fail-soft: the docs
 * chrome must render fine when the marketing instance is unreachable,
 * unconfigured, or has nothing published. Every failure path returns null and
 * the bar simply doesn't render.
 *
 * ⚠️ **No webhook reaches us from that instance.** The docs `/api/revalidate`
 * is wired to the docs instance only, so a marketing publish does NOT bust this
 * cache — hence `cacheLife("hours")` rather than the `days` the docs-instance
 * primitives use. The `main-site-header` tag exists so that webhook COULD bust
 * it if the marketing site is ever pointed here.
 */

/** Where main-site links point. Docs is served at agilitycms.com/docs, so this is the same origin in production. */
export const MAIN_SITE_URL = (
	process.env.MAIN_AGILITY_SITE_URL || "https://agilitycms.com"
).replace(/\/$/, "");

/**
 * The marketing instance's own locale, which is NOT the docs site's. Docs can
 * add locales (AGILITY_LOCALES) that marketing doesn't have, and asking that
 * instance for one it doesn't publish returns nothing — so the banner is read
 * from a fixed locale rather than the visitor's.
 */
const MAIN_SITE_LOCALE = "en-us";

export interface MainSiteBanner {
	/** Marketing message as HTML, hrefs already absolute. Empty when the marketing team has cleared it. */
	html: string;
	/** The marketing side's own "Hide Marketing Banner" toggle. */
	hidden: boolean;
}

const BANNER_QUERY = `
{
	header {
		fields {
			marketingBanner
			hideMarketingBanner
		}
	}
}`;

/**
 * Rewrite a main-site href so it still works from the docs site.
 *
 * Agility stores site-relative hrefs with a `~/` prefix, and the marketing CMS
 * also holds plain `/some-page` values. Either one is wrong here: the docs app
 * runs under basePath `/docs`, so `/demo-request` would resolve to
 * `/docs/demo-request`, and on a preview domain it wouldn't be the marketing
 * site at all. Absolute URLs, anchors and non-http schemes are left alone.
 */
export const toMainSiteUrl = (href: string): string => {
	if (!href) return href;
	const url = href.startsWith("~/") ? href.slice(1) : href;
	if (/^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url)) return url;
	return url.startsWith("/") ? `${MAIN_SITE_URL}${url}` : url;
};

/**
 * Absolutize the hrefs inside the marketing message, and drop executable
 * markup. The docs site renders author-supplied `<script>` by design in article
 * bodies, but this HTML crosses an instance boundary into every page's chrome,
 * which is a different trust question — a marketing-side edit should not be
 * able to run script on the docs site.
 */
const prepareBannerHtml = (html: string): string =>
	html
		.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
		.replace(/href=(["'])(.*?)\1/gi, (_match, quote, href) => `href=${quote}${toMainSiteUrl(href)}${quote}`);

export const getMainSiteBanner = async ({
	preview,
}: {
	preview: boolean;
}): Promise<MainSiteBanner | null> => {
	// Unconfigured is a normal state (a fresh clone, a preview branch without
	// the marketing keys) — not an error worth logging on every render.
	if (!process.env.MAIN_AGILITY_SITE_GUID) return null;
	if (preview) return fetchBanner(true);
	return cachedBanner();
};

const cachedBanner = async (): Promise<MainSiteBanner | null> => {
	"use cache";
	cacheTag("main-site-header");
	cacheLife("hours");
	return fetchBanner(false);
};

const fetchBanner = async (preview: boolean): Promise<MainSiteBanner | null> => {
	const apiKey = preview
		? process.env.MAIN_AGILITY_SITE_API_PREVIEW_KEY
		: process.env.MAIN_AGILITY_SITE_API_FETCH_KEY;
	if (!apiKey) return null;

	try {
		const res = await fetch(
			`https://api.aglty.io/v1/${process.env.MAIN_AGILITY_SITE_GUID}/${
				preview ? "preview" : "fetch"
			}/${MAIN_SITE_LOCALE}/graphql`,
			{
				method: "POST",
				headers: { "Content-Type": "application/json", apiKey },
				body: JSON.stringify({ query: BANNER_QUERY }),
			}
		);

		if (!res.ok) {
			console.error(`getMainSiteBanner: Agility returned ${res.status}`);
			return null;
		}

		const json = await res.json();
		const fields = json?.data?.header?.[0]?.fields;
		if (!fields) return null;

		return {
			html: fields.marketingBanner ? prepareBannerHtml(fields.marketingBanner) : "",
			// GraphQL types this as a real boolean; the Management API stores the
			// string "true"/"false", so both shapes are accepted.
			hidden: fields.hideMarketingBanner === true || fields.hideMarketingBanner === "true",
		};
	} catch (error) {
		// A marketing-instance outage must never take the docs chrome with it.
		console.error("getMainSiteBanner failed:", error);
		return null;
	}
};
