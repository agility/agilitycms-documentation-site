import { NextRequest, NextResponse } from "next/server";
import { defaultLocale, getLocaleFromPathname } from "lib/i18n/config";

/**
 * Proxy (Next 16's renamed middleware — the middleware.ts convention is
 * deprecated). Ordered blocks, following demosite2025's middleware:
 *
 *  1. Agility preview entry:  ?agilitypreviewkey=...  -> /api/preview
 *  2. Agility preview exit:   ?AgilityPreview=0       -> /api/preview/exit
 *  3. Dynamic-content deep link: ?ContentID=n         -> /api/dynamic-redirect
 *  4. Clean markdown (T7):     /{article-path}.md     -> /api/article-md
 *  5. Locale routing: unprefixed paths REWRITE to /{defaultLocale}/... so the
 *     default locale serves clean URLs while routing into app/[locale].
 *
 * NOTE: request.nextUrl.pathname excludes the /docs basePath; rewrites built
 * by cloning nextUrl keep the basePath automatically.
 */
export function proxy(request: NextRequest) {
	const { nextUrl } = request;
	const pathname = nextUrl.pathname;

	// 0. IndexNow key verification file. Served at /docs/{key}.txt (pathname
	//    excludes the basePath) so search engines can verify ownership before
	//    accepting URL submissions from submitToIndexNow. Non-root key location →
	//    authorizes exactly the /docs URL space we submit. Must run first.
	const indexNowKey = process.env.INDEXNOW_KEY;
	if (indexNowKey && pathname === `/${indexNowKey}.txt`) {
		return new NextResponse(indexNowKey, {
			status: 200,
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"Cache-Control": "public, max-age=86400",
			},
		});
	}

	// 1. Preview entry — Agility appends agilitypreviewkey to the preview URL.
	const previewKey = nextUrl.searchParams.get("agilitypreviewkey");
	if (previewKey) {
		const url = nextUrl.clone();
		url.pathname = "/api/preview";
		url.searchParams.set("slug", pathname);
		return NextResponse.redirect(url);
	}

	// 2. Preview exit.
	if (nextUrl.searchParams.get("AgilityPreview") === "0") {
		const url = nextUrl.clone();
		url.pathname = "/api/preview/exit";
		url.searchParams.delete("AgilityPreview");
		url.searchParams.set("slug", pathname);
		return NextResponse.redirect(url);
	}

	// 3. Deep link to a dynamic item by ContentID (from the CMS UI).
	const contentIDParam = nextUrl.searchParams.get("ContentID");
	if (contentIDParam && parseInt(contentIDParam) > 0 && !pathname.startsWith("/api/")) {
		const url = nextUrl.clone();
		url.pathname = "/api/dynamic-redirect";
		return NextResponse.rewrite(url);
	}

	// 4. Clean-markdown endpoint (T7): /{article-path}.md -> /api/article-md/...
	//    Must run before the static-file check below — .md paths contain a dot.
	//    The article path travels in the URL path, not a query param: query
	//    strings added during a middleware rewrite don't reliably survive
	//    under basePath.
	if (pathname.endsWith(".md") && !pathname.startsWith("/api/")) {
		const url = nextUrl.clone();
		url.pathname = `/api/article-md${pathname.slice(0, -3)}`;
		return NextResponse.rewrite(url);
	}

	// 5. Locale routing — rewrite unprefixed paths into /[locale].
	const isStaticFile = pathname.includes(".") || pathname.startsWith("/_next");
	const isApi = pathname.startsWith("/api/");
	const hasLocalePrefix = getLocaleFromPathname(pathname) !== null;

	if (!hasLocalePrefix && !isStaticFile && !isApi) {
		const url = nextUrl.clone();
		url.pathname = `/${defaultLocale}${pathname === "/" ? "" : pathname}`;
		return NextResponse.rewrite(url);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		// Bare "/" must be listed explicitly — the negative-lookahead pattern
		// below does not match the basePath root, so the home page would skip
		// the locale rewrite entirely (verified against next start).
		"/",
		"/((?!api|_next/static|_next/image|assets|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
	],
};
