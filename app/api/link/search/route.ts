import { NextRequest, NextResponse } from "next/server";
import agility from "@agility/content-fetch";
import FuzzySearch from "fuzzy-search";
import { defaultLocale } from "lib/i18n/config";

const basePath = "/docs";

/**
 * Fuzzy link search over the sitemap (used by the block editor's link tool).
 * Always searches preview content so editors can link to unpublished pages.
 */
export async function GET(req: NextRequest) {
	const api = agility.getApi({
		guid: process.env.AGILITY_GUID,
		apiKey: process.env.AGILITY_API_PREVIEW_KEY,
		isPreview: true,
	});

	const sitemap = await api.getSitemapFlat({
		channelName: process.env.AGILITY_SITEMAP || "website",
		languageCode: defaultLocale,
	});

	const query = req.nextUrl.searchParams.get("q") || "";

	const searchableArray = Object.values(sitemap);
	const searcher = new FuzzySearch(searchableArray, ["title", "menuText", "path"]);
	const searchResults = searcher.search(query);

	const results = searchResults.map((item: any) => ({
		href: `${basePath}${item.path}`,
		name: item.title,
		description: `${basePath}${item.path}`,
	}));

	return NextResponse.json({ success: true, items: results });
}
