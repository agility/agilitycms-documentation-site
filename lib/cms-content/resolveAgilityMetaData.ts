import { Metadata } from "next";
import { AgilityPageData } from "lib/cms/getAgilityPage";
import { isNoIndexPath } from "lib/docs/legacyFrameworks";

const SITE_URL = "https://agilitycms.com";

/**
 * Cloudinary text-overlay OG image, same approach the old HeadSEO used.
 */
const createSharingImage = (text: string) => {
	const imageTransformations = ["w_1600", "h_900", "c_fill", "q_auto", "f_auto"].join(",");
	const textTransformations = [
		"w_1600",
		"c_fit",
		"g_center",
		"co_white",
		`l_text:muli_96_center:${encodeURIComponent(text).replaceAll("%2C", "%E2%80%9A")}`,
	].join(",");
	return `https://res.cloudinary.com/agility-cms/image/upload/${imageTransformations}/${textTransformations}/docs/agility-og-docs.png`;
};

/**
 * Build the Next Metadata object from Agility page data (adapted from the
 * marketing site's resolveAgilityMetaData). Titles/descriptions prefer the
 * dynamic item's fields, then the page SEO fields — same precedence the old
 * Pages-Router Layout.js used.
 */
export const resolveAgilityMetaData = (agilityData: AgilityPageData): Metadata => {
	const { sitemapNode, page, dynamicPageItem } = agilityData;
	if (!sitemapNode || !page) return {};

	let title = sitemapNode.title;
	if (dynamicPageItem?.fields?.metaTitle) title = dynamicPageItem.fields.metaTitle;

	let description = page.seo?.metaDescription || "";
	if (dynamicPageItem?.fields?.description) description = dynamicPageItem.fields.description;
	if (dynamicPageItem?.seo?.metaDescription) description = dynamicPageItem.seo.metaDescription;

	// Archived framework docs are kept reachable (no 404 for existing deep links)
	// but must not be indexed — see lib/docs/legacyFrameworks.ts.
	//
	// NB: do NOT reintroduce `dynamicPageItem.seo.sitemapVisible === false` here.
	// On a DocArticle that flag is false by default (it concerns sitemap/menu
	// placement of dynamic items, not robots), so honouring it emitted
	// `noindex` on EVERY article — deindexing the whole knowledgebase while
	// sitemap.xml still advertised all ~306 URLs. Regression from the App Router
	// migration (7839777), fixed 2026-07-28.
	const noIndex = !!process.env.ROBOTS_NO_INDEX || isNoIndexPath(sitemapNode.path);

	const path = sitemapNode.path === "/home" ? "" : sitemapNode.path;
	const canonical = `${SITE_URL}/docs${path}`;

	const ogImage = createSharingImage(title);

	// Extract <meta name/property + content> pairs out of the CMS metaHTML field.
	const other: Record<string, string> = {};
	const metaHTML: string = page.seo?.metaHTML || "";
	const metaRegex = /<meta\s+(?:name|property)=["']([^"']+)["']\s+content=["']([^"']*)["']/gi;
	let match: RegExpExecArray | null;
	while ((match = metaRegex.exec(metaHTML)) !== null) {
		other[match[1]] = match[2];
	}

	return {
		metadataBase: new URL(SITE_URL),
		title: `${title} | Agility Docs`,
		description,
		keywords: page.seo?.metaKeywords || undefined,
		alternates: { canonical },
		robots: noIndex ? { index: false } : undefined,
		openGraph: {
			title: `${title} | Agility Docs`,
			description,
			url: canonical,
			images: [ogImage],
		},
		twitter: {
			site: "@agilitycms",
			card: "summary_large_image",
			images: [ogImage],
		},
		generator: "Agility CMS",
		other,
	};
};
