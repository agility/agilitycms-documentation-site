import { NextRequest, NextResponse } from "next/server";
import { algoliasearch } from "algoliasearch";
import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getDynamicPageSitemapMappingREST } from "utils/sitemapUtils";
import { normalizeArticle, normalizeArticleSections, type SectionRecord } from "utils/searchUtils";
import { ALGOLIA_SECTIONS_INDEX, configureSectionsIndex } from "lib/search/algoliaSections";
import { azureIndexingConfigured, replaceAllAzure } from "lib/search/azure";

/**
 * Bulk re-index every published doc article. Uses an uncached GraphQL fetch —
 * indexing must never read stale content. Triggered manually or from CI, not
 * from page renders.
 *
 * Targets (`?targets=`, comma-separated, default `algolia,sections`):
 *   algolia   the legacy `doc_site` index, one record per article
 *   sections  the `doc_site_sections` index, one record per heading section
 *   azure     the Azure AI Search index (embeds every section, so it costs
 *             money and takes a few minutes; never runs by default)
 *
 * When SEARCH_REINDEX_SECRET is set, every call needs `Authorization: Bearer
 * <secret>`. The azure target always needs it: an open endpoint that spends
 * embedding credits on each request is an invitation.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
	return indexAll(req);
}

export async function GET(req: NextRequest) {
	return indexAll(req);
}

const TARGETS = ["algolia", "sections", "azure"] as const;
type Target = (typeof TARGETS)[number];

const indexAll = async (req: NextRequest) => {
	const targets = (req.nextUrl.searchParams.get("targets") || "algolia,sections")
		.split(",")
		.map((t) => t.trim())
		.filter((t): t is Target => (TARGETS as readonly string[]).includes(t));
	const secret = process.env.SEARCH_REINDEX_SECRET;
	const authorized = Boolean(secret) && req.headers.get("authorization") === `Bearer ${secret}`;
	if ((secret || targets.includes("azure")) && !authorized) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}
	if (targets.includes("azure") && !azureIndexingConfigured()) {
		return NextResponse.json({ error: "Azure indexing is not configured" }, { status: 400 });
	}

	const client = algoliasearch(
		process.env.ALGOLIA_APP_ID!,
		process.env.ALGOLIA_ADMIN_API_KEY!
	);
	const indexName = "doc_site";

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
	const sections: SectionRecord[] = [];
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
			sections.push(...(await normalizeArticleSections({ article, url, category: cat })));
		}
	}

	const results: Record<string, unknown> = {};

	if (targets.includes("algolia")) {
		await client.setSettings({
			indexName,
			indexSettings: {
				searchableAttributes: ["title", "headings", "unordered(body)", "description"],
				attributesToSnippet: ["body:30"],
			},
		});
		// Atomic full rebuild: replaceAllObjects copies into a temp index and renames,
		// so any record not in `objects` (deleted/unpublished/orphaned) is removed.
		// In v5 it always waits for each step (the v4 `safe` option is gone).
		await client.replaceAllObjects({ indexName, objects });
		results.algolia = { index: indexName, records: objects.length };
	}

	if (targets.includes("sections")) {
		// replaceAllObjects copies the old index's settings onto the new one, but
		// the first run has no old index, so configure after the swap as well.
		await client.replaceAllObjects({ indexName: ALGOLIA_SECTIONS_INDEX, objects: sections });
		await configureSectionsIndex(client);
		results.sections = { index: ALGOLIA_SECTIONS_INDEX, records: sections.length };
	}

	if (targets.includes("azure")) {
		results.azure = await replaceAllAzure(sections);
	}

	return NextResponse.json({
		ok: true,
		targets,
		results,
		indexed: objects.length,
		skipped,
		categories: categoryBreakdown.length,
		durationMs: Date.now() - startedAt,
		categoryBreakdown,
		objectIDs: objects.map((o) => o.objectID),
	});
};
