import "server-only";

import { gql } from "lib/cms/gql";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { getMainSiteContentItem } from "lib/cms/getMainSiteContent";

export interface HeaderData {
	mainMenuLinks: { name: string; href: string }[];
	primaryDropdownLinks: { text: string; href: string }[];
	secondaryDropdownLinks: { text: string; href: string }[];
	marketingContent: string | null;
	preHeader: {
		showPreHeader: boolean;
		signInLink: any;
		documentationLink: any;
	};
}

const HEADER_QUERY = `
{
	header {
		fields {
			showPreHeader
			signInLink { text href target }
			documentationLink { text href target }
			primaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } } }
			secondaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } } }
		}
	}
}`;

/**
 * Everything the site header needs: top-nav links from the sitemap, the
 * APIs & SDKs dropdowns from the docs instance's `header` container, and the
 * preheader marketing banner from the main marketing instance.
 *
 * All three sources are cached with their own tags (sitemap / graphql /
 * main-site) — see the matching modules in lib/cms. The active-nav state is
 * computed client-side from the pathname (components/common/Header.js).
 */
export const getHeaderData = async ({
	locale,
	preview,
}: {
	locale: string;
	preview: boolean;
}): Promise<HeaderData> => {
	const [sitemap, headerResult, mainSiteHeader] = await Promise.all([
		getSitemapFlat({ locale, preview }),
		gql<{ header: any[] }>({ query: HEADER_QUERY, locale, preview }),
		getMainSiteContentItem({ contentID: 22 }),
	]);

	// Top-level, menu-visible sitemap nodes ("/home" normalizes to "/").
	// Hrefs are locale-prefixed for non-default locales (localizeUrl).
	const { localizeUrl } = await import("lib/i18n/config");
	const mainMenuLinks = Object.values(sitemap)
		.filter((node) => node.visible?.menu && node.path.split("/").length <= 2)
		.map((node) => ({
			name: node.menuText,
			href: localizeUrl(node.path === "/home" ? "/" : node.path, locale),
		}));

	const headerFields = headerResult.header?.[0]?.fields;

	return {
		mainMenuLinks,
		primaryDropdownLinks: (headerFields?.primaryDropdownLinks || []).map(
			(l: any) => l.fields.link
		),
		secondaryDropdownLinks: (headerFields?.secondaryDropdownLinks || []).map(
			(l: any) => l.fields.link
		),
		marketingContent: mainSiteHeader?.fields?.marketingBanner || null,
		preHeader: {
			showPreHeader: headerFields?.showPreHeader === "true" || headerFields?.showPreHeader === true,
			signInLink: headerFields?.signInLink || null,
			documentationLink: headerFields?.documentationLink || null,
		},
	};
};
