import { cookies } from "next/headers"

/**
 * Signed-in probe: is this visitor logged into Agility, and if so, which user id.
 *
 * Returns `{ signedIn, validated, userId? }`. It NEVER returns the cookie value
 * (an OWIN auth ticket — a credential), and never the email or name that Classic
 * sends back alongside the id.
 *
 * Kept identical to the marketing site's route (Agility-Website-Nextjs-2026)
 * so both surfaces report the same thing into the same PostHog project.
 * Change both together.
 *
 * WHY A SERVER ROUTE, AND NOT document.cookie
 * -------------------------------------------
 * 1. `AgilityAuthOWIN` is readable from JS today, but that is a known High
 *    finding in the platform security audit (H-14, 2026-07-02: "Make the cookie
 *    HttpOnly and remove the JS read paths"). A client-side check works now and
 *    would silently start reporting everyone as logged out the moment that lands
 *    — a failure with no error to notice. Server-side works before AND after.
 * 2. It keeps the HTML cacheable. Every docs page is served to the Netlify apex
 *    with a long s-maxage + SWR (HOSTING.md), which only holds because the HTML
 *    is byte-identical for every reader. Rendering signed-in state into the page
 *    would break that, or leak one reader's page into a shared cache.
 * 3. Validation (below) needs a server-to-server call. It could not be done from
 *    the browser without exposing the whole flow cross-origin.
 *
 * The cookie is scoped to `.agilitycms.com`, so the apex and /docs both see it.
 *
 * NOTE: no `export const dynamic = "force-dynamic"` — this app runs Next 16
 * Cache Components, which rejects it. Awaiting cookies() is already dynamic.
 */

/** Owned by Classic CM's OWIN config, not this repo — hence overridable. */
const AUTH_COOKIE = process.env.AGILITY_AUTH_COOKIE_NAME || "AgilityAuthOWIN"

/**
 * Classic Content Manager base URL, e.g. `https://manager.agilitycms.com`.
 *
 * UNSET  = presence only. We report that a cookie exists, so a stale one reads
 *          as signed-in and `validated` is false.
 * SET    = the cookie is checked against Classic on the first page view of a
 *          session (~200ms server-side, off the visitor's critical path).
 */
const MANAGER_URL = process.env.AGILITY_MANAGER_URL

/** Never let a slow or unreachable Classic hold this route open. */
const VALIDATE_TIMEOUT_MS = 2000

interface ValidationResult {
	valid: boolean | null // null = couldn't tell
	userId?: string
	firstName?: string
}

/**
 * Validate the session against Classic's `json/User/GetCurrentServerUser` — the
 * same call app.agilitycms.com makes. Observed behaviour (2026-09-17):
 *
 *   valid cookie  -> 200 + {"IsError":false,"ResponseData":{"UserID":1704,...}}
 *   bogus cookie  -> 302 (redirect to login), empty body
 *
 * So the discriminator is the redirect, which is why `redirect: "manual"` is
 * essential: fetch follows redirects by default, and a followed 302 lands on the
 * login page as a 200 — an invalid session would read as valid.
 *
 * Returns valid=null for a timeout or unexpected failure: a network blip must
 * not be reported as "logged out", which would silently undercount.
 */
async function validateSession(cookieValue: string): Promise<ValidationResult> {
	if (!MANAGER_URL) return { valid: null }

	const controller = new AbortController()
	const timer = setTimeout(() => controller.abort(), VALIDATE_TIMEOUT_MS)

	try {
		const res = await fetch(`${MANAGER_URL.replace(/\/$/, "")}/json/User/GetCurrentServerUser`, {
			method: "POST",
			headers: {
				// Forward ONLY the auth cookie — never the visitor's whole jar.
				Cookie: `${AUTH_COOKIE}=${cookieValue}`,
				"Content-Type": "application/x-www-form-urlencoded",
				"Content-Length": "0",
			},
			// Do not follow the login redirect — see above. This is load-bearing.
			redirect: "manual",
			cache: "no-store",
			signal: controller.signal,
		})

		// 302 -> not signed in. 401/403 defensively treated the same.
		if (res.status === 302 || res.status === 401 || res.status === 403) return { valid: false }
		if (!res.ok) return { valid: null } // 5xx / unexpected — couldn't tell

		const body = (await res.json().catch(() => null)) as {
			IsError?: boolean
			ResponseData?: { UserID?: number; FirstName?: string }
		} | null

		// Classic can answer 200 with a logical error, so the envelope matters.
		if (!body || body.IsError === true) return { valid: false }

		// Only the id and first name. The same ~47KB payload also carries the
		// email address, last name and internal-user flags — none of that is
		// needed to greet someone in the header, so none of it is read. The id
		// goes to analytics; the first name only ever reaches the header of the
		// person it belongs to (this response is private, no-store).
		const data = body.ResponseData
		return {
			valid: true,
			userId: data?.UserID ? String(data.UserID) : undefined,
			firstName: data?.FirstName?.trim() || undefined,
		}
	} catch {
		return { valid: null } // aborted or network failure
	} finally {
		clearTimeout(timer)
	}
}

export async function GET() {
	const cookieStore = await cookies()
	const value = cookieStore.get(AUTH_COOKIE)?.value

	let signedIn = false
	let validated = false
	let userId: string | undefined
	let firstName: string | undefined

	if (value) {
		const result = await validateSession(value)
		// null = couldn't tell -> fall back to presence rather than undercount.
		signedIn = result.valid ?? true
		validated = result.valid !== null
		userId = result.userId
		firstName = result.firstName
	}

	return Response.json(
		// `validated` keeps a checked session distinguishable from a bare cookie,
		// so the two are never conflated in a funnel.
		{ signedIn, validated, ...(userId ? { userId } : {}), ...(firstName ? { firstName } : {}) },
		{
			headers: {
				// Per-visitor — no shared cache may store it.
				"Cache-Control": "private, no-store",
				"Netlify-CDN-Cache-Control": "no-store",
			},
		}
	)
}
