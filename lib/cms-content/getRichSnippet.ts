import { AgilityPageData } from "lib/cms/getAgilityPage";

const SITE_URL = "https://agilitycms.com/docs";

const PUBLISHER = {
	"@type": "Organization",
	name: "Agility CMS",
	logo: {
		"@type": "ImageObject",
		url: "https://agilitycms.com/assets/agility-logo.svg",
	},
};

const WEBSITE_SCHEMA = {
	"@context": "https://schema.org",
	"@type": "WebSite",
	name: "Agility CMS Documentation",
	url: SITE_URL,
};

/**
 * JSON-LD for docs pages (principles from the marketing site's
 * getRichSnippet: string-returning builder, injected as an in-body
 * <script type="application/ld+json"> — NOT via the Metadata API).
 *
 * - Hub (home): WebSite
 * - Doc articles (dynamic DocArticle items): TechArticle + BreadcrumbList
 * - Other static pages: BreadcrumbList when they're nested
 */
export const getRichSnippet = ({ sitemapNode, dynamicPageItem }: AgilityPageData): string | null => {
	if (!sitemapNode) return null;

	const isHomepage = sitemapNode.path === "/" || sitemapNode.path === "/home";
	if (isHomepage) return JSON.stringify(WEBSITE_SCHEMA);

	const pageUrl = `${SITE_URL}${sitemapNode.path}`;
	const schemas: any[] = [];

	// Breadcrumbs from the path segments (Docs -> section -> article).
	const segments = sitemapNode.path.split("/").filter(Boolean);
	if (segments.length > 0) {
		schemas.push({
			"@context": "https://schema.org",
			"@type": "BreadcrumbList",
			itemListElement: [
				{ "@type": "ListItem", position: 1, name: "Docs", item: SITE_URL },
				...segments.map((seg, idx) => ({
					"@type": "ListItem",
					position: idx + 2,
					name: idx === segments.length - 1 ? sitemapNode.title : humanize(seg),
					item: `${SITE_URL}/${segments.slice(0, idx + 1).join("/")}`,
				})),
			],
		});
	}

	if (dynamicPageItem?.properties?.definitionName === "DocArticle") {
		schemas.push({
			"@context": "https://schema.org",
			"@type": "TechArticle",
			mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
			headline: dynamicPageItem.fields.title,
			description: dynamicPageItem.fields.description || undefined,
			url: pageUrl,
			publisher: PUBLISHER,
			datePublished: dynamicPageItem.fields.date || dynamicPageItem.properties.modified,
			dateModified: dynamicPageItem.properties.modified,
		});
	}

	if (schemas.length === 0) return null;
	return JSON.stringify(schemas.length === 1 ? schemas[0] : schemas);
};

const humanize = (slug: string) =>
	slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
