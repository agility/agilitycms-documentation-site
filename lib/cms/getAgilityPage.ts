import "server-only";

import { isDevMode } from "lib/cms/isDevMode";

import { cacheLife, cacheTag } from "next/cache";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";
import { getSitemapFlat, SitemapNode } from "lib/cms/getSitemapFlat";
import { getContentItem } from "lib/cms/getContentItem";

export interface AgilityPageData {
	page: any | null;
	sitemapNode: SitemapNode | null;
	dynamicPageItem: any | null;
	pageTemplateName: string | null;
	languageCode: string;
	isPreview: boolean;
	isDevelopmentMode: boolean;
	/** Set when the sitemap node is a redirect — caller should redirect(). */
	redirectUrl: string | null;
	notFound: boolean;
}

interface Params {
	locale: string;
	slug: string[] | undefined;
	preview: boolean;
}

/**
 * Fetch everything needed to render a CMS page, composed from the cached
 * primitives (instead of @agility/nextjs's getAgilityPageProps, whose fetch
 * options predate Cache Components):
 *
 *   flat sitemap (tag agility-sitemap-flat-{locale})
 *     -> resolve node by path
 *   page by ID (tag agility-page-{pageID}-{locale})
 *   dynamic page item by contentID (tag agility-content-{contentID}-{locale})
 *
 * Each layer carries its own cache tag, so the /api/revalidate webhook
 * invalidates exactly what changed: publishing an article busts that
 * article's tag; publishing a page busts the page + sitemap tags.
 */
export const getAgilityPage = async ({ locale, slug, preview }: Params): Promise<AgilityPageData> => {
	const isDevelopmentMode = isDevMode();

	const notFoundResult: AgilityPageData = {
		page: null,
		sitemapNode: null,
		dynamicPageItem: null,
		pageTemplateName: null,
		languageCode: locale,
		isPreview: preview,
		isDevelopmentMode,
		redirectUrl: null,
		notFound: true,
	};

	const sitemap = await getSitemapFlat({ locale, preview });
	const paths = Object.keys(sitemap);
	if (paths.length === 0) return notFoundResult;

	// Resolve the sitemap node: no slug means the home page (first node).
	const path = slug && slug.length > 0 ? `/${slug.join("/")}` : paths[0];
	const node = sitemap[path];
	if (!node) return notFoundResult;

	if (node.redirect) {
		return { ...notFoundResult, sitemapNode: node, redirectUrl: node.redirect, notFound: false };
	}
	if (node.isFolder) return notFoundResult;

	const page = await getPageByID({ pageID: node.pageID, locale, preview });
	if (!page) return notFoundResult;

	// Dynamic pages (e.g. doc articles) hang a content item off the node.
	let dynamicPageItem: any = null;
	if (node.contentID && node.contentID > 0) {
		dynamicPageItem = await getContentItem({
			contentID: node.contentID,
			locale,
			preview,
			contentLinkDepth: 2,
		});
	}

	return {
		page,
		sitemapNode: node,
		dynamicPageItem,
		pageTemplateName: (page.templateName || "").replace(/[^0-9a-zA-Z]/g, ""),
		languageCode: locale,
		isPreview: preview,
		isDevelopmentMode,
		redirectUrl: null,
		notFound: false,
	};
};

const getPageByID = async ({
	pageID,
	locale,
	preview,
}: {
	pageID: number;
	locale: string;
	preview: boolean;
}): Promise<any> => {
	if (preview) return fetchPage(pageID, locale, true);
	return cachedPage(pageID, locale);
};

const cachedPage = async (pageID: number, locale: string): Promise<any> => {
	"use cache";
	cacheTag(`agility-page-${pageID}-${locale}`);
	cacheLife("days");
	return fetchPage(pageID, locale, false);
};

const fetchPage = async (pageID: number, locale: string, isPreview: boolean): Promise<any> => {
	const sdk = getAgilitySDK_NonReact({ isPreview });
	return sdk.getPage({
		pageID,
		languageCode: locale,
		contentLinkDepth: 2,
		expandAllContentLinks: false,
	});
};
