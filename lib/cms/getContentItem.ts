import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { ContentItem } from "@agility/content-fetch";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";

interface Params {
	contentID: number;
	locale: string;
	preview: boolean;
	contentLinkDepth?: number;
	expandAllContentLinks?: boolean;
}

/**
 * Single content item. Published requests are cached under the
 * `agility-content-{contentID}-{locale}` tag (instant invalidation via the
 * /api/revalidate webhook); preview requests bypass the cache.
 */
export const getContentItem = async <T = any>(params: Params): Promise<ContentItem<T>> => {
	if (params.preview) return fetchContentItem<T>(params);
	return cachedContentItem<T>(params);
};

const cachedContentItem = async <T>(params: Params): Promise<ContentItem<T>> => {
	"use cache";
	cacheTag(`agility-content-${params.contentID}-${params.locale}`);
	cacheLife("days");
	return fetchContentItem<T>({ ...params, preview: false });
};

const fetchContentItem = async <T>(params: Params): Promise<ContentItem<T>> => {
	const sdk = getAgilitySDK_NonReact({ isPreview: params.preview });
	return sdk.getContentItem({
		contentID: params.contentID,
		languageCode: params.locale,
		contentLinkDepth: params.contentLinkDepth ?? 1,
		expandAllContentLinks: params.expandAllContentLinks ?? false,
	});
};
