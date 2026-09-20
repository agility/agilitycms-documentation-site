import { NextRequest, NextResponse } from "next/server";
import agility from "@agility/content-fetch";
import nextConfig from "next.config";
import { defaultLocale, getLocaleFromPathname } from "lib/i18n/config";
import { apiReferencePaths } from "lib/api-specs/loadSpec";
import { isDevMode } from "lib/cms/isDevMode";

/**
 * Proxy (Next 16's renamed middleware — the middleware.ts convention is
 * deprecated). Ordered blocks, following demosite2025's middleware:
 *
 *  1. Agility preview entry:  ?agilitypreviewkey=...  -> /api/preview
 *  2. Agility preview exit:   ?AgilityPreview=0       -> /api/preview/exit
 *  3. Dynamic-content deep link: ?ContentID=n         -> /api/dynamic-redirect
 *  4. Clean markdown (T7):     /{article-path}.md     -> /api/article-md
 *  5. Unknown paths -> a real 404 (see notFoundResponse)
 *  6. Locale routing: unprefixed paths REWRITE to /{defaultLocale}/... so the
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

/*
 * ---------------------------------------------------------------------------
 * Published-path validation (block 5)
 * ---------------------------------------------------------------------------
 * Without this the site answers every unknown URL with 200 and the not-found
 * UI — a soft 404. The cause is structural, not a bug we can fix in the page:
 * `cacheComponents` partially prerenders every route, so the static shell (and
 * with it the 200 status line) is already on the wire before the page resolves
 * the sitemap and calls notFound(). Next's own docs put it plainly: not-found
 * returns "200 for streamed responses, 404 for non-streamed", and "because the
 * response headers have already been sent, the status code cannot be updated".
 *
 * The proxy is the last place the status is still ours to set, so the check
 * happens here, before anything renders.
 */

/**
 * Paths this app serves itself. They are not in the Agility sitemap, so the
 * check below has to let them through — anything answered by a route handler
 * or a file convention rather than by the CMS belongs in this set.
 *
 * /robots.txt, /sitemap.xml and /_next/* never reach the proxy at all (see
 * `matcher`), and /llms.txt is caught by the "has a dot" static-file rule.
 * They are listed anyway so this reads as the full inventory of hand-written
 * routes — add to it when you add one.
 */
const APP_PATHS = new Set([
	"/",
	"/llms.txt",
	"/robots.txt",
	"/sitemap.xml",
	// The CMS's own error pages. They must pass unconditionally, not via the
	// sitemap lookup: notFoundResponse fetches /404 for its body, and if that
	// fetch were itself subject to the check it would recurse the moment the CMS
	// page went away.
	"/404",
	"/500",
]);

/**
 * The generated API reference: ~128 paths derived from the checked-in OpenAPI
 * snapshots rather than from the Agility sitemap.
 *
 * ⚠️ THIS CHECK CANNOT BE SKIPPED, and it cannot be loosened to a prefix match.
 *
 * Under Cache Components there is no `dynamicParams = false` (the option is
 * rejected outright), so an unrecognised operation slug would otherwise reach
 * the page, call notFound(), and render the not-found fallback DYNAMICALLY —
 * which trips the Application Insights problem (OpenTelemetry's
 * RandomIdGenerator calls Math.random(), which Cache Components forbids outside
 * a cached scope) and answers **500 instead of 404**. Verified against
 * `next start`: /api-reference/fetch/not-a-real-op returned 500 until this
 * check existed.
 *
 * That is the same reason the CMS paths are checked here rather than in the
 * page — the comment at the top of this section — so the reference simply joins
 * the existing rule instead of being exempted from it.
 *
 * Computed once at module scope: it is pure JSON parsing with no IO, and the
 * proxy runs on the Node.js runtime so a warm instance keeps it.
 */
const API_REFERENCE_PATHS = apiReferencePaths();

const isAppPath = (path: string): boolean =>
	APP_PATHS.has(path) || API_REFERENCE_PATHS.has(path);

/**
 * Published paths per locale, memoised in module scope — the proxy runs on the
 * Node.js runtime (Next 16 default), so a warm instance keeps this between
 * requests and the common case costs nothing.
 *
 * TTL is the routine refresh. A miss additionally forces ONE refresh, because a
 * page published since the last fetch must not 404 — throttled by MISS_MIN_AGE
 * so a flood of junk URLs can't turn into a fetch per request.
 */
const PATHS_TTL_MS = 60_000;
// Deliberately small. This is the blind spot: a page published less than this
// ago, on an instance that refreshed less than this ago, 404s — and the publish
// webhook's Netlify purge has already run by then, so that 404 then sits in the
// CDN for its TTL. Two seconds keeps an author from meeting a 404 on the page
// they just published, and still caps a junk-URL flood at one sitemap fetch per
// two seconds per instance.
const MISS_MIN_AGE_MS = 2_000;

interface KnownPaths {
	paths: Set<string>;
	fetchedAt: number;
}

const pathCache = new Map<string, KnownPaths>();
const inFlight = new Map<string, Promise<KnownPaths | null>>();

const fetchKnownPaths = async (locale: string): Promise<KnownPaths | null> => {
	try {
		const api = agility.getApi({
			guid: process.env.AGILITY_GUID,
			apiKey: process.env.AGILITY_API_FETCH_KEY,
			isPreview: false,
		});
		const sitemap: any = await api.getSitemapFlat({
			channelName: process.env.AGILITY_SITEMAP || "website",
			languageCode: locale,
		});

		// Folders have no page of their own — getAgilityPage 404s them too, so
		// they are not valid paths. Redirect nodes ARE kept: the page handles the
		// redirect, and 404ing them here would break every legacy URL.
		const paths = Object.keys(sitemap || {}).filter((p) => sitemap[p]?.isFolder !== true);

		// An empty sitemap means the fetch went wrong upstream, not that the docs
		// have no pages. Never let that 404 the entire site.
		if (paths.length === 0) return null;

		const entry: KnownPaths = { paths: new Set(paths), fetchedAt: Date.now() };
		pathCache.set(locale, entry);
		return entry;
	} catch {
		return null;
	}
};

/** One in-flight fetch per locale, shared by every request that needs it. */
const loadKnownPaths = (locale: string): Promise<KnownPaths | null> => {
	const pending = inFlight.get(locale);
	if (pending) return pending;
	const load = fetchKnownPaths(locale).finally(() => inFlight.delete(locale));
	inFlight.set(locale, load);
	return load;
};

/**
 * Is this a published path? `null` means we couldn't find out — Agility was
 * unreachable — and every caller must then fail OPEN. A docs outage must not
 * turn into a site-wide 404, and the old soft-404 behaviour is a safe fallback.
 */
const isPublishedPath = async (locale: string, path: string): Promise<boolean | null> => {
	let entry = pathCache.get(locale) || null;

	if (!entry || Date.now() - entry.fetchedAt > PATHS_TTL_MS) {
		// Keep the stale set if the refresh fails — stale beats nothing.
		entry = (await loadKnownPaths(locale)) || entry;
	}
	if (!entry) return null;
	if (entry.paths.has(path)) return true;

	// A miss may just be a page published since we last looked. Refresh once
	// before committing to a 404 (see MISS_MIN_AGE_MS).
	if (Date.now() - entry.fetchedAt > MISS_MIN_AGE_MS) {
		const fresh = await loadKnownPaths(locale);
		if (!fresh) return null;
		return fresh.paths.has(path);
	}

	return false;
};

/**
 * A real 404 — status AND body, both set here.
 *
 * The status cannot come from a rewrite. Verified on a Vercel preview: a
 * rewrite to the prerendered not-found page serves the right HTML and answers
 * 200, because Vercel does not adopt the destination's status (Next's own
 * resolve-routes.js only propagates a status for the redirect branch, never the
 * rewrite one). A rewrite to anything outside the basePath is worse — Vercel
 * never reaches the app and returns its 79-byte plain-text platform 404.
 *
 * So the proxy answers directly. The status is ours by construction, and the
 * body is the page the host already serves at {basePath}/404 — on Vercel that
 * is the prerendered app/not-found.tsx (site chrome and all), under
 * `next start` it is the CMS's /404 page. Either way a real 404 carrying a real
 * page, with no per-host branching.
 *
 * Fetched once per instance and held in module scope: the page only changes on
 * deploy, and a deploy gives us a new instance anyway.
 */
let notFoundHtml: string | null = null;
let notFoundInFlight: Promise<string | null> | null = null;

/**
 * Used only if that fetch fails. Deliberately self-contained — no CSS file, no
 * fonts, nothing that could fail second. A reader should still learn what
 * happened and get a way out.
 */
const FALLBACK_NOT_FOUND_HTML = `<!doctype html>
<html lang="en-US"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>404 — Page not found</title>
<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0e0d0c;color:#f1efe9;font:16px/1.5 system-ui,-apple-system,sans-serif}
main{text-align:center;max-width:32rem;padding:2rem}h1{font-size:1.75rem;margin:0 0 1rem}
p{margin:0 0 2rem;color:#b5b0a5}a{color:#f1efe9}</style></head>
<body><main><h1>We couldn&rsquo;t find that page.</h1>
<p>It either moved or we pointed you at a dead link.</p>
<a href="${nextConfig.basePath || "/"}">Back to Docs home</a></main></body></html>`;

const loadNotFoundHtml = (origin: string): Promise<string | null> => {
	if (notFoundInFlight) return notFoundInFlight;
	notFoundInFlight = (async () => {
		try {
			const res = await fetch(`${origin}${nextConfig.basePath || ""}/404`, {
				headers: { accept: "text/html" },
			});
			const html = await res.text();
			// A tiny body means we got a platform error page, not the real one.
			if (!html || html.length < 500) return null;
			notFoundHtml = html;
			return html;
		} catch {
			return null;
		} finally {
			notFoundInFlight = null;
		}
	})();
	return notFoundInFlight;
};

const notFoundResponse = async (request: NextRequest) => {
	const html = notFoundHtml || (await loadNotFoundHtml(request.nextUrl.origin));

	return new NextResponse(html || FALLBACK_NOT_FOUND_HTML, {
		status: 404,
		headers: {
			"content-type": "text/html; charset=utf-8",
			// Short CDN life, unlike a page (an hour). A 404 cached for a path that
			// has since been published can't be purged by the publish webhook — that
			// purge runs at publish time, before this response was ever cached — so
			// the TTL is the only thing that clears it. Keep it to seconds. Junk URLs
			// are still absorbed at the edge rather than at the origin.
			"CDN-Cache-Control": "public, s-maxage=15",
			"Netlify-CDN-Cache-Control": "public, s-maxage=15",
			"Netlify-Vary": NETLIFY_VARY,
			"Netlify-Cache-Tag": "docs",
		},
	});
};

export async function proxy(request: NextRequest) {
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

	const isStaticFile = pathname.includes(".") || pathname.startsWith("/_next");
	const isApi = pathname.startsWith("/api/");
	const localePrefix = getLocaleFromPathname(pathname);
	const hasLocalePrefix = localePrefix !== null;

	// 5. Does this path exist? Anything the CMS doesn't publish and the app
	//    doesn't serve itself gets a real 404, decided here because by the time
	//    the page could call notFound() the 200 is already sent.
	//
	//    Skipped for draft mode and local dev: both read STAGING content, which
	//    includes pages missing from the published sitemap this checks against,
	//    so an editor previewing a new page would be 404'd on their own draft.
	const skipPathCheck =
		isStaticFile || isApi || isDevMode() || request.cookies.has(DRAFT_COOKIE);

	if (!skipPathCheck) {
		const locale = localePrefix || defaultLocale;
		// Sitemap keys are unprefixed ("/editors/scheduling"), so drop the locale
		// segment; a bare locale ("/en-us") is the home page, same as "/".
		const localeless = hasLocalePrefix ? pathname.slice(locale.length + 1) : pathname;
		const lookup = localeless.length > 1 ? localeless.replace(/\/+$/, "") : localeless || "/";

		if (!isAppPath(lookup)) {
			// false = we know it doesn't exist. null = Agility is unreachable, so
			// we can't know — fall through and let the page render as before.
			const published = await isPublishedPath(locale, lookup);
			if (published === false) return await notFoundResponse(request);
		}
	}

	// 6. Locale routing — rewrite unprefixed paths into /[locale].
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
		// ⚠️ Each directory exclusion carries a TRAILING SLASH on purpose. The
		// lookahead is a prefix test with no path boundary of its own, so a bare
		// `api` here excludes every path merely STARTING with those letters —
		// which silently took out /api-reference: the proxy never ran, so the
		// locale rewrite never happened, and 128 pages that prerendered
		// perfectly served a 404 shell instead. `api/` excludes the route
		// handlers under /api/ and nothing else. Same reasoning for `assets/`.
		"/((?!api/|_next/static|_next/image|assets/|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)",
	],
};
