import { NextRequest, NextResponse } from "next/server";
import { algoliasearch } from "algoliasearch";
import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getDynamicPageURL } from "@agility/nextjs/node";
import { normalizeArticle } from "utils/searchUtils";
import { readAgilityWebhook } from "lib/webhooks/readAgilityWebhook";

/**
 * Index (or delete) a single doc article in Algolia. Wired to an Agility
 * webhook that fires on article publish/unpublish/delete. Signed with the
 * webhook's own secret once AGILITY_WEBHOOK_SECRET_INDEX is set.
 */
export async function POST(req: NextRequest) {
	const webhook = await readAgilityWebhook<any>(req, "AGILITY_WEBHOOK_SECRET_INDEX");
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
	const deleteRecord = () => client.deleteObject({ indexName, objectID: `${contentID}` });

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

	// The record carries its objectID, so this replaces any existing record.
	await client.saveObject({ indexName, body: object });

	return NextResponse.json({ saved: contentID });
}
