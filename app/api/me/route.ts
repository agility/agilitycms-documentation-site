import { cookies } from "next/headers";

/**
 * Signed-in probe: "is this reader logged into Agility?" — nothing more.
 *
 * Returns `{ signedIn: boolean }` and NEVER the cookie value. The cookie is an
 * OWIN auth ticket; it is a credential, and it must not reach analytics, logs
 * or the client bundle. A boolean is the whole payload on purpose.
 *
 * WHY A SERVER ROUTE, AND NOT document.cookie
 * -------------------------------------------
 * Two reasons, and the second is the load-bearing one:
 *
 * 1. `AgilityAuthOWIN` is currently readable from JS, but that is a known High
 *    security finding in the platform audit (H-14, 2026-07-02: "Make the cookie
 *    HttpOnly and remove the JS read paths"). A client-side `document.cookie`
 *    check works today and would silently start reporting everyone as logged
 *    out the moment that gets fixed — a failure mode with no error to notice.
 *    Reading it server-side works before AND after.
 *
 * 2. It keeps the docs HTML cacheable. Every page is served to the Netlify apex
 *    with a long s-maxage + SWR (see HOSTING.md); that only holds because the
 *    HTML is byte-identical for every reader. Rendering signed-in state into the
 *    page would either break that caching or leak one reader's signed-in page
 *    into a shared cache. Isolating it to this one uncached JSON call keeps the
 *    expensive thing (HTML) cacheable and the per-user thing tiny.
 *
 * Reachable at the apex because the Netlify proxy forwards cookies (proxy
 * contract rule 1 in HOSTING.md) and `AgilityAuthOWIN` is scoped to
 * `.agilitycms.com` — app.agilitycms.com and manager.agilitycms.com share it
 * across subdomains, so agilitycms.com/docs receives it too.
 */

// NOTE: no `export const dynamic = "force-dynamic"` — this site runs Next 16
// Cache Components (`cacheComponents: true`), which rejects that route segment
// config outright. It isn't needed: awaiting cookies() is itself a dynamic read,
// so the route is never prerendered.

/**
 * Overridable because the name lives in another system (Classic CM's OWIN
 * config). If it is ever renamed, this is a config change, not a deploy.
 */
const AUTH_COOKIE = process.env.AGILITY_AUTH_COOKIE_NAME || "AgilityAuthOWIN";

export async function GET() {
	const cookieStore = await cookies();
	const value = cookieStore.get(AUTH_COOKIE)?.value;

	return Response.json(
		{ signedIn: !!value },
		{
			headers: {
				// Per-reader, so it must not be stored by any shared cache. The
				// proxy already skips /api/* for CDN headers; this is explicit.
				"Cache-Control": "private, no-store",
				"Netlify-CDN-Cache-Control": "no-store",
			},
		}
	);
}
