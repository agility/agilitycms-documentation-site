import "server-only";

import { gql } from "lib/cms/gql";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";

export interface HeaderData {
	mainMenuLinks: { name: string; href: string }[];
	primaryDropdownLinks: { text: string; href: string }[];
	secondaryDropdownLinks: { text: string; href: string }[];
}

const HEADER_QUERY = `
{
	header {
		fields {
			primaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } } }
			secondaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } } }
		}
	}
}`;

/**
 * Everything the docs topbar needs: top-nav links from the sitemap and the
 * APIs & SDKs dropdowns from the docs instance's `header` container. The
 * chrome is docs-scoped (Stripe/Vercel docs pattern) — no cross-instance
 * marketing banner. Active-nav state is computed client-side from the
 * pathname (components/common/Header.js).
 */
export const getHeaderData = async ({
	locale,
	preview,
}: {
	locale: string;
	preview: boolean;
}): Promise<HeaderData> => {
	const [sitemap, headerResult] = await Promise.all([
		getSitemapFlat({ locale, preview }),
		gql<{ header: any[] }>({ query: HEADER_QUERY, locale, preview }),
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
	};
};
