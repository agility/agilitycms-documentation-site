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
/**
 * Edge cache headers for page responses. Set here rather than in next.config's
 * `headers()` because that rule is unconditional, and a draft-mode render must
 * never carry public CDN headers (see applyCacheHeaders).
 *
 * Precedence on Netlify is Netlify-CDN-Cache-Control > CDN-Cache-Control >
 * Cache-Control, so the two headers below tune the two CDNs independently:
 *
 * · CDN-Cache-Control is the portable default and is what Vercel's own edge
 *   honours. Left short (60s) because Next's ISR + the /api/revalidate webhook
 *   already invalidate Vercel precisely via revalidateTag/revalidatePath.
 * · Netlify-CDN-Cache-Control is the fronting CDN at agilitycms.com/docs, which
 *   has no idea a publish happened. It gets a long TTL and a very long SWR
 *   window because /api/revalidate now purges it by tag on publish — the TTL is
 *   just the self-healing floor if a purge is ever missed, and SWR means a
 *   reader is served instantly from the edge either way.
 *
 * `stale-if-error` is deliberate but UNVERIFIED: Netlify documents
 * stale-while-revalidate and does not mention stale-if-error. An unknown
 * directive is ignored, so this costs nothing and pays off if/when supported.
 */
const CDN_CACHE = "public, s-maxage=60, stale-while-revalidate=86400";
const NETLIFY_CDN_CACHE =
	"public, s-maxage=3600, stale-while-revalidate=604800, stale-if-error=604800";

/**
 * Netlify keys its cache on ALL query params by default, so every ?utm_source,
 * ?gclid and ?fbclid fragments the cache into a separate entry that has to go
 * back to Vercel. Only these three change what the origin returns, so they are
 * the only ones worth varying on:
 *   · agilitypreviewkey / AgilityPreview — preview enter/exit (handled above)
 *   · ContentID                          — dynamic-item deep link
 * Everything else (?theme=light included — it is read client-side and the HTML
 * is identical) collapses onto one cache entry.
 *
 * These MUST stay listed: drop agilitypreviewkey and a preview request would
 * match the public cached entry and silently serve published content instead.
 */
const NETLIFY_VARY = "query=agilitypreviewkey|ContentID|AgilityPreview";

// Next sets this cookie when draft mode is on.
const DRAFT_COOKIE = "__prerender_bypass";

const applyCacheHeaders = (res: NextResponse, request: NextRequest) => {
	// A draft-mode render shows unpublished content. It must never reach a
	// shared cache, so it gets no CDN headers at all.
	if (request.cookies.has(DRAFT_COOKIE)) {
		res.headers.set("Cache-Control", "private, no-store");
		return res;
	}

	res.headers.set("CDN-Cache-Control", CDN_CACHE);
	res.headers.set("Netlify-CDN-Cache-Control", NETLIFY_CDN_CACHE);
	res.headers.set("Netlify-Vary", NETLIFY_VARY);
	// One coarse tag for the whole docs space: /api/revalidate purges it on any
	// publish. Coarse is fine here — docs publish rarely, and SWR means the
	// re-fill is invisible to readers. Per-page tags are a later refinement.
	res.headers.set("Netlify-Cache-Tag", "docs");
	return res;
};

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
		return applyCacheHeaders(NextResponse.rewrite(url), request);
	}

	// Locale-prefixed page requests land here; static files and /api/* are
	// excluded above and keep their own caching (hashed assets are already
	// immutable, API routes must not be cached at the edge).
	if (isStaticFile || isApi) return NextResponse.next();

	return applyCacheHeaders(NextResponse.next(), request);
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
