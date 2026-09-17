import { NextRequest } from "next/server";
import { draftMode } from "next/headers";
import { getSitemapFlat } from "lib/cms/getSitemapFlat";
import { getContentItem } from "lib/cms/getContentItem";
import { articleToMarkdown } from "lib/cms-content/articleMarkdown";
import { defaultLocale, getLocaleFromPathname } from "lib/i18n/config";
import { isDevMode } from "lib/cms/isDevMode";

/**
 * Clean-markdown endpoint for articles (rebuild plan T7). Not called
 * directly — proxy.ts rewrites GET /{article-path}.md to
 * /api/article-md/{article-path}. The article path travels in the URL path
 * (not a query param) because middleware-rewrite query strings don't
 * reliably survive under basePath. Data comes from the tagged cached
 * getters, so responses revalidate with the same webhook as the HTML pages.
 */
export async function GET(
	_request: NextRequest,
	{ params }: { params: Promise<{ slug: string[] }> }
) {
	const { slug } = await params;
	const rawPath = "/" + (slug || []).join("/");

	// Non-default locales arrive prefixed (/fr-ca/...); strip the prefix to
	// look up the sitemap, which stores locale-less paths.
	const localePrefix = getLocaleFromPathname(rawPath);
	const locale = localePrefix || defaultLocale;
	const path = (localePrefix ? rawPath.slice(localePrefix.length + 1) : rawPath) || "/";

	const preview = (await draftMode()).isEnabled || isDevMode();

	const sitemap = await getSitemapFlat({ locale, preview });
	const node = sitemap[path];

	if (!node || node.isFolder || node.redirect) {
		return new Response("Not found", { status: 404 });
	}
	if (!node.contentID || node.contentID < 1) {
		return new Response(
			"Not an article. Markdown is available for article pages only — see /docs/llms.txt for the index.",
			{ status: 404 }
		);
	}

	try {
		const article = await getContentItem({
			contentID: node.contentID,
			locale,
			preview,
			contentLinkDepth: 1,
		});
		if (!article?.fields) return new Response("Not found", { status: 404 });

		const markdown = articleToMarkdown({
			fields: article.fields,
			canonicalUrl: `https://agilitycms.com/docs${path}`,
		});

		return new Response(markdown, {
			headers: {
				"content-type": "text/markdown; charset=utf-8",
				"cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=86400",
			},
		});
	} catch (error) {
		console.error("article-md: error serializing", path, error);
		return new Response("Error generating markdown", { status: 500 });
	}
}
