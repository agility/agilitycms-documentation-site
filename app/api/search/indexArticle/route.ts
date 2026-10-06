import { NextRequest, NextResponse } from "next/server";
import { algoliasearch } from "algoliasearch";
import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getDynamicPageURL } from "@agility/nextjs/node";
import { normalizeArticle, normalizeArticleSections } from "utils/searchUtils";
import { deleteAlgoliaArticleSections, replaceAlgoliaArticleSections } from "lib/search/algoliaSections";
import { azureIndexingConfigured, deleteAzureArticle, replaceAzureArticle } from "lib/search/azure";
import { readAgilityWebhook } from "lib/webhooks/readAgilityWebhook";

/**
 * Index (or delete) a single doc article in every search index: the legacy
 * Algolia `doc_site`, the section index `doc_site_sections`, and Azure AI
 * Search when it's configured. Wired to an Agility
 * webhook that fires on article publish/unpublish/delete. Signed with the
 * webhook's own secret once WH_SECRET_INDEX_ARTICLE is set.
 */
// Azure is an extra index: a failure there is logged, never allowed to stop
// Algolia (which the search box depends on) from being updated.
const logAzure = (e: unknown) => console.error("indexArticle: Azure AI Search update failed", e instanceof Error ? e.message : e);

export async function POST(req: NextRequest) {
	const webhook = await readAgilityWebhook<any>(req, "WH_SECRET_INDEX_ARTICLE");
	if (!webhook.ok) return webhook.response;
	const body = webhook.body;

	const referenceName = body.referenceName;
	if (!referenceName || !/^[a-zA-Z_]+articles$/.test(referenceName)) {
		//kickout — not an articles container
		return new Response(null, { status: 200 });
	}

	const contentID = parseInt(body.contentID, 10);
	if (isNaN(contentID)) {
		return NextResponse.json({ error: "Invalid contentID" }, { status: 400 });
	}
	const state = body.state;

	const client = algoliasearch(
		process.env.ALGOLIA_APP_ID!,
		process.env.ALGOLIA_ADMIN_API_KEY!
	);
	const indexName = "doc_site";
	const deleteRecord = () =>
		Promise.all([
			client.deleteObject({ indexName, objectID: `${contentID}` }),
			deleteAlgoliaArticleSections(client, `${contentID}`),
			azureIndexingConfigured() ? deleteAzureArticle(`${contentID}`).catch(logAzure) : null,
		]);

	// Agility reports unpublish AND delete as state "Deleted" (there is no "Unpublished"
	// state). Delete without re-fetching: the Fetch API can briefly still serve the item.
	if (contentID && state === "Deleted") {
		await deleteRecord();
		return NextResponse.json({ deleted: contentID, state });
	}

	const data = await gqlFresh({
		locale: defaultLocale,
		query: `
        {
            ${referenceName} (contentID: ${contentID})  {
                contentID
                properties {
                    itemOrder
                }
                fields {
                    title
                    content
                    markdownContent
                    description
                    section {
                        contentID
                        fields {
                            title
                        }
                    }
                    concept {
                        contentID
                        fields {
                            title
                        }
                    }
                }
            }
        }`,
	});

	const article = data[referenceName] && data[referenceName][0];

	// If the article isn't returned by the published API, it's been unpublished/removed.
	// Strip it from the index so search results stay in sync.
	if (!article) {
		await deleteRecord();
		return NextResponse.json({ deleted: contentID, reason: "not-published" });
	}

	const url = await getDynamicPageURL({
		contentID: article.contentID,
		preview: false,
	});

	// Published, but no dynamic page resolves to it — a retired item still sitting
	// in its container, or the loser of a duplicate slug. It has no URL to offer,
	// so drop it from the index rather than saving a "null" one.
	if (!url) {
		await deleteRecord();
		return NextResponse.json({ deleted: contentID, reason: "no-dynamic-page" });
	}

	const object = await normalizeArticle({ article, url, category: undefined });

	const sections = await normalizeArticleSections({ article, url, category: undefined });

	// The record carries its objectID, so this replaces any existing record.
	await Promise.all([
		client.saveObject({ indexName, body: object }),
		replaceAlgoliaArticleSections(client, `${contentID}`, sections),
		azureIndexingConfigured() ? replaceAzureArticle(`${contentID}`, sections).catch(logAzure) : null,
	]);

	return NextResponse.json({ saved: contentID });
}
