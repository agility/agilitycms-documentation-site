import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";

interface Params {
	pageID: number;
	locale: string;
	preview: boolean;
	contentLinkDepth?: number;
}

/**
 * A single page (with its zones/modules). Published requests are cached under
 * the `agility-page-{pageID}-{locale}` tag — the SAME tag getAgilityPage uses
 * and /api/revalidate busts on publish — so this composes cleanly with the rest
 * of the cache layer. Preview requests bypass the cache.
 *
 * `contentLinkDepth: 1` expands each module's content item one level so callers
 * can read `zone[].item.properties` (e.g. `modified` for the sitemap).
 */
export const getPage = async (params: Params): Promise<any> => {
	if (params.preview) return fetchPage(params);
	return cachedPage(params);
};

const cachedPage = async (params: Params): Promise<any> => {
	"use cache";
	cacheTag(`agility-page-${params.pageID}-${params.locale}`);
	cacheLife("days");
	return fetchPage({ ...params, preview: false });
};

const fetchPage = async (params: Params): Promise<any> => {
	const sdk = getAgilitySDK_NonReact({ isPreview: params.preview });
	return sdk.getPage({
		pageID: params.pageID,
		languageCode: params.locale,
		contentLinkDepth: params.contentLinkDepth ?? 1,
		expandAllContentLinks: false,
	});
};
