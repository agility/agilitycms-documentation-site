import { ApiDefinition } from "lib/api-specs/registry";
import { ApiOperation } from "lib/api-specs/types";
import { ORG_ID, SITE_URL, WEBSITE_ID, graph, organizationNode, ref, webSiteNode } from "lib/seo/schema";

/**
 * JSON-LD for the generated API reference.
 *
 * `APIReference` is a real schema.org type and a subtype of TechArticle, which
 * makes it the most specific honest label for an operation page — better than
 * marking 126 endpoint pages as generic TechArticles and leaving a crawler to
 * infer what they are. The type carries `programmingModel` (REST) and
 * `assemblyVersion`, which we map to the spec version.
 *
 * Nodes reference the shared Organization and WebSite by `@id` rather than
 * restating them, for the reasons in lib/seo/schema.ts.
 */

export const apiReferenceUrl = (...segments: string[]) =>
	[`${SITE_URL}/api-reference`, ...segments].join("/");

const crumb = (position: number, name: string, item: string) => ({
	"@type": "ListItem",
	position,
	name,
	item,
});

/** The reference index: both APIs as an ItemList. */
export const indexSchema = (apis: ApiDefinition[]): string =>
	graph([
		organizationNode(),
		webSiteNode(),
		{
			"@type": "CollectionPage",
			"@id": `${apiReferenceUrl()}#webpage`,
			url: apiReferenceUrl(),
			name: "API Reference",
			isPartOf: ref(WEBSITE_ID),
			inLanguage: "en-US",
			breadcrumb: ref(`${apiReferenceUrl()}#breadcrumb`),
			mainEntity: {
				"@type": "ItemList",
				itemListElement: apis.map((api, i) => ({
					"@type": "ListItem",
					position: i + 1,
					name: api.title,
					url: apiReferenceUrl(api.slug),
				})),
			},
		},
		{
			"@type": "BreadcrumbList",
			"@id": `${apiReferenceUrl()}#breadcrumb`,
			itemListElement: [
				crumb(1, "Docs", SITE_URL),
				crumb(2, "API Reference", apiReferenceUrl()),
			],
		},
	]);

/** One API's landing page, listing its operations. */
export const apiSchema = (api: ApiDefinition, operations: ApiOperation[], version?: string): string => {
	const url = apiReferenceUrl(api.slug);
	return graph([
		organizationNode(),
		webSiteNode(),
		{
			"@type": "WebAPI",
			"@id": `${url}#api`,
			name: api.title,
			description: api.tagline,
			documentation: url,
			provider: ref(ORG_ID),
			...(version ? { version } : {}),
		},
		{
			"@type": "CollectionPage",
			"@id": `${url}#webpage`,
			url,
			name: `${api.title} reference`,
			isPartOf: ref(WEBSITE_ID),
			inLanguage: "en-US",
			breadcrumb: ref(`${url}#breadcrumb`),
			about: ref(`${url}#api`),
			mainEntity: {
				"@type": "ItemList",
				numberOfItems: operations.length,
				itemListElement: operations.map((op, i) => ({
					"@type": "ListItem",
					position: i + 1,
					name: `${op.method.toUpperCase()} ${op.path}`,
					url: apiReferenceUrl(api.slug, op.slug),
				})),
			},
		},
		{
			"@type": "BreadcrumbList",
			"@id": `${url}#breadcrumb`,
			itemListElement: [
				crumb(1, "Docs", SITE_URL),
				crumb(2, "API Reference", apiReferenceUrl()),
				crumb(3, api.title, url),
			],
		},
	]);
};

/** A single operation page. */
export const operationSchema = (
	api: ApiDefinition,
	operation: ApiOperation,
	version?: string
): string => {
	const url = apiReferenceUrl(api.slug, operation.slug);
	const name = operation.summary || `${operation.method.toUpperCase()} ${operation.path}`;

	return graph([
		organizationNode(),
		webSiteNode(),
		{
			"@type": "APIReference",
			"@id": `${url}#api-reference`,
			url,
			name,
			headline: name,
			description: `${operation.method.toUpperCase()} ${operation.path} — ${api.title}. ${operation.summary}`.trim(),
			programmingModel: "REST",
			...(version ? { assemblyVersion: version } : {}),
			// The tag ("Item", "Page", "Asset"…) is the spec's own grouping, which
			// is a better articleSection than anything derivable from the URL.
			articleSection: operation.tag,
			inLanguage: "en-US",
			isPartOf: ref(`${url}#webpage`),
			mainEntityOfPage: ref(`${url}#webpage`),
			publisher: ref(ORG_ID),
			author: ref(ORG_ID),
		},
		{
			"@type": "WebPage",
			"@id": `${url}#webpage`,
			url,
			name,
			isPartOf: ref(WEBSITE_ID),
			inLanguage: "en-US",
			breadcrumb: ref(`${url}#breadcrumb`),
		},
		{
			"@type": "BreadcrumbList",
			"@id": `${url}#breadcrumb`,
			itemListElement: [
				crumb(1, "Docs", SITE_URL),
				crumb(2, "API Reference", apiReferenceUrl()),
				crumb(3, api.title, apiReferenceUrl(api.slug)),
				crumb(4, name, url),
			],
		},
	]);
};
