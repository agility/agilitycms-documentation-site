import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import agility from "@agility/content-fetch";

/**
 * Content from the OLD main marketing site's Agility instance
 * (MAIN_AGILITY_SITE_GUID) — the docs site pulls its footer nav (contentID 16)
 * and marketing banner/preheader (contentID 22) from there so chrome stays in
 * sync with agilitycms.com.
 *
 * No webhook fires from that instance into this app, so this cache is
 * time-based only (hours). Tag `main-site-content-{contentID}` exists so the
 * /api/revalidate webhook COULD bust it if the main site ever forwards its
 * publish events here.
 *
 * NOTE (coordination): when the new marketing instance launches these content
 * IDs die — replace with the agreed JSON nav contract (rebuild plan §8).
 */
export const getMainSiteContentItem = async ({
	contentID,
	expandAllContentLinks = false,
}: {
	contentID: number;
	expandAllContentLinks?: boolean;
}): Promise<any> => {
	"use cache";
	cacheTag(`main-site-content-${contentID}`);
	cacheLife("hours");

	const api = agility.getApi({
		guid: process.env.MAIN_AGILITY_SITE_GUID,
		apiKey: process.env.MAIN_AGILITY_SITE_API_KEY,
	});

	return api.getContentItem({
		contentID,
		languageCode: "en-ca",
		expandAllContentLinks,
	});
};
