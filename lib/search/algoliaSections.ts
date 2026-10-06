import type { algoliasearch } from "algoliasearch";

type Client = ReturnType<typeof algoliasearch>;

/** The section-per-record Algolia index, written alongside the legacy `doc_site`. */
export const ALGOLIA_SECTIONS_INDEX = process.env.ALGOLIA_SECTIONS_INDEX || "doc_site_sections";

/**
 * Settings for the section index. `distinct` on `articleId` returns one hit
 * per article (its best-matching section), so the search box and the MCP keep
 * showing pages, not fragments. A heading match outranks a body match, and an
 * article's earlier sections win ties.
 */
export async function configureSectionsIndex(client: Client) {
	await client.setSettings({
		indexName: ALGOLIA_SECTIONS_INDEX,
		indexSettings: {
			searchableAttributes: ["title", "heading", "unordered(body)", "description"],
			attributeForDistinct: "articleId",
			distinct: true,
			attributesForFaceting: ["filterOnly(articleId)"],
			customRanking: ["asc(position)"],
			attributesToSnippet: ["body:30"],
		},
	});
}

/** Replace one article's section records (its section count can change). */
export async function replaceAlgoliaArticleSections(client: Client, articleId: string, records: object[]) {
	await client.deleteBy({ indexName: ALGOLIA_SECTIONS_INDEX, deleteByParams: { filters: `articleId:"${articleId}"` } });
	if (records.length) await client.saveObjects({ indexName: ALGOLIA_SECTIONS_INDEX, objects: records as Record<string, unknown>[] });
}

export async function deleteAlgoliaArticleSections(client: Client, articleId: string) {
	await client.deleteBy({ indexName: ALGOLIA_SECTIONS_INDEX, deleteByParams: { filters: `articleId:"${articleId}"` } });
}
