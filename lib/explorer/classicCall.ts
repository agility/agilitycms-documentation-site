import "server-only";

/**
 * Minimal server-side port of the Manager app's `authenticatedCall`
 * (agility-cms-manager-app-react/src/lib/authenticated-call.ts).
 *
 * Same contract as the React app uses against Classic CM's `/json/*`
 * endpoints: POST, the caller's auth cookie, the `X-Requested-With` header
 * Classic expects from XHR, and the `{ IsError, ErrorMessage, ResponseData }`
 * envelope unwrapped to `ResponseData`.
 *
 * TWO DELIBERATE DIFFERENCES FROM THE REACT APP
 *
 * 1. **It runs on our server, not in the browser.** The Manager app is served
 *    from the same site as Classic, so `withCredentials: true` is enough. The
 *    docs site is a different origin, so the browser would neither send the
 *    cookie nor pass CORS. Forwarding it server-side also means the auth
 *    cookie is never exposed to page JavaScript here — which matters on an
 *    origin that renders author-supplied `<script>`.
 *
 * 2. **`redirect: "manual"` is mandatory.** An invalid session gets a 302 to
 *    the login page; fetch follows redirects by default and would hand back a
 *    200, reading a dead session as a live one. Same reasoning as /api/me.
 */

/** Owned by Classic CM's OWIN config, not this repo — hence overridable. */
export const AUTH_COOKIE = process.env.AGILITY_AUTH_COOKIE_NAME || "AgilityAuthOWIN";

/**
 * Classic CM base URL.
 *
 * Unlike /api/me — where an unset value deliberately degrades to a
 * presence-only check — the explorer DEFAULTS to production, because every
 * instance-aware thing it does (list instances, resolve a key) is impossible
 * without Classic, and silently offering no instances would read as "you have
 * none" rather than "this isn't configured". Per-instance calls prefer the
 * instance's own `ManagerUrl` anyway, which is how regions are honoured; this
 * is only the bootstrap and the fallback, matching the Manager app's
 * `instance?.ManagerUrl || VITE_APP_BASE_MANAGER_URL`.
 */
export const DEFAULT_MANAGER_URL =
	process.env.AGILITY_MANAGER_URL || "https://manager.agilitycms.com";

/** Never let a slow or unreachable Classic hold a request open. */
const TIMEOUT_MS = 5000;

export class ClassicAuthError extends Error {}

interface Params {
	managerUrl?: string | null;
	/** Classic `/json/...` path. */
	path: string;
	body: Record<string, unknown>;
	cookieValue: string;
}

/**
 * POST to a Classic `/json/*` endpoint as the signed-in visitor.
 *
 * Returns the unwrapped `ResponseData`, or throws `ClassicAuthError` when the
 * session is not valid (so callers can answer 403 rather than 500).
 */
export const classicCall = async <T>({
	managerUrl,
	path,
	body,
	cookieValue,
}: Params): Promise<T | null> => {
	const base = (managerUrl || DEFAULT_MANAGER_URL).replace(/\/$/, "");

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		const res = await fetch(`${base}${path}`, {
			method: "POST",
			headers: {
				// Forward ONLY the auth cookie — never the visitor's whole jar.
				Cookie: `${AUTH_COOKIE}=${cookieValue}`,
				"Content-Type": "application/json",
				// Classic gates its /json/* endpoints on this being an XHR.
				"X-Requested-With": "XMLHttpRequest",
			},
			body: JSON.stringify(body),
			// Load-bearing — see the note above.
			redirect: "manual",
			cache: "no-store",
			signal: controller.signal,
		});

		if (res.status === 302 || res.status === 401 || res.status === 403) {
			throw new ClassicAuthError("Not signed in to Agility.");
		}
		if (!res.ok) return null;

		const envelope = (await res.json().catch(() => null)) as {
			IsError?: boolean;
			ErrorMessage?: string;
			ResponseData?: T;
		} | null;

		// Classic can answer 200 with a logical error, so the envelope matters.
		if (!envelope || envelope.IsError === true) return null;
		return (envelope.ResponseData !== undefined ? envelope.ResponseData : (envelope as T)) ?? null;
	} finally {
		clearTimeout(timer);
	}
};
