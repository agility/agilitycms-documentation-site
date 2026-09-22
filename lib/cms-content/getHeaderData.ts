import "server-only";

import { gql } from "lib/cms/gql";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { prepareBannerHtml, toMainSiteUrl } from "lib/cms/getMainSiteContent";

export interface DropdownLink {
	text: string;
	href: string;
	/** Icon slug from the Link model's `Icon` dropdown (maps to NAV_ICONS). */
	icon?: string;
}

export interface BannerCta {
	text: string;
	href: string;
	target?: string;
}

export interface HeaderData {
	mainMenuLinks: { name: string; href: string }[];
	primaryDropdownLinks: DropdownLink[];
	secondaryDropdownLinks: DropdownLink[];
	/**
	 * Marketing bar: docs-owned CTAs pointing back at the marketing site, plus
	 * the message to show when the marketing instance has none.
	 */
	preHeader: { show: boolean; ctas: BannerCta[]; fallbackMessage?: string };
}

const HEADER_QUERY = `
{
	header {
		fields {
			primaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } icon } }
			secondaryDropdownLinks(sort: "properties.itemOrder") { fields { link { text href } icon } }
			showPreHeader
			fallbackMarketingMessage
			marketingCta1 { text href target }
			marketingCta2 { text href target }
		}
	}
}`;

/**
 * Everything the docs topbar needs: top-nav links from the sitemap and the
 * APIs & SDKs dropdowns from the docs instance's `header` container, plus the
 * marketing bar's docs-owned CTAs. Active-nav state is computed client-side
 * from the pathname (components/common/Header.js).
 *
 * The marketing bar's MESSAGE comes from the marketing instance
 * (lib/cms/getMainSiteContent) but its CTAs are deliberately read from here, so
 * the docs site decides where it links back to. Mirroring the marketing side's
 * own CTAs would have imported its "Docs" link — a link to the page you are
 * already on.
 *
 * Both the header and the marketing bar call this, from separate Suspense
 * boundaries. That is one fetch, not two: same arguments, same `use cache` entry.
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

	// Agility Link fields come back present-but-blank when an editor hasn't
	// filled them, so a truthy `href` AND `text` is the real "is this set" test.
	const ctas: BannerCta[] = [headerFields?.marketingCta1, headerFields?.marketingCta2]
		.filter((cta: any) => cta?.href && cta?.text)
		.map((cta: any) => ({
			text: cta.text,
			href: toMainSiteUrl(cta.href),
			target: cta.target || undefined,
		}));

	return {
		mainMenuLinks,
		primaryDropdownLinks: (headerFields?.primaryDropdownLinks || []).map(
			(l: any) => ({ ...l.fields.link, icon: l.fields.icon || undefined })
		),
		secondaryDropdownLinks: (headerFields?.secondaryDropdownLinks || []).map(
			(l: any) => ({ ...l.fields.link, icon: l.fields.icon || undefined })
		),
		preHeader: {
			show: headerFields?.showPreHeader === true || headerFields?.showPreHeader === "true",
			ctas,
			// An Html field comes back as an empty string, not null, once an editor
			// has opened and cleared it — so emptiness, not presence, is the test.
			fallbackMessage: headerFields?.fallbackMarketingMessage?.trim()
				? prepareBannerHtml(headerFields.fallbackMarketingMessage)
				: undefined,
		},
	};
};
