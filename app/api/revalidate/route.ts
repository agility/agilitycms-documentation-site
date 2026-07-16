import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest } from "next/server";
import agilitySDK from "@agility/content-fetch";
import { defaultLocale } from "lib/i18n/config";

interface IRevalidateRequest {
	state: string;
	instanceGuid: string;
	languageCode?: string;
	referenceName?: string;
	contentID?: number;
	contentVersionID?: number;
	pageID?: number;
	pageVersionID?: number;
	changeDateUTC?: string;
}

/**
 * Agility publish webhook -> instant cache invalidation (pattern from
 * demosite2025 + the marketing site, on Next 16's revalidateTag(tag, 'max')
 * stale-while-revalidate semantics).
 *
 * Tag scheme (must match lib/cms exactly):
 *   agility-content-{contentID}-{locale}        content item
 *   agility-content-{referenceName}-{locale}    content list (lowercased)
 *   agility-page-{pageID}-{locale}              page
 *   agility-sitemap-flat-{locale}               flat sitemap
 *   agility-graphql-{locale}                    any GraphQL join (coarse)
 *
 * Configure in Agility: Settings > Webhooks -> POST {site}/docs/api/revalidate
 * on publish/unpublish events.
 */
export async function POST(req: NextRequest) {
	const data = (await req.json()) as IRevalidateRequest;

	const isPublish = data.state === "Published";
	const isRemoval = data.state === "Deleted" || data.state === "Unpublished";
	const languageCode = data.languageCode || defaultLocale;

	const revalidateSitemapTags = () => {
		revalidateTag(`agility-sitemap-flat-${languageCode}`, "max");
	};

	const hasContentOrPage = !!data.referenceName || (data.pageID !== undefined && data.pageID > 0);

	if ((isPublish || isRemoval) && hasContentOrPage) {
		// Any content/page change can affect GraphQL joins (sidebar, changelog, header).
		revalidateTag(`agility-graphql-${languageCode}`, "max");

		// Fetch a fresh sitemap (no-store) so we can revalidate the full path.
		let sitemapFlat: { [path: string]: any } = {};
		if (isPublish && (data.contentID || data.pageID)) {
			const agilityClient = agilitySDK.getApi({
				guid: process.env.AGILITY_GUID,
				apiKey: process.env.AGILITY_API_FETCH_KEY,
			});
			agilityClient.config.fetchConfig = { cache: "no-store" };
			try {
				sitemapFlat = await agilityClient.getSitemapFlat({
					channelName: process.env.AGILITY_SITEMAP || "website",
					languageCode,
				});
			} catch (e) {
				console.error("revalidate: sitemap fetch failed", e);
			}
		}

		if (data.referenceName) {
			// Content item change: bust the item tag AND its container's list tag.
			const listTag = `agility-content-${data.referenceName.toLowerCase()}-${languageCode}`;
			const itemTag = `agility-content-${data.contentID}-${languageCode}`;
			revalidateTag(listTag, "max");
			revalidateTag(itemTag, "max");
			console.info("revalidate: content tags", listTag, itemTag);

			if (isPublish) {
				const sitemapNode = Object.values(sitemapFlat).find(
					(s: any) => s.contentID === data.contentID
				);
				if (sitemapNode) {
					revalidatePath(`/${languageCode}${sitemapNode.path}`);
					revalidateSitemapTags(); // dynamic item publish can change the sitemap
					console.info("revalidate: path", sitemapNode.path);
				}
			} else {
				revalidateSitemapTags(); // delete/unpublish may remove a node
			}
		} else if (data.pageID !== undefined && data.pageID > 0) {
			// Page change: bust the page tag; any page change affects the sitemap.
			const pageTag = `agility-page-${data.pageID}-${languageCode}`;
			revalidateTag(pageTag, "max");
			revalidateSitemapTags();
			console.info("revalidate: page tag", pageTag);

			if (isPublish) {
				const sitemapNode = Object.values(sitemapFlat).find(
					(s: any) => s.pageID === data.pageID
				);
				if (sitemapNode) {
					revalidatePath(`/${languageCode}${sitemapNode.path}`);
					console.info("revalidate: path", sitemapNode.path);
				}
			}
		}
	} else if (data.contentID === undefined && data.pageID === undefined) {
		// No content/page id => URL-redirection change. Trigger a full rebuild
		// if a build hook is configured (same escape hatch as the references).
		const hookUrl = process.env.BUILD_HOOK_URL;
		if (hookUrl) await fetch(hookUrl, { method: "POST" });
	}

	return new Response("OK", { status: 200 });
}
