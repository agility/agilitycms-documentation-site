import { NextRequest, NextResponse } from "next/server";
import algoliasearch from "algoliasearch";
import { gqlFresh } from "lib/cms/gql";
import { defaultLocale } from "lib/i18n/config";
import { getDynamicPageURL } from "@agility/nextjs/node";
import { normalizeArticle } from "utils/searchUtils";

/**
 * Index (or delete) a single doc article in Algolia. Wired to an Agility
 * webhook that fires on article publish/unpublish/delete.
 */
export async function POST(req: NextRequest) {
	const body = await req.json();

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

	const algoliaClient = algoliasearch(
		process.env.ALGOLIA_APP_ID!,
		process.env.ALGOLIA_ADMIN_API_KEY!
	);
	const index = algoliaClient.initIndex("doc_site");

	if (contentID && state && (state === "Deleted" || state === "Unpublished")) {
		await index.deleteObject(`${contentID}`);
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
		await index.deleteObject(`${contentID}`);
		return NextResponse.json({ deleted: contentID, reason: "not-published" });
	}

	const url = await getDynamicPageURL({
		contentID: article.contentID,
		preview: false,
	});

	const object = await normalizeArticle({ article, url, category: undefined });

	await index.saveObject(object);

	return NextResponse.json({ saved: contentID });
}
