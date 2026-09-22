import { NextRequest, NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getDynamicPageSitemapMappingREST } from "utils/sitemapUtils";
import { normalizeArticle } from "utils/searchUtils";

/**
 * Bulk re-index every published doc article into Algolia (index `doc_site`).
 * Uses an uncached GraphQL fetch — indexing must never read
 * stale content. Triggered manually or from CI, not from page renders.
 */
export async function POST(req: NextRequest) {
	return indexAll();
}

export async function GET(req: NextRequest) {
	return indexAll();
}

const indexAll = async () => {
	const algoliaClient = algoliasearch(
		process.env.ALGOLIA_APP_ID!,
		process.env.ALGOLIA_ADMIN_API_KEY!
	);
	const index = algoliaClient.initIndex("doc_site");

	const startedAt = Date.now();

	const data = await gqlFresh({
		locale: defaultLocale,
		query: `
			{
				doccategories {
					contentID
					fields {
						title
						subTitle
						articles {
							properties {
								itemOrder
							}
							contentID
							fields {
								title
								content
								markdownContent
								description
								section {
									fields {
										title
									}
								}
								concept {
									fields {
										title
									}
								}
							}
						}
					}
				}
			}
		`,
	});

	const articleUrls = await getDynamicPageSitemapMappingREST();

	let objects: any[] = [];
	const skipped: any[] = [];
	const categoryBreakdown: any[] = [];
	for (const cat of data.doccategories) {
		const articles = cat.fields.articles || [];
		categoryBreakdown.push({
			contentID: cat.contentID,
			title: cat.fields.title,
			articleCount: articles.length,
		});
		for (const article of articles) {
			// No sitemap node means no page to send a searcher to. Indexing it
			// anyway wrote the string "null"/"undefined" into the record's url,
			// which the search modal then pushed as a RELATIVE path — landing on
			// /docs/<current-section>/null, a 404. Leave it out of the index.
			const url = articleUrls[article.contentID];
			if (!url) {
				skipped.push({
					contentID: article.contentID,
					title: article.fields.title,
					category: cat.fields.title,
					reason: "no-dynamic-page",
				});
				continue;
			}

			const object = await normalizeArticle({ article, url, category: cat });
			objects.push(object);
		}
	}

	//configure index settings
	await index.setSettings({
		searchableAttributes: ["title", "headings", "unordered(body)", "description"],
		attributesToSnippet: ["body:30"],
	});

	// Atomic full rebuild: replaceAllObjects copies into a temp index and renames,
	// so any record not in `objects` (deleted/unpublished/orphaned) is removed.
	await index.replaceAllObjects(objects, { safe: true });

	return NextResponse.json({
		ok: true,
		index: "doc_site",
		indexed: objects.length,
		skipped,
		categories: categoryBreakdown.length,
		durationMs: Date.now() - startedAt,
		categoryBreakdown,
		objectIDs: objects.map((o) => o.objectID),
	});
};
