import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { getAgilitySDK_NonReact } from "lib/cms/getAgilitySDK";

interface Params {
	referenceName: string;
	locale: string;
	preview: boolean;
	take?: number;
	skip?: number;
	sort?: string;
	direction?: "asc" | "desc";
	contentLinkDepth?: number;
	expandAllContentLinks?: boolean;
}

/**
 * Content list by container reference name. Published requests are cached
 * under the `agility-content-{referenceName}-{locale}` tag (lowercased —
 * matches the /api/revalidate webhook); preview requests bypass the cache.
 *
 * NOTE: the Agility APIs cap lists at 250 items per request — pass take/skip
 * to page through larger containers (see AGENTS.md gotchas).
 */
export const getContentList = async (params: Params): Promise<any> => {
	if (params.preview) return fetchContentList(params);
	return cachedContentList(params);
};

const cachedContentList = async (params: Params): Promise<any> => {
	"use cache";
	cacheTag(`agility-content-${params.referenceName.toLowerCase()}-${params.locale}`);
	cacheLife("days");
	return fetchContentList({ ...params, preview: false });
};

const fetchContentList = async (params: Params): Promise<any> => {
	const sdk = getAgilitySDK_NonReact({ isPreview: params.preview });
	return sdk.getContentList({
		referenceName: params.referenceName,
		languageCode: params.locale,
		take: params.take ?? 50,
		skip: params.skip ?? 0,
		sort: params.sort,
		direction: params.direction,
		contentLinkDepth: params.contentLinkDepth ?? 1,
		expandAllContentLinks: params.expandAllContentLinks ?? false,
	});
};
