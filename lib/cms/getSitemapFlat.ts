import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";

export interface SitemapNode {
	title: string;
	name: string;
	pageID: number;
	menuText: string;
	visible: { menu: boolean; sitemap: boolean };
	path: string;
	/** Set on a link page. The Fetch API sends `{ url, target }`; read it with redirectTarget(). */
	redirect: string | { url: string; target?: string } | null;
	isFolder: boolean;
	contentID?: number;
}

/**
 * The URL a link page points at, or null. Agility writes in-site links as
 * `~/path`; `~` is the site root, which basePath (/docs) already covers.
 */
export const redirectTarget = (redirect: SitemapNode["redirect"]): string | null => {
	const url = typeof redirect === "string" ? redirect : redirect?.url;
	if (!url) return null;
	return url.startsWith("~/") ? url.slice(1) : url;
};

export type SitemapFlat = { [path: string]: SitemapNode };

interface Params {
	locale: string;
	preview: boolean;
}

/**
 * Flat sitemap for a locale. Published requests are cached under the
 * `agility-sitemap-flat-{locale}` tag (revalidated instantly by the
 * /api/revalidate webhook on page publish); preview requests bypass the cache.
 */
export const getSitemapFlat = async ({ locale, preview }: Params): Promise<SitemapFlat> => {
	if (preview) return fetchSitemapFlat(locale, true);
	return cachedSitemapFlat(locale);
};

const cachedSitemapFlat = async (locale: string): Promise<SitemapFlat> => {
	"use cache";
	cacheTag(`agility-sitemap-flat-${locale}`);
	cacheLife("days");
	return fetchSitemapFlat(locale, false);
};

const fetchSitemapFlat = async (locale: string, isPreview: boolean): Promise<SitemapFlat> => {
	const sdk = getAgilitySDK_NonReact({ isPreview });
	return sdk.getSitemapFlat({
		channelName: process.env.AGILITY_SITEMAP || "website",
		languageCode: locale,
	});
};
